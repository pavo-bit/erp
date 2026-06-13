import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";

const router = Router();

// Only SUPER_ADMIN can view global audit logs
router.use(authenticate);
router.use(requireRole("SUPER_ADMIN"));

// 1. Get Audit Logs with filtering
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, severity, page = 1, limit = 50 } = req.query;
    
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const whereClause: any = {};
    if (action) whereClause.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.auditLog.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Get Security Alerts specifically
router.get("/security-alerts", async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await prisma.systemLog.findMany({
      where: {
        level: { in: ["WARN", "ERROR", "FATAL"] }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
