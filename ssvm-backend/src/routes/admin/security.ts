import { Router, Request, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';
import prisma from '../../lib/prisma';
import logger from '../../lib/logger';
import { Role } from '@prisma/client';
import { generateAccessToken } from '../../lib/tokens';
import { getEnv } from '../../config/env';
import crypto from 'crypto';

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
router.post('/impersonate/:schoolId', requireRole(Role.SUPER_ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { schoolId } = req.params;
    
    // 1. Verify school exists
    const school = await prisma.school.findUnique({ where: { id: schoolId as string } });
    if (!school) {
      res.status(404).json({ success: false, error: 'School not found' });
      return;
    }

    // 2. Audit log the impersonation event
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'IMPERSONATE_TENANT',
        entity: 'SCHOOL',
        entityId: schoolId as string,
        ipAddress: (req.ip as string) || "Unknown",
        device: req.headers['user-agent'],
        details: JSON.stringify({ reason: req.body.reason || 'Support Request' })
      }
    });

    // 3. Generate a new token scoped to the target school
    // We keep the SUPER_ADMIN role but switch the schoolId
    const env = getEnv();
    const { token: impersonationToken } = generateAccessToken({
      userId: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: Role.SUPER_ADMIN,
      schoolId: school.id,
      sid: crypto.randomUUID()
    });

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

export default router;
