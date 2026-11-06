import { Prisma } from "@prisma/client";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { calculateExamSummary, SubjectMarkDetail } from "./gradebook.service";
import logger from "../lib/logger";

export interface PromotionCriteria {
  minimumPassingPercentage?: number;   // default: 33%
  minimumAttendancePercentage?: number; // default: 75%
  requireAllSubjectsPassed?: boolean;  // default: true
}

export interface StudentPromotionEvaluation {
  studentId: string;
  studentName: string;
  rollNo: string;
  currentClassId?: string;
  currentClassName?: string;
  currentSectionId?: string | null;
  currentSectionName?: string;
  overallPercentage: number;
  overallGpa: number;
  attendancePercentage: number;
  totalWorkingDays: number;
  presentDays: number;
  failedSubjects: string[];
  eligible: boolean;
  ineligibilityReasons: string[];
}

export interface PromotionBatchRequest {
  schoolId: string;
  studentIds: string[];
  targetClassId: string;
  targetSectionId: string;
  criteria?: PromotionCriteria;
  force?: boolean;
  remarks?: string;
  promotedById?: string;
}

export interface PromotionResultItem {
  studentId: string;
  studentName: string;
  status: "PROMOTED" | "RETAINED" | "ERROR";
  previousClass?: string;
  previousSection?: string;
  newClass?: string;
  newSection?: string;
  reason?: string;
}

export interface PromotionBatchResponse {
  success: boolean;
  totalRequested: number;
  promotedCount: number;
  retainedCount: number;
  results: PromotionResultItem[];
}

/**
 * Evaluate a single student's eligibility for promotion based on academic results and attendance.
 */
