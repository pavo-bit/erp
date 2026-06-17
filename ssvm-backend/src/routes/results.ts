import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireTeacherOrAdmin } from "../middleware/auth";
import { paginateCursor } from "../lib/paginate";

const router = Router();

// GET /api/v1/results - Fetch flat results for ERP Admin
router.get("/", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { examName, limit = "50", cursor } = req.query;

    const where: import('@prisma/client').Prisma.StudentMarkWhereInput = { 
      examSubject: { 
        exam: { 
          schoolId,
          ...(examName ? { name: examName as string } : {})
        } 
      } 
    };

    const marks = await prisma.studentMark.findMany({
      where,
      include: {
        student: {
          select: { id: true, rollNo: true, user: { select: { name: true } } }
        },
        examSubject: {
          include: { exam: true, subject: true }
        }
      },
      take: parseInt(limit as string, 10),
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' }
    });

    // Flatten to match frontend expectation
    const flatResults = marks.map(m => ({
      id: m.id,
      studentId: m.studentId,
      student: m.student,
      examName: m.examSubject?.exam?.name || "Unknown Exam",
      subject: m.examSubject?.subject?.name || "Unknown Subject",
      totalMarks: m.examSubject?.maxMarks || 100,
      obtained: m.marksObtained,
      grade: m.grade
    }));

    res.json({ success: true, data: flatResults });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch flat results");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/results - Add flat result
router.post("/", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, examName, subject, totalMarks, obtained, grade } = req.body;

    if (!studentId || !examName || !subject || totalMarks === undefined || obtained === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create Exam
      let exam = await tx.exam.findFirst({ where: { schoolId, name: examName } });
      if (!exam) {
        exam = await tx.exam.create({
          data: { schoolId, name: examName, startDate: new Date(), endDate: new Date(), classId: "mock_class_id" }
        });
      }

      // 2. Find or create Subject
      let subjectObj = await tx.subject.findFirst({ where: { schoolId, name: subject } });
      if (!subjectObj) {
        subjectObj = await tx.subject.create({
          data: { schoolId, name: subject, code: subject.substring(0, 3).toUpperCase() }
        });
      }

      // 3. Find or create ExamSubject
      let examSubject = await tx.examSubject.findFirst({
        where: { examId: exam.id, subjectId: subjectObj.id }
      });
      
      if (!examSubject) {
        examSubject = await tx.examSubject.create({
          data: { examId: exam.id, subjectId: subjectObj.id, maxMarks: totalMarks, passMarks: Math.round(totalMarks * 0.33) }
        });
      }

      // 4. Upsert StudentMark
      const mark = await tx.studentMark.upsert({
        where: { studentId_examSubjectId: { studentId, examSubjectId: examSubject.id } },
        update: { marksObtained: obtained, grade: grade || null },
        create: { studentId, examSubjectId: examSubject.id, marksObtained: obtained, grade: grade || null }
      });

      return mark;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error({ err: error }, "Failed to add flat result");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
