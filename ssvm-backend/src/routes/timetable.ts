import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAcademicAdmin, requireTeacherOrAdmin } from "../middleware/auth";
import { saveTimetableWithCollisionGuard } from "../services/timetable.service";

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

// POST /api/timetable — Create/update timetable with collision detection
router.post("/", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { sectionId, day, slots } = req.body;

    if (!schoolId) {
      res.status(400).json({ success: false, error: "School ID required" });
      return;
    }

    if (!sectionId || !day || !slots?.length) {
      res.status(400).json({ success: false, error: "Section, day, and slots are required" });
      return;
    }

    const timetable = await saveTimetableWithCollisionGuard(
      schoolId,
      sectionId,
      day,
      slots
    );

    res.status(201).json({ success: true, data: timetable });
  } catch (e: unknown) {
    const errorObj = e as { status?: number; code?: string; message?: string; details?: unknown };
    if (errorObj.status === 409 || errorObj.code === "TEACHER_COLLISION" || errorObj.code === "SECTION_COLLISION" || errorObj.code === "INVALID_TIME" || errorObj.code === "CROSS_TENANT_VIOLATION") {
      res.status(errorObj.status || 409).json({
        success: false,
        error: errorObj.message,
        code: errorObj.code,
        details: errorObj.details
      });
      return;
    }
    logger.error({ err: e }, "Create timetable error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/timetable/:id
router.delete("/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.timetable.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, data: { message: "Timetable deleted" } });
  } catch (e) {
    logger.error({ err: e }, "Delete timetable error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