export async function evaluateStudentForPromotion(
  schoolId: string,
  studentId: string,
  criteria?: PromotionCriteria
): Promise<StudentPromotionEvaluation> {
  const minPassPct = criteria?.minimumPassingPercentage ?? 33.0;
  const minAttPct = criteria?.minimumAttendancePercentage ?? 75.0;
  const requireAllPassed = criteria?.requireAllSubjectsPassed ?? true;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      sectionRef: {
        include: {
          class: true
        }
      }
    }
  });

  if (!student) {
    const err = new Error("Student not found or access denied.") as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  // 1. Fetch latest marks across all exams in the student's current class
  const classId = student.sectionRef?.classId;
  const exams = classId ? await prisma.exam.findMany({
    where: { schoolId, classId, isArchived: false },
    select: { id: true }
  }) : [];

  const examIds = exams.map(e => e.id);
  const marks = examIds.length > 0 ? await prisma.studentMark.findMany({
    where: {
      studentId,
      examSubject: { examId: { in: examIds } }
    },
    include: {
      examSubject: { include: { subject: true } }
    }
  }) : [];

  const subjectDetails: SubjectMarkDetail[] = marks.map(m => ({
    subjectId: m.examSubject.subjectId,
    subjectName: m.examSubject.subject.name,
    subjectCode: m.examSubject.subject.code,
    maxMarks: m.examSubject.maxMarks,
    passMarks: m.examSubject.passMarks,
    theoryMaxMarks: m.examSubject.theoryMaxMarks,
    theoryPassMarks: m.examSubject.theoryPassMarks,
    practicalMaxMarks: m.examSubject.practicalMaxMarks,
    practicalPassMarks: m.examSubject.practicalPassMarks,
    theoryMarksObtained: m.theoryMarksObtained,
    practicalMarksObtained: m.practicalMarksObtained,
    marksObtained: m.marksObtained,
    grade: m.grade
  }));

  const examSummary = calculateExamSummary(subjectDetails);

  // 2. Compute year-to-date attendance
  const attendanceRecords = await prisma.attendance.findMany({
    where: { schoolId, studentId }
  });

  const totalWorkingDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(
    a => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const attendancePercentage = totalWorkingDays > 0
    ? Math.round(((presentDays / totalWorkingDays) * 100) * 10) / 10
    : 100.0;

  // 3. Evaluate criteria
  const ineligibilityReasons: string[] = [];
  if (examSummary.percentage < minPassPct) {
    ineligibilityReasons.push(`Academic score (${examSummary.percentage}%) is below minimum required (${minPassPct}%).`);
  }
  if (attendancePercentage < minAttPct) {
    ineligibilityReasons.push(`Attendance (${attendancePercentage}%) is below minimum required (${minAttPct}%).`);
  }
  if (requireAllPassed && examSummary.failedSubjects.length > 0) {
    ineligibilityReasons.push(`Failed in ${examSummary.failedSubjects.length} subject(s): ${examSummary.failedSubjects.join(", ")}.`);
  }

  const eligible = ineligibilityReasons.length === 0;

  return {
    studentId: student.id,
    studentName: student.name,
    rollNo: student.rollNo,
    currentClassId: student.sectionRef?.classId,
    currentClassName: student.sectionRef?.class?.name,
    currentSectionId: student.sectionId,
    currentSectionName: student.sectionRef?.name,
    overallPercentage: examSummary.percentage,
    overallGpa: examSummary.gpa,
    attendancePercentage,
    totalWorkingDays,
    presentDays,
    failedSubjects: examSummary.failedSubjects,
    eligible,
    ineligibilityReasons
  };
}

/**
 * Atomically promote a batch of students to the destination class and section.
 */
export async function promoteStudentsBatch(params: PromotionBatchRequest): Promise<PromotionBatchResponse> {
  const { schoolId, studentIds, targetClassId, targetSectionId, criteria, force = false, remarks } = params;

  if (!studentIds.length) {
    return {
      success: true,
      totalRequested: 0,
      promotedCount: 0,
      retainedCount: 0,
      results: []
    };
  }

  return await runWithTenantDatabaseTransaction(schoolId, async (tx: Prisma.TransactionClient) => {
    // 1. Verify target section and class belong to this school
    const targetSection = await tx.section.findFirst({
      where: { id: targetSectionId, class: { id: targetClassId, schoolId } },
      include: { class: true }
    });

    if (!targetSection) {
      const err = new Error("Destination section or class not found in this school.") as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    // 2. Fetch all requested students in this school
    const students = await tx.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
        isActive: true
      },
      include: {
        sectionRef: { include: { class: true } }
      }
    });

    if (students.length !== studentIds.length) {
      const foundIds = new Set(students.map(s => s.id));
      const missing = studentIds.filter(id => !foundIds.has(id));
      const err = new Error(`One or more students were not found in this school: ${missing.join(", ")}`) as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    const results: PromotionResultItem[] = [];
    let promotedCount = 0;
    let retainedCount = 0;

    for (const student of students) {
      const evalResult = await evaluateStudentForPromotion(schoolId, student.id, criteria);

      if (!evalResult.eligible && !force) {
        // Retained due to failing criteria
        retainedCount++;
        results.push({
          studentId: student.id,
          studentName: student.name,
          status: "RETAINED",
          previousClass: student.sectionRef?.class?.name,
          previousSection: student.sectionRef?.name,
          reason: evalResult.ineligibilityReasons.join("; ")
        });
        continue;
      }

      // Promote: update student sectionId
      await tx.student.update({
        where: { id: student.id },
        data: {
          sectionId: targetSectionId
        }
      });

      // Record promotion in student timeline
      const promoTitle = `Promoted to ${targetSection.class.name} - ${targetSection.name}`;
      const promoDesc = [
        `Promoted from ${student.sectionRef?.class?.name || "Previous Class"} - ${student.sectionRef?.name || "Section"}.`,
        `Academic Percentage: ${evalResult.overallPercentage}%, GPA: ${evalResult.overallGpa}, Attendance: ${evalResult.attendancePercentage}%.`,
        force && !evalResult.eligible ? `[CONDONED/FORCED PROMOTION]: ${evalResult.ineligibilityReasons.join("; ")}.` : null,
        remarks ? `Remarks: ${remarks}` : null
      ].filter(Boolean).join(" ");

      await tx.studentTimeline.create({
        data: {
          studentId: student.id,
          title: promoTitle,
          type: "PROMOTION",
          description: promoDesc,
          date: new Date()
        }
      });

      promotedCount++;
      results.push({
        studentId: student.id,
        studentName: student.name,
        status: "PROMOTED",
        previousClass: student.sectionRef?.class?.name,
        previousSection: student.sectionRef?.name,
        newClass: targetSection.class.name,
        newSection: targetSection.name,
        reason: force && !evalResult.eligible ? "Condoned promotion" : "Met promotion criteria"
      });
    }

    logger.info(
      { schoolId, promotedCount, retainedCount, total: studentIds.length },
      "Academic promotion batch executed successfully"
    );

    return {
      success: true,
      totalRequested: studentIds.length,
      promotedCount,
      retainedCount,
      results
    };
  });
}
