import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import logger from '../lib/logger';
import { Role } from '@prisma/client';

const router = Router();

// Validation Schemas
const deviceSchema = z.object({
  deviceToken: z.string().min(10),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
  appVersion: z.string().optional(),
  deviceModel: z.string().optional(),
});

// =====================================
// MOBILE CONFIGURATION (Public Endpoint)
// =====================================

/**
 * GET /api/v1/mobile/config
 * App hits this on launch to determine if they must force-update.
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string;
    
    if (!platform || !['IOS', 'ANDROID'].includes(platform.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Valid platform query parameter required (IOS or ANDROID)' });
    }

    const versionConfig = await prisma.appVersion.findUnique({
      where: { platform: platform.toUpperCase() },
    });

    if (!versionConfig) {
      // Default open fallback if not configured yet
      return res.json({
        success: true,
        data: {
          minimumVersion: '1.0.0',
          latestVersion: '1.0.0',
          forceUpdate: false
        }
      });
    }

    res.json({ success: true, data: versionConfig });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch mobile config");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// =====================================
// DEVICE TOKEN REGISTRATION (Authenticated)
// =====================================

/**
 * POST /api/v1/mobile/devices
 * Register or update an FCM/APNS token for the logged-in user.
 */
router.post('/devices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = deviceSchema.parse(req.body);
    const userId = req.user!.id;

    const device = await prisma.userDevice.upsert({
      where: { deviceToken: data.deviceToken },
      update: {
        userId, // Ensures token is reassigned if a different user logs in on the same device
        platform: data.platform,
        appVersion: data.appVersion,
        deviceModel: data.deviceModel,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        deviceToken: data.deviceToken,
        platform: data.platform,
        appVersion: data.appVersion,
        deviceModel: data.deviceModel,
      }
    });

    res.status(200).json({ success: true, data: device });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to register device token");
    res.status(400).json({ success: false, error: error.message || "Invalid payload" });
  }
});

/**
 * DELETE /api/v1/mobile/devices/:token
 * Unregister a device token (e.g., on logout).
 */
router.delete('/devices/:token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.params.token as string;
    const userId = req.user!.id;

    // We only allow deleting if it belongs to the current user
    const deleted = await prisma.userDevice.deleteMany({
      where: {
        deviceToken: token,
        userId: userId
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ success: false, error: "Device token not found or not owned by user" });
    }

    res.json({ success: true, message: "Device unregistered successfully" });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to unregister device token");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// =====================================
// ADMIN VERSION CONTROLS (Super Admin)
// =====================================

const versionUpdateSchema = z.object({
  minimumVersion: z.string(),
  latestVersion: z.string(),
  forceUpdate: z.boolean().default(false),
  releaseNotes: z.string().optional()
});

/**
 * PUT /api/v1/mobile/config/:platform
 * Update the global app version constraints.
 */
router.put('/config/:platform', authenticate, requireRole(Role.SUPER_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform as string;
    const data = versionUpdateSchema.parse(req.body);

    const config = await prisma.appVersion.upsert({
      where: { platform: platform.toUpperCase() },
      update: data,
      create: {
        platform: platform.toUpperCase(),
        ...data
      }
    });

    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
