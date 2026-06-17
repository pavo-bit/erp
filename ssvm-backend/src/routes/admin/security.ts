import { Router, Request, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';
import prisma from '../../lib/prisma';
import logger from '../../lib/logger';
import { Role } from '@prisma/client';
import { generateAccessToken, generateImpersonationToken } from '../../lib/tokens';
import { getEnv } from '../../config/env';
import crypto from 'crypto';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { notificationQueue } from '../../jobs/queue';
const { authenticator } = require('otplib');

const impersonateSchema = z.object({
  totpCode: z.string().length(6, "Invalid 2FA code length"),
  reason: z.string().min(10, "Reason must be at least 10 characters long")
});

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/saas/security/audit-logs
 * Fetch system-wide security logs for the SOC dashboard
 */
router.get('/audit-logs', requireRole(Role.SUPER_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        school: { select: { id: true, name: true } }
      }
    });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch audit logs');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/saas/security/system-logs
 * Fetch system-level errors, queue failures, etc.
 */
router.get('/system-logs', requireRole(Role.SUPER_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.systemLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        school: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } }
      }
    });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch system logs');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/saas/security/failed-logins
 * Fetch recently failed login attempts
 */
router.get('/failed-logins', requireRole(Role.SUPER_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: 'FAILED_LOGIN',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: logs });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch failed logins');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/saas/security/quarantine/:documentId
 * Manually quarantine a suspicious document
 */
router.post('/quarantine/:documentId', requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    // Using storageObject since that's what scanWorker uses
    const doc = await prisma.storageObject.update({
      where: { id: documentId as string },
      data: {
        scanStatus: 'QUARANTINED'
      }
    });

    await prisma.systemLog.create({
      data: {
        level: 'WARN',
        module: 'SECURITY',
        message: 'DOCUMENT_QUARANTINED',
        metadata: JSON.stringify({ documentId: documentId as string }),
        userId: req.user!.id
      }
    });

    res.json({ success: true, data: doc });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to quarantine document');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/saas/impersonate/:schoolId
 * Impersonate a tenant (school) as a SUPER_ADMIN.
 * This generates a new session token that is scoped to the target school.
 */
router.post('/impersonate/:schoolId', requireRole(Role.SUPER_ADMIN), validate(impersonateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { schoolId } = req.params;
    const { totpCode, reason } = req.body;
    
    // 1. Verify SUPER_ADMIN 2FA is enabled and code is valid
    const adminUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!adminUser || !adminUser.twoFactorEnabled || !adminUser.twoFactorSecret) {
      res.status(403).json({ success: false, error: 'You must enable 2FA before you can impersonate tenants.' });
      return;
    }
    
    const isValid = authenticator.verify({ token: totpCode, secret: adminUser.twoFactorSecret });
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid 2FA code.' });
      return;
    }

    // 2. Verify school exists
    const school = await prisma.school.findUnique({ where: { id: schoolId as string } });
    if (!school) {
      res.status(404).json({ success: false, error: 'School not found' });
      return;
    }

    // 3. Audit log the impersonation event
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'IMPERSONATION_STARTED',
        entity: 'SCHOOL',
        entityId: schoolId as string,
        ipAddress: (req.ip as string) || "Unknown",
        device: req.headers['user-agent'],
        reason: reason,
        details: JSON.stringify({ reason: reason })
      }
    });

    // 4. Generate a new short-lived impersonation token
    const { token: impersonationToken } = generateImpersonationToken({
      originalUserId: req.user!.id,
      userId: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: Role.SUPER_ADMIN,
      schoolId: school.id,
      sid: crypto.randomUUID()
    });
    
    // 5. Notify the target school's ERP_ADMIN
    if (notificationQueue) {
      const erpAdmin = await prisma.user.findFirst({
        where: { schoolId: school.id, role: Role.ERP_ADMIN }
      });
      
      if (erpAdmin) {
        await notificationQueue.add('email', {
          to: erpAdmin.email,
          subject: 'Security Alert: Impersonation Session Started',
          html: `<p>SUPER_ADMIN ${req.user!.name} has started an impersonation session on your school account.</p><p>Reason: ${reason}</p><p>If you did not expect this, contact platform support immediately.</p>`
        });
      }
    }

    res.json({
      success: true,
      message: `Impersonating school: ${school.name}`,
      token: impersonationToken
    });

  } catch (error: any) {
    logger.error({ err: error }, 'Failed to impersonate tenant');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/saas/impersonate/:schoolId/end
 * Ends the impersonation session.
 */
router.post('/impersonate/:schoolId/end', requireRole(Role.SUPER_ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { schoolId } = req.params;
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.originalUserId || req.user!.id,
        action: 'IMPERSONATION_ENDED',
        entity: 'SCHOOL',
        entityId: schoolId as string,
        ipAddress: (req.ip as string) || "Unknown",
        device: req.headers['user-agent']
      }
    });
    
    // Add to Redis blocklist
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.access_token;
    if (token) {
      const { verifyAccessToken, hashToken } = await import('../../lib/tokens');
      const payload = verifyAccessToken(token);
      const { blocklistAccessToken } = await import('../../lib/redis');
      if (payload && payload.jti) {
        await blocklistAccessToken(payload.jti, 30 * 60); // 30 mins
      } else {
        await blocklistAccessToken(hashToken(token), 30 * 60);
      }
    }
    
    const cookieOptions = (await import('../../lib/tokens')).getAccessTokenCookieOptions();
    res.clearCookie("access_token", cookieOptions);
    
    res.json({ success: true, message: 'Impersonation ended successfully' });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to end impersonation');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
