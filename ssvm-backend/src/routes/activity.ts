import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireSchoolAccess } from "../middleware/auth";

const router = Router();

// GET /api/activity
router.get("/", authenticate, requireSchoolAccess(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!schoolId) {
      res.status(400).json({ success: false, error: "School ID required" });
      return;
    }

    const activities = await prisma.activityLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json({ success: true, data: activities });
  } catch (e) {
    logger.error({ err: e }, "Fetch activity error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
