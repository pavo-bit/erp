import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAdmin, requireTeacherOrAdmin, requireSchoolAccess } from "../middleware/auth";

const router = Router();

// GET /api/timetable — Get timetables (by section/day)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sectionId, day } = req.query;
    
    let schoolId = req.user!.schoolId;
    if (req.user!.role === "SUPER_ADMIN") {
      schoolId = req.query.schoolId as string;
    }

    const where: Record<string, unknown> = { schoolId };
    if (sectionId) where.sectionId = sectionId;
    if (day) where.day = day as string;

    const timetables = await prisma.timetable.findMany({
      where,
      include: {
        slots: {
          orderBy: { period: "asc" },
          include: { 
            teacherSubjectAssignment: { 
              include: { 
                subject: true,
                teacher: { include: { user: { select: { name: true } } } } 
              } 
            } 
          },
        },
      },
      orderBy: { sectionId: "asc" },
    });
    res.json({ success: true, data: timetables });
  } catch (e) {
    logger.error({ err: e }, "List timetable error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/timetable/teacher/:teacherId — Teacher's personal timetable
router.get("/teacher/:teacherId", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const slots = await prisma.timetableSlot.findMany({
      where: { teacherSubjectAssignment: { teacherId: req.params.teacherId as string } },
      include: {
        timetable: { select: {  sectionId: true, day: true, sectionRef: { select: { name: true } } } },
        teacherSubjectAssignment: { include: { subject: true } }
      },
      orderBy: { period: "asc" },
    });
    res.json({ success: true, data: slots });
  } catch (e) {
    logger.error({ err: e }, "Teacher timetable error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/timetable — Create/update timetable
router.post("/", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { sectionId, day, slots } = req.body;

    if (!sectionId || !day || !slots?.length) {
      res.status(400).json({ success: false, error: "Section, day, and slots are required" }); return;
    }

    // Upsert: delete existing timetable for this section/day, then create new
    let existing;
    if (sectionId) {
      existing = await prisma.timetable.findFirst({
        where: { schoolId: schoolId!, sectionId, day },
      });
    }

    if (existing) {
      await prisma.timetableSlot.deleteMany({ where: { timetableId: existing.id } });
      await prisma.timetable.delete({ where: { id: existing.id } });
    }

    const timetable = await prisma.timetable.create({
      data: {
        schoolId: schoolId!,
        sectionId: sectionId || null,
        day,
        slots: {
          create: slots.map((s: { period: number; teacherSubjectAssignmentId: string; startTime: string; endTime: string }) => ({
            period: s.period,
            teacherSubjectAssignmentId: s.teacherSubjectAssignmentId,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
      },
      include: { slots: { orderBy: { period: "asc" } } },
    });

    res.status(201).json({ success: true, data: timetable });
  } catch (e) {
    logger.error({ err: e }, "Create timetable error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/timetable/:id
router.delete("/:id", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.timetable.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, data: { message: "Timetable deleted" } });
  } catch (e) {
    logger.error({ err: e }, "Delete timetable error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
