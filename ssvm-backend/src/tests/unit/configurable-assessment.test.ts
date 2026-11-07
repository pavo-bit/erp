import { describe, it, expect } from "vitest";
import {
  CBSE_GRADING_SCALE,
  ICSE_GRADING_SCALE,
  STATE_BOARD_GRADING_SCALE,
  GPA_4_GRADING_SCALE,
  IB_GRADING_SCALE,
  DEFAULT_CBSE_PROFILE,
  DEFAULT_ICSE_PROFILE,
  getGradingScaleForBoard,
  getGradeForPercentageWithScale,
  calculateSubjectScore,
  calculateExamSummary,
  calculateCompositeTermScore,
  SubjectMarkDetail,
  AssessmentProfile,
} from "../../services/gradebook.service";

describe("Configurable Academic Assessment Engine (Phase 3 Enhancement)", () => {
  describe("Grading Scales & Scale Resolution", () => {
    it("resolves default CBSE grading scale with 8 tiers", () => {
      const scale = getGradingScaleForBoard("CBSE");
      expect(scale).toHaveLength(8);
      expect(scale[0].grade).toBe("A1");
      expect(scale[7].grade).toBe("E");
    });

    it("resolves ICSE grading scale with 9 numeric bands", () => {
      const scale = getGradingScaleForBoard("ICSE");
      expect(scale).toHaveLength(9);
      expect(scale[0].grade).toBe("1");
      expect(scale[8].grade).toBe("9");
    });

    it("resolves State Board grading scale with classifications", () => {
      const scale = getGradingScaleForBoard("STATE_BOARD");
      expect(scale).toHaveLength(5);
      expect(scale[0].grade).toBe("DISTINCTION");
      expect(scale[1].grade).toBe("FIRST_CLASS");
      expect(scale[4].grade).toBe("FAIL");
    });

    it("resolves GPA 4.0 grading scale with letter grades", () => {
      const scale = getGradingScaleForBoard("GPA_4");
      expect(scale).toHaveLength(10);
      expect(scale[0].grade).toBe("A");
      expect(scale[0].gradePoint).toBe(4.0);
    });

    it("resolves IB grading scale with 7-point scale", () => {
      const scale = getGradingScaleForBoard("IB");
      expect(scale).toHaveLength(7);
      expect(scale[0].grade).toBe("7");
      expect(scale[6].grade).toBe("1");
    });

    it("correctly maps percentage to grade across different scales", () => {
      // 95% in CBSE -> A1, in ICSE -> 1, in State Board -> DISTINCTION, in GPA -> A, in IB -> 7
      expect(getGradeForPercentageWithScale(95, CBSE_GRADING_SCALE).grade).toBe("A1");
      expect(getGradeForPercentageWithScale(95, ICSE_GRADING_SCALE).grade).toBe("1");
      expect(getGradeForPercentageWithScale(95, STATE_BOARD_GRADING_SCALE).grade).toBe("DISTINCTION");
      expect(getGradeForPercentageWithScale(95, GPA_4_GRADING_SCALE).grade).toBe("A");
      expect(getGradeForPercentageWithScale(95, IB_GRADING_SCALE).grade).toBe("7");

      // 65% in CBSE -> B2, in ICSE -> 4, in State Board -> FIRST_CLASS, in GPA -> D, in IB -> 5
      expect(getGradeForPercentageWithScale(65, CBSE_GRADING_SCALE).grade).toBe("B2");
      expect(getGradeForPercentageWithScale(65, ICSE_GRADING_SCALE).grade).toBe("4");
      expect(getGradeForPercentageWithScale(65, STATE_BOARD_GRADING_SCALE).grade).toBe("FIRST_CLASS");
    });
  });

  describe("Assessment Profiles & Grace Marks", () => {
    const subjects: SubjectMarkDetail[] = [
      { subjectId: "s1", subjectName: "Mathematics", maxMarks: 100, passMarks: 33, marksObtained: 85 },
      { subjectId: "s2", subjectName: "Science", maxMarks: 100, passMarks: 33, marksObtained: 78 },
      { subjectId: "s3", subjectName: "English", maxMarks: 100, passMarks: 33, marksObtained: 92 },
      { subjectId: "s4", subjectName: "Social Science", maxMarks: 100, passMarks: 33, marksObtained: 30 }, // Marginal fail by 3 marks
    ];

    it("without grace marks, student fails due to one failing subject", () => {
      const summary = calculateExamSummary(subjects, {
        name: "No Grace Profile",
        board: "CBSE",
        passingRules: { minOverallPercentage: 33, minSubjectPercentage: 33, allowGraceMarks: 0, maxCompartmentAllowed: 1 }
      });

      expect(summary.passed).toBe(false);
      expect(summary.failedSubjects).toContain("Social Science");
      expect(summary.compartmentEligible).toBe(true);
    });

    it("with grace marks up to 5, marginal fail is converted to pass with audit trace", () => {
      const summary = calculateExamSummary(subjects, {
        name: "CBSE Grace Profile",
        board: "CBSE",
        passingRules: { minOverallPercentage: 33, minSubjectPercentage: 33, allowGraceMarks: 5, maxCompartmentAllowed: 1 }
      });

      expect(summary.passed).toBe(true);
      expect(summary.failedSubjects).toHaveLength(0);
      expect(summary.graceMarksAwarded).toBeDefined();
      expect(summary.graceMarksAwarded!["Social Science"]).toBe(3);
    });

    it("evaluates student under ICSE profile with 35% minimum pass threshold", () => {
      const icseSubjects: SubjectMarkDetail[] = [
        { subjectId: "s1", subjectName: "Mathematics", maxMarks: 100, passMarks: 35, marksObtained: 34 }, // Below 35%
        { subjectId: "s2", subjectName: "Physics", maxMarks: 100, passMarks: 35, marksObtained: 75 },
      ];

      const summary = calculateExamSummary(icseSubjects, DEFAULT_ICSE_PROFILE);
      expect(summary.failedSubjects).toHaveLength(0); // 34 was bumped to 35 with 1 grace mark (out of 3 allowed)
      expect(summary.passed).toBe(true);
      expect(summary.graceMarksAwarded!["Mathematics"]).toBe(1);
    });
  });

  describe("Multi-Term Composite Weightage Calculation", () => {
    it("computes weighted composite score accurately across Term 1 (30%) and Term 2 (70%)", () => {
      const term1Summary = calculateExamSummary([
        { subjectId: "s1", subjectName: "Math", maxMarks: 100, passMarks: 33, marksObtained: 80 },
        { subjectId: "s2", subjectName: "Science", maxMarks: 100, passMarks: 33, marksObtained: 70 },
      ]); // 75%

      const term2Summary = calculateExamSummary([
        { subjectId: "s1", subjectName: "Math", maxMarks: 100, passMarks: 33, marksObtained: 90 },
        { subjectId: "s2", subjectName: "Science", maxMarks: 100, passMarks: 33, marksObtained: 90 },
      ]); // 90%

      const composite = calculateCompositeTermScore(
        [
          { termName: "Term 1", examSummary: term1Summary },
          { termName: "Term 2", examSummary: term2Summary },
        ],
        [
          { termName: "Term 1", weightPercentage: 30 },
          { termName: "Term 2", weightPercentage: 70 },
        ]
      );

      // (75 * 0.3) + (90 * 0.7) = 22.5 + 63.0 = 85.5%
      expect(composite.compositePercentage).toBe(85.5);
      expect(composite.passed).toBe(true);
      expect(composite.termBreakdown).toHaveLength(2);
      expect(composite.termBreakdown[0].contribution).toBe(22.5);
      expect(composite.termBreakdown[1].contribution).toBe(63);
    });
  });
});

