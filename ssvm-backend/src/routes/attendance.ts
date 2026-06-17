import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { paginateCursor } from "../lib/paginate";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, month, date, classId } = req.query as Record<string, string | undefined>;
    const where: any = { schoolId: req.user!.schoolId! };

    if (studentId) where.studentId = studentId;
    if (classId) where.sectionId = classId;

    // If STUDENT, force studentId filter to their own record
    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req.user as any).studentId;
      if (!studentIdFromToken) {
        return res.status(400).json({ success: false, error: 'Student ID not found in token' });
      }
      where.studentId = studentIdFromToken;
    }

    if (req.user!.role === "PARENT") {
      const p = await prisma.guardian.findUnique({ where: { userId: req.user!.id }, include: { students: { select: { id: true } } } });
      if (p) where.studentId = { in: p.students.map((c: any) => c.id) };
    }

    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    if (date) where.date = new Date(date);

    const { cursor, limit = "50" } = req.query;

    const result = await paginateCursor(
      prisma.attendance,
      where,
      cursor,
      parseInt(limit as string, 10),
      { student: { select: { name: true, rollNo: true } } },
      { date: "desc" }
    );

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/", authenticate, requireRole("ADMIN", "TEACHER"), async (req: AuthRequest, res: Response) => {
  try {
    const { records, sectionId, date } = req.body;
    const schoolId = req.user!.schoolId!;
    const markedById = req.user!.id;

    if (!records?.length || !sectionId || !date) {
      res.status(400).json({ success: false, error: "Records, sectionId and date required" });
      return;
    }

    const created = await prisma.$transaction(
      records.map((r: any) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date: new Date(date) } },
          create: {
            schoolId,
            sectionId,
            studentId: r.studentId,
            date: new Date(date),
            status: r.status,
            remarks: r.remarks || null,
            markedById
          },
          update: {
            status: r.status,
            remarks: r.remarks || null,
            markedById
          }
        })
      )
    );

    res.json({ success: true, data: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/attendance/teachers
router.get("/teachers", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { month, date, teacherId } = req.query as Record<string, string | undefined>;
    const where: any = { schoolId: req.user!.schoolId! };

    if (teacherId) where.teacherId = teacherId;

    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    if (date) where.date = new Date(date);

    const { cursor, limit = "50" } = req.query;

    const result = await paginateCursor(
      prisma.teacherAttendance,
      where,
      cursor,
      parseInt(limit as string, 10),
      { teacher: { select: { name: true, employeeId: true } } },
      { date: "desc" }
    );

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/attendance/teachers
router.post("/teachers", authenticate, requireRole("ADMIN", "ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { records, date } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!records?.length || !date) {
      res.status(400).json({ success: false, error: "Records and date required" });
      return;
    }

    const created = await prisma.$transaction(
      records.map((r: any) =>
        prisma.teacherAttendance.upsert({
          where: { teacherId_date: { teacherId: r.teacherId, date: new Date(date) } },
          create: {
            teacherId: r.teacherId,
            date: new Date(date),
            status: r.status,
            remarks: r.remarks || null,
          },
          update: {
            status: r.status,
            remarks: r.remarks || null,
          }
        })
      )
    );

    res.json({ success: true, data: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
