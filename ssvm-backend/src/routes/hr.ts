import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAdmin, requireTeacherOrAdmin } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════
// SALARY MANAGEMENT
// ═══════════════════════════════

// GET /api/hr/salaries — List salaries
router.get("/salaries", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    const { month, year } = req.query;

    const where: Record<string, unknown> = { schoolId };
    if (month) where.month = parseInt(month as string);
    if (year) where.year = parseInt(year as string);

    const salaries = await prisma.salary.findMany({
      where,
      include: { teacher: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json({ success: true, data: salaries });
  } catch (e) {
    logger.error({ err: e }, "List salaries error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/hr/salaries — Create salary entry
router.post("/salaries", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { teacherId, month, year, basicPay, allowances, deductions } = req.body;

    if (!teacherId || !month || !year || !basicPay) {
      res.status(400).json({ success: false, error: "Required: teacherId, month, year, basicPay" }); return;
    }

    const netPay = (basicPay || 0) + (allowances || 0) - (deductions || 0);

    const salary = await prisma.salary.upsert({
      where: { teacherId_month_year: { teacherId, month: parseInt(month), year: parseInt(year) } },
      update: { basicPay, allowances: allowances || 0, deductions: deductions || 0, netPay },
      create: { teacherId, schoolId: schoolId!, month: parseInt(month), year: parseInt(year), basicPay, allowances: allowances || 0, deductions: deductions || 0, netPay },
    });
    res.status(201).json({ success: true, data: salary });
  } catch (e) {
    logger.error({ err: e }, "Create salary error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/hr/salaries/:id/pay — Mark salary as paid
router.put("/salaries/:id/pay", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const salary = await prisma.salary.update({
      where: { id: req.params.id as string as string },
      data: { status: "PAID", paidDate: new Date() },
    });
    res.json({ success: true, data: salary });
  } catch (e) {
    logger.error({ err: e }, "Pay salary error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/hr/payslips/:teacherId — Teacher: view own payslips
router.get("/payslips/:teacherId", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    // Teachers can only see their own payslips
    if (req.user!.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher || teacher.id !== req.params.teacherId) {
        res.status(403).json({ success: false, error: "Can only view your own payslips" }); return;
      }
    }

    const salaries = await prisma.salary.findMany({
      where: { teacherId: req.params.teacherId as string },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json({ success: true, data: salaries });
  } catch (e) {
    logger.error({ err: e }, "Payslips error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════
// LEAVE MANAGEMENT
// ═══════════════════════════════

// GET /api/hr/leaves — Leave requests list
router.get("/leaves", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    let where: Record<string, unknown> = {};

    if (req.user!.role === "TEACHER") {
      // Teachers see only their own
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) { res.status(404).json({ success: false, error: "Teacher profile not found" }); return; }
      where = { requesterId: teacher.id };
    } else {
      // Admin sees school's leaves
      const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
      if (schoolId) {
        where = { requester: { schoolId } };
      }
    }

    const { status } = req.query;
    

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { requester: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: leaves });
  } catch (e) {
    logger.error({ err: e }, "List leaves error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/hr/leaves — Teacher: apply leave
router.post("/leaves", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    let requesterId: string;
    if (req.user!.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) { res.status(404).json({ success: false, error: "Teacher profile not found" }); return; }
      requesterId = teacher.id;
    } else {
      requesterId = req.body.requesterId;
    }

    if (!requesterId || !leaveType || !startDate || !endDate || !reason) {
      res.status(400).json({ success: false, error: "All fields required" }); return;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        requesterId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      },
    });
    res.status(201).json({ success: true, data: leave });
  } catch (e) {
    logger.error({ err: e }, "Apply leave error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/hr/leaves/:id — Admin: approve/reject
router.put("/leaves/:id", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { status, approverRemarks } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ success: false, error: "Status must be APPROVED or REJECTED" }); return;
    }

    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id as string },
      data: { status, approvedById: req.user!.id, approverRemarks },
    });
    res.json({ success: true, data: leave });
  } catch (e) {
    logger.error({ err: e }, "Update leave error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
