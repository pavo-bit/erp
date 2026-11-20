import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/children/:studentId/summary", authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

    const studentId = req.params.studentId;
    const sid = studentId as string;
    const schoolId = user.schoolId;

    // Verify guardian ownership
    if (user.role === "PARENT") {
      const guardian = await prisma.guardian.findUnique({
        where: { userId: user.id },
        include: { students: { select: { id: true } } },
      });
      const allowed = guardian?.students?.some((s: any) => s.id === studentId);
      if (!allowed) {
        return res.status(403).json({ success: false, error: "Access denied to this child" });
      }
    } else if (user.role !== "SUPER_ADMIN" && user.role !== "ERP_ADMIN") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const student = await prisma.student.findFirst({
      where: { id: sid, schoolId: schoolId ?? undefined },
      select: { id: true, name: true, admissionNo: true },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Attendance rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId: sid, date: { gte: thirtyDaysAgo } },
      select: { status: true },
    });
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((a: any) => a.status === "PRESENT" || a.status === "LATE").length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

    // Pending fees
    const invoices = await prisma.invoice.findMany({
      where: { studentId: sid, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      select: { remainingAmount: true, amount: true },
    });
    const pendingFees = invoices.reduce((sum: number, inv: any) => sum + Number(inv.remainingAmount ?? inv.amount ?? 0), 0);

    // Pending assignments count
    const pendingAssignmentsCount = await prisma.assignmentSubmission.count({
      where: { studentId: sid, status: { in: ["PENDING", "SUBMITTED"] } },
    }).catch(() => 0);

    // Latest result
    const latestMark = await prisma.studentMark.findFirst({
      where: { studentId: sid },
      orderBy: { createdAt: "desc" },
    });
    const latestResult = latestMark
      ? { score: latestMark.marksObtained, examTitle: null }
      : null;

    const recentAttendances = await prisma.attendance.findMany({
      where: { studentId: sid },
      orderBy: { date: "desc" },
      take: 5,
      select: { date: true, status: true },
    });

    const upcomingDues = await prisma.invoice.findMany({
      where: { studentId: sid, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: { id: true, amount: true, remainingAmount: true, dueDate: true, status: true },
    });

    res.json({
      success: true,
      data: {
        student,
        attendanceRate,
        pendingFees,
        pendingAssignmentsCount,
        latestResult,
        recentAttendances,
        upcomingDues,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || "Server error" });
  }
});

export default router;