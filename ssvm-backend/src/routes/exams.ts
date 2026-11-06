import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAcademicAdmin, requireTeacherOrAdmin, requireSchoolAccess } from "../middleware/auth";
import { compileReportCardData } from "../services/report-card.service";

const router = Router();

// GET /api/exams — List exams
router.get("/", authenticate, requireTeacherOrAdmin(), requireSchoolAccess(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    const { classId } = req.query;

    const where: Record<string, unknown> = { schoolId };
    if (classId) where.classId = classId;

    const exams = await prisma.exam.findMany({
      where,
      
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: exams });
  } catch (e) {
    logger.error({ err: e }, "List exams error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/exams — Create exam (Admin only)
router.post("/", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { name, classId, startDate, endDate } = req.body;

    if (!name || !classId) {
      res.status(400).json({ success: false, error: "Name and class are required" }); return;
    }

    const exam = await prisma.exam.create({
      data: {
        schoolId: schoolId!,
        name, 
        classId: classId || null,
        // class: cls || "",
        // session: session || "2025-26",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    res.status(201).json({ success: true, data: exam });
  } catch (e) {
    logger.error({ err: e }, "Create exam error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/exams/:id — Update exam
router.put("/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, startDate, endDate, isPublished } = req.body;
    const exam = await prisma.exam.update({
      where: { id: req.params.id as string as string },
      data: { name, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, isPublished },
    });
    res.json({ success: true, data: exam });
  } catch (e) {
    logger.error({ err: e }, "Update exam error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/exams/:id/marks — Enter marks (Teacher)
router.post("/:id/marks", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const examId = req.params.id as string;
    const { marks } = req.body; // Array of { studentId, subject, totalMarks, obtained, grade }

    if (!marks?.length) {
      res.status(400).json({ success: false, error: "Marks data required" }); return;
    }

    const results = [];
    for (const m of marks) {
      const result = await prisma.studentMark.upsert({
        where: { studentId_examSubjectId: { studentId: m.studentId, examSubjectId: m.examSubjectId || examId } },
        update: { 
          marksObtained: m.marksObtained, 
          theoryMarksObtained: m.theoryMarksObtained,
          practicalMarksObtained: m.practicalMarksObtained,
          grade: m.grade || null 
        },
        create: { 
          studentId: m.studentId, 
          examSubjectId: m.examSubjectId || examId, 
          marksObtained: m.marksObtained, 
          theoryMarksObtained: m.theoryMarksObtained,
          practicalMarksObtained: m.practicalMarksObtained,
          grade: m.grade || null 
        },
      });
      results.push(result);
    }
    res.json({ success: true, data: results, message: `${results.length} marks entered/updated` });
  } catch (e) {
    logger.error({ err: e }, "Enter marks error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});



// GET /api/exams/:examId/report-card/:studentId — Report card data
router.get("/:examId/report-card/:studentId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const examId = req.params.examId as string;
    const studentId = req.params.studentId as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;

    if (!schoolId) {
      res.status(400).json({ success: false, error: "School ID required" });
      return;
    }

    // STUDENT can only see their own report card
    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req.user as { studentId?: string }).studentId;
      if (studentId !== studentIdFromToken) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    // PARENT can only see their children's report cards
    if (req.user!.role === "PARENT") {
      const guardian = await prisma.guardian.findUnique({ 
        where: { userId: req.user!.id }, 
        include: { students: { select: { id: true } } } 
      });
      const childIds = guardian?.students.map(s => s.id) || [];
      if (!childIds.includes(studentId)) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const reportCard = await compileReportCardData(schoolId, studentId, examId);

    res.json({
      success: true,
      data: reportCard
    });
  } catch (e: unknown) {
    const errorObj = e as { status?: number; message?: string };
    if (errorObj.status === 404) {
      res.status(404).json({ success: false, error: errorObj.message });
      return;
    }
    logger.error({ err: e }, "Report card error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/exams/:id
router.delete("/:id", authenticate, requireAcademicAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.exam.update({ 
      where: { id: req.params.id as string },
      data: { isArchived: true }
    });
    res.json({ success: true, data: { message: "Exam deleted" } });
  } catch (e) {
    logger.error({ err: e }, "Delete exam error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
