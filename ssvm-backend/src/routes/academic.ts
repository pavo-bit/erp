import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAcademicAdmin, requireTeacherOrAdmin, requireSchoolAccess } from "../middleware/auth";

const router = Router();

// ─── ACADEMIC SESSIONS ───

// GET /api/academic/sessions
router.get("/sessions", authenticate, requireTeacherOrAdmin(), requireSchoolAccess(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "School ID required" }); return; }

    const sessions = await prisma.academicSession.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
      include: { _count: { select: { classes: true } } },
    });
    res.json({ success: true, data: sessions });
  } catch (e) {
    logger.error({ err: e }, "List sessions error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/academic/sessions
router.post("/sessions", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { name, startDate, endDate, isCurrent } = req.body;

    if (!name || !startDate || !endDate) {
      res.status(400).json({ success: false, error: "name, startDate, endDate are required" }); return;
    }

    // If marking as current, unset others
    if (isCurrent) {
      await prisma.academicSession.updateMany({ where: { schoolId: schoolId! }, data: { isCurrent: false } });
    }

    const session = await prisma.academicSession.create({
      data: { schoolId: schoolId!, name, startDate: new Date(startDate), endDate: new Date(endDate), isCurrent: isCurrent || false },
    });
    res.status(201).json({ success: true, data: session });
  } catch (e) {
    logger.error({ err: e }, "Create session error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── CLASSES ───

// GET /api/academic/classes
router.get("/classes", authenticate, requireTeacherOrAdmin(), requireSchoolAccess(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    const { sessionId } = req.query;

    const where: Record<string, unknown> = { schoolId };
    if (sessionId) where.sessionId = sessionId;

    const classes = await prisma.class.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        session: { select: { name: true } },
        sections: { include: { _count: { select: { students: true } } } },
        _count: { select: { exams: true, assignments: true } },
      },
    });
    res.json({ success: true, data: classes });
  } catch (e) {
    logger.error({ err: e }, "List classes error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/academic/classes
router.post("/classes", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { sessionId, name, sortOrder } = req.body;

    if (!sessionId || !name) {
      res.status(400).json({ success: false, error: "sessionId and name are required" }); return;
    }

    const cls = await prisma.class.create({
      data: { schoolId: schoolId!, sessionId, name, sortOrder: sortOrder || 0 },
    });
    res.status(201).json({ success: true, data: cls });
  } catch (e) {
    logger.error({ err: e }, "Create class error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/academic/classes/bulk — create multiple classes at once
router.post("/classes/bulk", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { sessionId, classes } = req.body; // classes: [{name, sortOrder}]

    if (!sessionId || !Array.isArray(classes)) {
      res.status(400).json({ success: false, error: "sessionId and classes array are required" }); return;
    }

    const created = await prisma.class.createMany({
      data: classes.map((c: { name: string; sortOrder?: number }, i: number) => ({
        schoolId: schoolId!, sessionId, name: c.name, sortOrder: c.sortOrder ?? i,
      })),
      skipDuplicates: true,
    });
    res.status(201).json({ success: true, data: { count: created.count } });
  } catch (e) {
    logger.error({ err: e }, "Bulk create classes error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── SECTIONS ───

// GET /api/academic/sections
router.get("/sections", authenticate, requireTeacherOrAdmin(), requireSchoolAccess(), async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.query;
    if (!classId) { res.status(400).json({ success: false, error: "classId query is required" }); return; }

    const sections = await prisma.section.findMany({
      where: { classId: classId as string },
      include: {
        _count: { select: { students: true } },
        classTeachers: { include: { teacher: { include: { user: { select: { name: true, email: true } } } } } },
      },
    });
    res.json({ success: true, data: sections });
  } catch (e) {
    logger.error({ err: e }, "List sections error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/academic/sections
router.post("/sections", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { classId, name, capacity } = req.body;
    if (!classId || !name) {
      res.status(400).json({ success: false, error: "classId and name are required" }); return;
    }

    const section = await prisma.section.create({
      data: { classId, name, capacity: capacity || null },
    });
    res.status(201).json({ success: true, data: section });
  } catch (e) {
    logger.error({ err: e }, "Create section error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/academic/sections/bulk
router.post("/sections/bulk", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { classId, sections } = req.body; // sections: [{name, capacity?}]
    if (!classId || !Array.isArray(sections)) {
      res.status(400).json({ success: false, error: "classId and sections array are required" }); return;
    }

    const created = await prisma.section.createMany({
      data: sections.map((s: { name: string; capacity?: number }) => ({
        classId, name: s.name, capacity: s.capacity || null,
      })),
      skipDuplicates: true,
    });
    res.status(201).json({ success: true, data: { count: created.count } });
  } catch (e) {
    logger.error({ err: e }, "Bulk create sections error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── CLASS TEACHERS ───

// POST /api/academic/class-teachers
router.post("/class-teachers", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { sectionId, teacherId, isPrimary } = req.body;
    if (!sectionId || !teacherId) {
      res.status(400).json({ success: false, error: "sectionId and teacherId are required" }); return;
    }

    const ct = await prisma.classTeacher.create({
      data: { sectionId, teacherId, isPrimary: isPrimary || false },
      include: { teacher: { include: { user: { select: { name: true } } } }, section: true },
    });
    res.status(201).json({ success: true, data: ct });
  } catch (e) {
    logger.error({ err: e }, "Assign class teacher error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/academic/class-teachers/:sectionId
router.get("/class-teachers/:sectionId", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const teachers = await prisma.classTeacher.findMany({
      where: { sectionId: req.params.sectionId as string },
      include: { teacher: { include: { user: { select: { name: true, email: true, avatar: true } } } } },
    });
    res.json({ success: true, data: teachers });
  } catch (e) {
    logger.error({ err: e }, "Get class teachers error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/academic/class-teachers/:id
router.delete("/class-teachers/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.classTeacher.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, data: { message: "Class teacher removed" } });
  } catch (e) {
    logger.error({ err: e }, "Remove class teacher error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
