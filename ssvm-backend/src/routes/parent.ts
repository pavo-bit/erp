import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

interface GuardianStudent { id: string; }
interface GuardianRecord { students?: GuardianStudent[]; }

router.get("/children/:studentId/summary", authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as { user?: { id: string; role: string; schoolId?: string | null } }).user;
    if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

    const studentId = req.params.studentId;
    const sid = studentId as string;
    const schoolId = user.schoolId;

    // Verify guardian ownership
    if (user.role === "PARENT") {
      const guardian = await prisma.guardian.findUnique({
        where: { userId: user.id },
        include: { students: { select: { id: true } } },
      }) as GuardianRecord | null;
      const allowed = guardian?.students?.some((s: GuardianStudent) => s.id === sid) ?? false;
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
    }) as { status: string }[];
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

    // Pending fees
    const invoices = await prisma.invoice.findMany({
      where: { studentId: sid, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      select: { remainingAmount: true, amount: true },
    }) as { remainingAmount: unknown; amount: unknown }[];
    const pendingFees = invoices.reduce((sum: number, inv) => sum + Number(inv.remainingAmount ?? inv.amount ?? 0), 0);

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
    }) as { date: Date; status: string }[];

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;