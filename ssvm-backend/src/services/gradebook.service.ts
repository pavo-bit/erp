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

export const ICSE_GRADING_SCALE: GradeDefinition[] = [
  { minMarks: 90, maxMarks: 100, grade: "1", gradePoint: 1.0, remarks: "Outstanding" },
  { minMarks: 80, maxMarks: 89.999, grade: "2", gradePoint: 2.0, remarks: "Very Good" },
  { minMarks: 70, maxMarks: 79.999, grade: "3", gradePoint: 3.0, remarks: "Good" },
  { minMarks: 60, maxMarks: 69.999, grade: "4", gradePoint: 4.0, remarks: "Satisfactory" },
  { minMarks: 50, maxMarks: 59.999, grade: "5", gradePoint: 5.0, remarks: "Average" },
  { minMarks: 40, maxMarks: 49.999, grade: "6", gradePoint: 6.0, remarks: "Fair" },
  { minMarks: 35, maxMarks: 39.999, grade: "7", gradePoint: 7.0, remarks: "Pass" },
  { minMarks: 20, maxMarks: 34.999, grade: "8", gradePoint: 8.0, remarks: "Needs Improvement" },
  { minMarks: 0, maxMarks: 19.999, grade: "9", gradePoint: 9.0, remarks: "Needs Improvement" }
];

export const STATE_BOARD_GRADING_SCALE: GradeDefinition[] = [
  { minMarks: 75, maxMarks: 100, grade: "DISTINCTION", gradePoint: 4.0, remarks: "First Class with Distinction" },
  { minMarks: 60, maxMarks: 74.999, grade: "FIRST_CLASS", gradePoint: 3.0, remarks: "First Class" },
  { minMarks: 50, maxMarks: 59.999, grade: "SECOND_CLASS", gradePoint: 2.0, remarks: "Second Class" },
  { minMarks: 35, maxMarks: 49.999, grade: "PASS_CLASS", gradePoint: 1.0, remarks: "Pass Class" },
  { minMarks: 0, maxMarks: 34.999, grade: "FAIL", gradePoint: 0.0, remarks: "Needs Improvement" }
];

export const GPA_4_GRADING_SCALE: GradeDefinition[] = [
  { minMarks: 93, maxMarks: 100, grade: "A", gradePoint: 4.0, remarks: "Excellent" },
  { minMarks: 90, maxMarks: 92.999, grade: "A-", gradePoint: 3.7, remarks: "Very Good" },
  { minMarks: 87, maxMarks: 89.999, grade: "B+", gradePoint: 3.3, remarks: "Good" },
  { minMarks: 83, maxMarks: 86.999, grade: "B", gradePoint: 3.0, remarks: "Above Average" },
  { minMarks: 80, maxMarks: 82.999, grade: "B-", gradePoint: 2.7, remarks: "Average" },
  { minMarks: 77, maxMarks: 79.999, grade: "C+", gradePoint: 2.3, remarks: "Satisfactory" },
  { minMarks: 73, maxMarks: 76.999, grade: "C", gradePoint: 2.0, remarks: "Acceptable" },
  { minMarks: 70, maxMarks: 72.999, grade: "C-", gradePoint: 1.7, remarks: "Minimal Pass" },
  { minMarks: 60, maxMarks: 69.999, grade: "D", gradePoint: 1.0, remarks: "Low Pass" },
  { minMarks: 0, maxMarks: 59.999, grade: "F", gradePoint: 0.0, remarks: "Failing" }
];

export const IB_GRADING_SCALE: GradeDefinition[] = [
  { minMarks: 85, maxMarks: 100, grade: "7", gradePoint: 7.0, remarks: "Excellent" },
  { minMarks: 70, maxMarks: 84.999, grade: "6", gradePoint: 6.0, remarks: "Very Good" },
  { minMarks: 55, maxMarks: 69.999, grade: "5", gradePoint: 5.0, remarks: "Good" },
  { minMarks: 40, maxMarks: 54.999, grade: "4", gradePoint: 4.0, remarks: "Satisfactory" },
  { minMarks: 28, maxMarks: 39.999, grade: "3", gradePoint: 3.0, remarks: "Mediocre" },
  { minMarks: 15, maxMarks: 27.999, grade: "2", gradePoint: 2.0, remarks: "Poor" },
  { minMarks: 0, maxMarks: 14.999, grade: "1", gradePoint: 1.0, remarks: "Very Poor" }
];

export type BoardType = "CBSE" | "ICSE" | "STATE_BOARD" | "GPA_4" | "IB" | "CUSTOM";

