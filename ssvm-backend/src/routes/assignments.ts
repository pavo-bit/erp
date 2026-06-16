import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";

const router = Router();

// GET all assignments
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId } = req.query as Record<string, string>;
    const paginationParams = parsePaginationParams(req.query, ['dueDate', 'maxMarks', 'createdAt']);
    const schoolId = req.user!.schoolId!;

    const where: any = { schoolId };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req.user as any).studentId;
      if (!studentIdFromToken) {
        return res.status(400).json({ success: false, error: 'Student ID not found in token' });
      }
      const student = await prisma.student.findUnique({ where: { id: studentIdFromToken } });
      if (student && student.sectionId) {
        const section = await prisma.section.findUnique({ where: { id: student.sectionId } });
        if (section) where.classId = section.classId;
      }
    }

    const result = await paginatedQuery(
      prisma.assignment,
      where,
      {
        attachments: true,
        submissions: {
          where: req.user!.role === "STUDENT" ? { studentId: (req.user as any).studentId } : undefined,
          select: { id: true, studentId: true, status: true, isLate: true, marksObtained: true, grade: true }
        }
      },
      paginationParams
    );

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// CREATE an assignment (Enhanced)
router.post("/", authenticate, requireRole("ADMIN", "TEACHER"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, subjectId, classId, description, dueDate, maxMarks, allowLate, lateDeadline, latePenalty, rubric, attachments } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!title || !subjectId || !dueDate) {
      res.status(400).json({ success: false, error: "Required fields missing: title, subjectId, dueDate" });
      return;
    }

    const assignment = await prisma.assignment.create({
      data: {
        schoolId,
        title,
        subjectId,
        classId,
        teacherId: req.user!.id,
        description: description || null,
        dueDate: new Date(dueDate),
        maxMarks: maxMarks || null,
        allowLate: !!allowLate,
        lateDeadline: lateDeadline ? new Date(lateDeadline) : null,
        latePenalty: latePenalty || 0,
        rubric: rubric ? JSON.stringify(rubric) : null,
        attachments: attachments && Array.isArray(attachments) ? {
          create: attachments.map(att => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileType: att.fileType,
            sizeBytes: att.sizeBytes || 0
          }))
        } : undefined
      },
      include: { attachments: true }
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// SUBMIT an assignment
router.post("/:id/submit", authenticate, requireRole("STUDENT"), async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = req.params.id as string;
    const studentId = (req.user as any).studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID not found in token' });
    }
    const { attachment } = req.body;

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      res.status(404).json({ success: false, error: "Assignment not found" });
      return;
    }

    const now = new Date();
    let isLate = false;

    if (now > assignment.dueDate) {
      if (!assignment.allowLate) {
        res.status(400).json({ success: false, error: "Late submissions are not allowed for this assignment." });
        return;
      }
      if (assignment.lateDeadline && now > assignment.lateDeadline) {
        res.status(400).json({ success: false, error: "Late deadline has passed." });
        return;
      }
      isLate = true;
    }

    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: {
        status: "SUBMITTED",
        submittedAt: now,
        attachment,
        isLate
      },
      create: {
        assignmentId,
        studentId,
        status: "SUBMITTED",
        submittedAt: now,
        attachment,
        isLate
      }
    });

    res.json({ success: true, data: submission });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GRADE a submission using Rubrics
router.post("/submissions/:submissionId/grade", authenticate, requireRole("ADMIN", "TEACHER"), async (req: AuthRequest, res: Response) => {
  try {
    const submissionId = req.params.submissionId as string;
    const { marksObtained, grade, teacherFeedback, rubricScores } = req.body;

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true }
    });

    if (!submission) {
      res.status(404).json({ success: false, error: "Submission not found" });
      return;
    }

    let finalMarks = marksObtained;

    // Apply late penalty if applicable
    if (submission.isLate && submission.assignment.latePenalty) {
      const penalty = (finalMarks * submission.assignment.latePenalty) / 100;
      finalMarks = Math.max(0, finalMarks - penalty);
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        status: "GRADED",
        marksObtained: finalMarks,
        grade,
        teacherFeedback,
        rubricScores: rubricScores ? JSON.stringify(rubricScores) : null
      }
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET Study Materials
router.get("/study-materials", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId } = req.query as Record<string, string>;
    const schoolId = req.user!.schoolId!;

    const where: any = { schoolId };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = (req.user as any).studentId;
      if (studentIdFromToken) {
        const student = await prisma.student.findUnique({ where: { id: studentIdFromToken } });
        if (student && student.sectionId) {
          const section = await prisma.section.findUnique({ where: { id: student.sectionId } });
          if (section) where.classId = section.classId;
        }
      }
    }

    const materials = await prisma.studyMaterial.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: materials });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
