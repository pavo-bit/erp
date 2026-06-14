import { Router, Response } from "express";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { exportQueue } from "../../jobs/queue";
import logger from "../../lib/logger";

const router = Router();

router.use(authenticate);

/**
 * POST /api/v1/saas/export
 * Trigger a background export job for a specific entity.
 * Only accessible to ERP_ADMIN and SUPER_ADMIN.
 */
router.post("/", requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entity, format = "CSV", filters = {} } = req.body;
    const schoolId = req.user!.schoolId;
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    if (!entity) {
      res.status(400).json({ success: false, error: "Missing required field: entity" });
      return;
    }

    if (!schoolId && req.user!.role !== Role.SUPER_ADMIN) {
      res.status(403).json({ success: false, error: "School context is required for export" });
      return;
    }

    if (!exportQueue) {
      res.status(503).json({ success: false, error: "Export service is currently unavailable" });
      return;
    }

    // Enqueue export job
    const job = await exportQueue.add(
      "generateExport",
      {
        schoolId,
        userId,
        entity,
        format,
        filters,
        userEmail
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    res.status(202).json({
      success: true,
      message: "Export job queued successfully. You will be notified when it is ready.",
      data: { jobId: job.id }
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to enqueue export job");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