export interface ComponentWeight {
  componentName: string;
  weightPercentage: number;
}

export interface TermWeight {
  termName: string;
  weightPercentage: number;
}

export interface PassingRules {
  minOverallPercentage: number;
  minSubjectPercentage: number;
  theoryPassPercentage?: number;
  practicalPassPercentage?: number;
  maxCompartmentAllowed?: number;
  allowGraceMarks?: number;
}

export interface AssessmentProfile {
  id?: string;
  name: string;
  board: BoardType;
  gradingScale?: GradeDefinition[];
  termWeights?: TermWeight[];
  componentWeights?: ComponentWeight[];
  passingRules?: PassingRules;
}

export const DEFAULT_CBSE_PROFILE: AssessmentProfile = {
  name: "Standard CBSE Profile",
  board: "CBSE",
  gradingScale: CBSE_GRADING_SCALE,
  passingRules: {
    minOverallPercentage: 33.0,
    minSubjectPercentage: 33.0,
    maxCompartmentAllowed: 1,
    allowGraceMarks: 5
  }
};

export const DEFAULT_ICSE_PROFILE: AssessmentProfile = {
  name: "Standard ICSE Profile",
  board: "ICSE",
  gradingScale: ICSE_GRADING_SCALE,
  passingRules: {
    minOverallPercentage: 35.0,
    minSubjectPercentage: 35.0,
    maxCompartmentAllowed: 1,
    allowGraceMarks: 3
  }
};

export function getGradingScaleForBoard(board: BoardType, customScale?: GradeDefinition[]): GradeDefinition[] {
  if (board === "CUSTOM" && customScale && customScale.length) return customScale;
  switch (board) {
    case "ICSE": return ICSE_GRADING_SCALE;
    case "STATE_BOARD": return STATE_BOARD_GRADING_SCALE;
    case "GPA_4": return GPA_4_GRADING_SCALE;
    case "IB": return IB_GRADING_SCALE;
    case "CBSE":
    default: return CBSE_GRADING_SCALE;
  }
}

export function getGradeForPercentageWithScale(
  percentage: number,
  scale: GradeDefinition[] = CBSE_GRADING_SCALE
): { grade: string; gradePoint: number; remarks: string } {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));
  for (const s of scale) {
    if (clamped >= s.minMarks && clamped <= s.maxMarks) {
      return { grade: s.grade, gradePoint: s.gradePoint, remarks: s.remarks };
    }
  }
  const last = scale[scale.length - 1];
  return { grade: last ? last.grade : "E", gradePoint: last ? last.gradePoint : 0, remarks: last ? last.remarks : "Needs Improvement" };
}

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
  compartmentEligible?: boolean;
  graceMarksAwarded?: Record<string, number>;
}

/**
 * Determine letter grade, grade point, and qualitative remarks for a given percentage using CBSE scale.
 */
