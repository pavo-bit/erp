import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { BackupService } from "../../services/backup.service";

const router = Router();

// Only SUPER_ADMIN can manage backups
router.use(authenticate);
router.use(requireRole("SUPER_ADMIN"));

// 1. Trigger a manual backup
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const backupId = await BackupService.createDatabaseBackup(false);
    res.status(202).json({
      success: true,
      message: "Backup initiated",
      data: { id: backupId }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. List all backups
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const backups = await prisma.systemBackup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    // Explicitly convert BigInt to string to avoid JSON serialization errors
    const sanitizedBackups = backups.map(b => ({
      ...b,
      sizeBytes: b.sizeBytes ? b.sizeBytes.toString() : null
    }));

    res.json({ success: true, data: sanitizedBackups });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
