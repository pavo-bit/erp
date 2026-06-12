import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { authenticate, requireRole } from "../middleware/auth";
import { sendSuccess, sendError } from "../lib/response";
import { performDatabaseBackup } from "../jobs/backup";
import { storageService } from "../services/storage.service";

const router = Router();

// ═══════════════════════════════════════════
// BACKUP DASHBOARD API
// ═══════════════════════════════════════════

// All routes require SUPER_ADMIN
router.use(authenticate);
router.use(requireRole("SUPER_ADMIN"));

/**
 * GET /api/v1/backups/status
 * List backup history and status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const backups = await prisma.systemBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return sendSuccess(res, backups);
  } catch (err) {
    logger.error({ err }, "Failed to fetch backup status");
    return sendError(res, 500, "Failed to fetch backups");
  }
});

/**
 * POST /api/v1/backups/trigger
 * Manually trigger a database backup
 */
router.post("/trigger", async (req: Request, res: Response) => {
  try {
    // Run backup in background asynchronously
    performDatabaseBackup().catch(err => {
      logger.error({ err }, "Background backup failed");
    });
    return sendSuccess(res, { message: "Backup started in the background" });
  } catch (err) {
    logger.error({ err }, "Failed to trigger backup");
    return sendError(res, 500, "Failed to trigger backup");
  }
});

/**
 * GET /api/v1/backups/:id/download
 * Get a presigned URL to download a specific backup file
 */
router.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const backup = await prisma.systemBackup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup || !backup.fileUrl) {
      return sendError(res, 404, "Backup file not found");
    }

    const url = await storageService.generateSignedUrl(backup.fileUrl, 3600);
    return sendSuccess(res, { url });
  } catch (err) {
    logger.error({ err }, "Failed to generate download URL");
    return sendError(res, 500, "Failed to generate download URL");
  }
});

export default router;