export function getGradeForPercentage(percentage: number): { grade: string; gradePoint: number; remarks: string } {
  return getGradeForPercentageWithScale(percentage, CBSE_GRADING_SCALE);
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
  scale?: GradeDefinition[];
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
  const gradeInfo = getGradeForPercentageWithScale(percentage, input.scale || CBSE_GRADING_SCALE);

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
 * Backwards compatible with existing caller signatures.
 */
export function calculateExamSummary(
  subjects: SubjectMarkDetail[],
  profile?: AssessmentProfile
): ExamSummary {
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

  const activeScale = profile?.gradingScale && profile.gradingScale.length
    ? profile.gradingScale
    : getGradingScaleForBoard(profile?.board || "CBSE");

  const passingRules = profile?.passingRules || {
    minOverallPercentage: 33.0,
    minSubjectPercentage: 33.0,
    maxCompartmentAllowed: 1,
    allowGraceMarks: 0
  };

  let totalMaxMarks = 0;
  let totalMarksObtained = 0;
  let totalGradePoints = 0;
  const failedSubjects: string[] = [];
  const graceMarksAwarded: Record<string, number> = {};
  let remainingGrace = passingRules.allowGraceMarks || 0;

  const processedSubjects: SubjectMarkDetail[] = subjects.map(s => {
    let effectiveMarks = s.marksObtained;
    let effectiveTheory = s.theoryMarksObtained;
    let effectivePractical = s.practicalMarksObtained;

    // Grace marks application if enabled and subject is marginally failing
    let calc = calculateSubjectScore({
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
      marksObtained: effectiveMarks,
      theoryMaxMarks: s.theoryMaxMarks,
      theoryPassMarks: s.theoryPassMarks,
      theoryMarksObtained: effectiveTheory,
      practicalMaxMarks: s.practicalMaxMarks,
      practicalPassMarks: s.practicalPassMarks,
      practicalMarksObtained: effectivePractical,
      scale: activeScale
    });

    if (!calc.passed && remainingGrace > 0) {
      const deficit = s.passMarks - calc.finalMarksObtained;
      if (deficit > 0 && deficit <= remainingGrace) {
        effectiveMarks = (effectiveMarks || 0) + deficit;
        graceMarksAwarded[s.subjectName] = deficit;
        remainingGrace -= deficit;

        calc = calculateSubjectScore({
          maxMarks: s.maxMarks,
          passMarks: s.passMarks,
          marksObtained: effectiveMarks,
          theoryMaxMarks: s.theoryMaxMarks,
          theoryPassMarks: s.theoryPassMarks,
          theoryMarksObtained: effectiveTheory ? effectiveTheory + deficit : null,
          practicalMaxMarks: s.practicalMaxMarks,
          practicalPassMarks: s.practicalPassMarks,
          practicalMarksObtained: effectivePractical,
          scale: activeScale
        });
      }
    }

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

  const overallGradeInfo = getGradeForPercentageWithScale(overallPercentage, activeScale);
  const minOverallMet = overallPercentage >= (passingRules.minOverallPercentage || 33.0);
  const overallPassed = failedSubjects.length === 0 && minOverallMet;

  const maxCompartment = passingRules.maxCompartmentAllowed ?? 1;
  const compartmentEligible = !overallPassed && failedSubjects.length <= maxCompartment;

  let remarks = overallGradeInfo.remarks;
  if (!overallPassed) {
    if (compartmentEligible) {
      remarks = `Eligible for Compartment Examination in ${failedSubjects.join(", ")}`;
    } else {
      remarks = `Needs Improvement (${failedSubjects.length} subject(s) below passing mark)`;
    }
  }

  return {
    totalMaxMarks,
    totalMarksObtained,
    percentage: overallPercentage,
    gpa,
    overallGrade: overallPassed ? overallGradeInfo.grade : (activeScale[activeScale.length - 1]?.grade || "E"),
    overallRemarks: remarks,
    passed: overallPassed,
    failedSubjects,
    subjectResults: processedSubjects,
    compartmentEligible,
    graceMarksAwarded: Object.keys(graceMarksAwarded).length ? graceMarksAwarded : undefined
  };
}

/**
 * Calculate multi-term composite score weighted by term weights (e.g. Term 1 40% + Term 2 60%).
 */
export function calculateCompositeTermScore(
  terms: { termName: string; examSummary: ExamSummary }[],
  termWeights: TermWeight[]
): {
  compositePercentage: number;
  compositeGpa: number;
  compositeGrade: string;
  passed: boolean;
  termBreakdown: { termName: string; weight: number; termPercentage: number; contribution: number }[];
} {
  let totalWeight = 0;
  let weightedPercentageSum = 0;
  let weightedGpaSum = 0;
  let allTermsPassed = true;

  const termBreakdown = terms.map(t => {
    const matchedWeight = termWeights.find(w => w.termName.toLowerCase() === t.termName.toLowerCase())?.weightPercentage ?? (100 / terms.length);
    totalWeight += matchedWeight;
    const contribution = (t.examSummary.percentage * matchedWeight) / 100;
    weightedPercentageSum += contribution;
    weightedGpaSum += (t.examSummary.gpa * matchedWeight) / 100;

    if (!t.examSummary.passed) {
      allTermsPassed = false;
    }

    return {
      termName: t.termName,
      weight: matchedWeight,
      termPercentage: t.examSummary.percentage,
      contribution: Math.round(contribution * 100) / 100
    };
  });

  const finalPercentage = totalWeight > 0 ? Math.round((weightedPercentageSum / (totalWeight / 100)) * 100) / 100 : 0;
  const finalGpa = totalWeight > 0 ? Math.round((weightedGpaSum / (totalWeight / 100)) * 100) / 100 : 0;
  const gradeInfo = getGradeForPercentage(finalPercentage);

  return {
    compositePercentage: finalPercentage,
    compositeGpa: finalGpa,
    compositeGrade: allTermsPassed ? gradeInfo.grade : "E",
    passed: allTermsPassed && finalPercentage >= 33.0,
    termBreakdown
  };
}

