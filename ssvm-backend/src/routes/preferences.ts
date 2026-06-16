import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/preferences
 * Get all notification preferences for the current user.
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId },
    });

    res.json({ success: true, data: preferences });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch notification preferences");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/v1/preferences
 * Update a specific notification preference.
 */
router.put("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { type, enabled } = req.body;

    if (!type || typeof enabled !== "boolean") {
      res.status(400).json({ success: false, error: "Missing required fields (type, enabled)" });
      return;
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
      update: {
        enabled,
      },
      create: {
        userId,
        type,
        enabled,
      },
    });

    // Audit log the preference change
    await prisma.systemLog.create({
      data: {
        level: "INFO",
        module: "PREFERENCES",
        message: "NOTIFICATION_PREFERENCE_UPDATED",
        metadata: JSON.stringify({ type, enabled }),
        userId,
      },
    });

    res.json({ success: true, data: preference });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to update notification preference");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/v1/preferences/consent
 * Record explicit consent for a guardian.
 * Usually called from the parent app or web portal.
 */
router.post("/consent", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId;
    const { type, accepted } = req.body;

    if (!schoolId) {
      res.status(400).json({ success: false, error: "Tenant context required" });
      return;
    }

    if (!type || typeof accepted !== "boolean") {
      res.status(400).json({ success: false, error: "Missing required fields (type, accepted)" });
      return;
    }

    // Determine if user is a Guardian
    const guardian = await prisma.guardian.findUnique({
      where: { userId: req.user!.id },
    });

    if (!guardian) {
      res.status(403).json({ success: false, error: "Only guardians can provide explicit communication consent" });
      return;
    }

    const consent = await prisma.consentRecord.create({
      data: {
        guardianId: guardian.id,
        schoolId,
        type,
        accepted,
        ipAddress: (req.ip as string) || "Unknown",
      },
    });

    res.json({ success: true, data: consent });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to record consent");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/v1/preferences/consent
 * Get all consent records for the current guardian (PARENT role only).
 */
router.get("/consent", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Only guardians/parents can view consent records
    const guardian = await prisma.guardian.findUnique({
      where: { userId },
    });

    if (!guardian) {
      res.status(403).json({ success: false, error: "Only guardians can view consent records" });
      return;
    }

    const consents = await prisma.consentRecord.findMany({
      where: { guardianId: guardian.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: consents });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch consent records");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
