export interface GradeDefinition {
  minMarks: number;
  maxMarks: number;
  grade: string;
  gradePoint: number;
  remarks: string;
}

export const CBSE_GRADING_SCALE: GradeDefinition[] = [
  { minMarks: 91, maxMarks: 100, grade: "A1", gradePoint: 10.0, remarks: "Outstanding" },
  { minMarks: 81, maxMarks: 90.999, grade: "A2", gradePoint: 9.0, remarks: "Excellent" },
  { minMarks: 71, maxMarks: 80.999, grade: "B1", gradePoint: 8.0, remarks: "Very Good" },
  { minMarks: 61, maxMarks: 70.999, grade: "B2", gradePoint: 7.0, remarks: "Good" },
  { minMarks: 51, maxMarks: 60.999, grade: "C1", gradePoint: 6.0, remarks: "Above Average" },
  { minMarks: 41, maxMarks: 50.999, grade: "C2", gradePoint: 5.0, remarks: "Average" },
  { minMarks: 33, maxMarks: 40.999, grade: "D", gradePoint: 4.0, remarks: "Pass" },
  { minMarks: 0, maxMarks: 32.999, grade: "E", gradePoint: 0.0, remarks: "Needs Improvement" }
];

export interface SubjectMarkDetail {
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
  maxMarks: number;
  passMarks: number;
  theoryMaxMarks?: number | null;
  theoryPassMarks?: number | null;
  practicalMaxMarks?: number | null;
  practicalPassMarks?: number | null;
  theoryMarksObtained?: number | null;
  practicalMarksObtained?: number | null;
  marksObtained: number;
  grade?: string | null;
  gradePoint?: number;
  passed?: boolean;
}

export interface ExamSummary {
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  gpa: number;
  overallGrade: string;
  overallRemarks: string;
  passed: boolean;
  failedSubjects: string[];
  subjectResults: SubjectMarkDetail[];
}

/**
 * Determine letter grade, grade point, and qualitative remarks for a given percentage.
 */
export function getGradeForPercentage(percentage: number): { grade: string; gradePoint: number; remarks: string } {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));
  for (const scale of CBSE_GRADING_SCALE) {
    if (clamped >= scale.minMarks && clamped <= scale.maxMarks) {
      return {
        grade: scale.grade,
        gradePoint: scale.gradePoint,
        remarks: scale.remarks
      };
    }
  }
  return { grade: "E", gradePoint: 0.0, remarks: "Needs Improvement" };
}

/**
 * Calculate individual subject score, validating theory + practical combinations if provided.
 */
export function calculateSubjectScore(input: {
  maxMarks: number;
  passMarks: number;
  marksObtained?: number;
  theoryMaxMarks?: number | null;
  theoryPassMarks?: number | null;
  theoryMarksObtained?: number | null;
  practicalMaxMarks?: number | null;
  practicalPassMarks?: number | null;
  practicalMarksObtained?: number | null;
}): {
  finalMarksObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  passed: boolean;
} {
  const hasComponentMarks = input.theoryMarksObtained !== undefined && input.theoryMarksObtained !== null;
  
  let totalObtained: number;
  if (hasComponentMarks) {
    totalObtained = (input.theoryMarksObtained || 0) + (input.practicalMarksObtained || 0);
  } else {
    totalObtained = input.marksObtained ?? 0;
  }

  const maxTotal = input.maxMarks > 0 ? input.maxMarks : 100;
  const percentage = Math.round(((totalObtained / maxTotal) * 100) * 100) / 100;
  const gradeInfo = getGradeForPercentage(percentage);

  // Check component-level and total pass marks
  let passed = totalObtained >= input.passMarks;
  if (input.theoryPassMarks && (input.theoryMarksObtained ?? 0) < input.theoryPassMarks) {
    passed = false;
  }
  if (input.practicalPassMarks && (input.practicalMarksObtained ?? 0) < input.practicalPassMarks) {
    passed = false;
  }

  return {
    finalMarksObtained: totalObtained,
    percentage,
    grade: gradeInfo.grade,
    gradePoint: gradeInfo.gradePoint,
    passed
  };
}

/**
 * Compile student exam summary with cumulative GPA and overall status.
 */
export function calculateExamSummary(subjects: SubjectMarkDetail[]): ExamSummary {
  if (!subjects.length) {
    return {
      totalMaxMarks: 0,
      totalMarksObtained: 0,
      percentage: 0,
      gpa: 0,
      overallGrade: "N/A",
      overallRemarks: "No marks recorded",
      passed: false,
      failedSubjects: [],
      subjectResults: []
    };
  }

  let totalMaxMarks = 0;
  let totalMarksObtained = 0;
  let totalGradePoints = 0;
  const failedSubjects: string[] = [];

  const processedSubjects: SubjectMarkDetail[] = subjects.map(s => {
    const calc = calculateSubjectScore({
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
      marksObtained: s.marksObtained,
      theoryMaxMarks: s.theoryMaxMarks,
      theoryPassMarks: s.theoryPassMarks,
      theoryMarksObtained: s.theoryMarksObtained,
      practicalMaxMarks: s.practicalMaxMarks,
      practicalPassMarks: s.practicalPassMarks,
      practicalMarksObtained: s.practicalMarksObtained
    });

    totalMaxMarks += s.maxMarks;
    totalMarksObtained += calc.finalMarksObtained;
    totalGradePoints += calc.gradePoint;

    if (!calc.passed) {
      failedSubjects.push(s.subjectName);
    }

    return {
      ...s,
      marksObtained: calc.finalMarksObtained,
      grade: calc.grade,
      gradePoint: calc.gradePoint,
      passed: calc.passed
    };
  });

  const overallPercentage = totalMaxMarks > 0 
    ? Math.round(((totalMarksObtained / totalMaxMarks) * 100) * 100) / 100 
    : 0;

  const gpa = processedSubjects.length > 0 
    ? Math.round((totalGradePoints / processedSubjects.length) * 100) / 100 
    : 0;

  const overallGradeInfo = getGradeForPercentage(overallPercentage);
  const overallPassed = failedSubjects.length === 0;

  return {
    totalMaxMarks,
    totalMarksObtained,
    percentage: overallPercentage,
    gpa,
    overallGrade: overallPassed ? overallGradeInfo.grade : "E",
    overallRemarks: overallPassed 
      ? overallGradeInfo.remarks 
      : `Needs Improvement (${failedSubjects.length} subject(s) below passing mark)`,
    passed: overallPassed,
    failedSubjects,
    subjectResults: processedSubjects
  };
}

