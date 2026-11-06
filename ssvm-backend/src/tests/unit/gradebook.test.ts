import { 
  getGradeForPercentage, 
  calculateSubjectScore, 
  calculateExamSummary, 
  SubjectMarkDetail 
} from "../../services/gradebook.service";

describe("Gradebook Service Unit Tests", () => {
  describe("getGradeForPercentage", () => {
    it("should assign A1 for marks between 91 and 100", () => {
      expect(getGradeForPercentage(95)).toEqual({ grade: "A1", gradePoint: 10.0, remarks: "Outstanding" });
      expect(getGradeForPercentage(91)).toEqual({ grade: "A1", gradePoint: 10.0, remarks: "Outstanding" });
      expect(getGradeForPercentage(100)).toEqual({ grade: "A1", gradePoint: 10.0, remarks: "Outstanding" });
    });

    it("should assign A2 for marks between 81 and 90.99", () => {
      expect(getGradeForPercentage(90.5)).toEqual({ grade: "A2", gradePoint: 9.0, remarks: "Excellent" });
      expect(getGradeForPercentage(81)).toEqual({ grade: "A2", gradePoint: 9.0, remarks: "Excellent" });
    });

    it("should assign B1 for marks between 71 and 80.99", () => {
      expect(getGradeForPercentage(75)).toEqual({ grade: "B1", gradePoint: 8.0, remarks: "Very Good" });
    });

    it("should assign B2 for marks between 61 and 70.99", () => {
      expect(getGradeForPercentage(65)).toEqual({ grade: "B2", gradePoint: 7.0, remarks: "Good" });
    });

    it("should assign C1 for marks between 51 and 60.99", () => {
      expect(getGradeForPercentage(55)).toEqual({ grade: "C1", gradePoint: 6.0, remarks: "Above Average" });
    });

    it("should assign C2 for marks between 41 and 50.99", () => {
      expect(getGradeForPercentage(45)).toEqual({ grade: "C2", gradePoint: 5.0, remarks: "Average" });
    });

    it("should assign D for marks between 33 and 40.99", () => {
      expect(getGradeForPercentage(33)).toEqual({ grade: "D", gradePoint: 4.0, remarks: "Pass" });
      expect(getGradeForPercentage(40)).toEqual({ grade: "D", gradePoint: 4.0, remarks: "Pass" });
    });

    it("should assign E for marks below 33", () => {
      expect(getGradeForPercentage(32.5)).toEqual({ grade: "E", gradePoint: 0.0, remarks: "Needs Improvement" });
      expect(getGradeForPercentage(0)).toEqual({ grade: "E", gradePoint: 0.0, remarks: "Needs Improvement" });
    });
  });

  describe("calculateSubjectScore", () => {
    it("should correctly score a simple single-component subject", () => {
      const res = calculateSubjectScore({
        maxMarks: 100,
        passMarks: 33,
        marksObtained: 85
      });
      expect(res.finalMarksObtained).toBe(85);
      expect(res.percentage).toBe(85);
      expect(res.grade).toBe("A2");
      expect(res.gradePoint).toBe(9.0);
      expect(res.passed).toBe(true);
    });

    it("should sum theory and practical marks when components exist", () => {
      const res = calculateSubjectScore({
        maxMarks: 100,
        passMarks: 33,
        theoryMaxMarks: 70,
        theoryPassMarks: 23,
        theoryMarksObtained: 60,
        practicalMaxMarks: 30,
        practicalPassMarks: 10,
        practicalMarksObtained: 28
      });
      expect(res.finalMarksObtained).toBe(88);
      expect(res.percentage).toBe(88);
      expect(res.grade).toBe("A2");
      expect(res.passed).toBe(true);
    });

    it("should fail student if theory marks fail theoryPassMarks threshold", () => {
      const res = calculateSubjectScore({
        maxMarks: 100,
        passMarks: 33,
        theoryMaxMarks: 70,
        theoryPassMarks: 23,
        theoryMarksObtained: 18, // Failed theory
        practicalMaxMarks: 30,
        practicalPassMarks: 10,
        practicalMarksObtained: 25 // Total is 43 >= 33, but theory failed!
      });
      expect(res.finalMarksObtained).toBe(43);
      expect(res.passed).toBe(false);
    });
  });

  describe("calculateExamSummary", () => {
    it("should calculate cumulative GPA, percentage, and passing status", () => {
      const subjects: SubjectMarkDetail[] = [
        {
          subjectId: "sub1",
          subjectName: "Mathematics",
          maxMarks: 100,
          passMarks: 33,
          marksObtained: 95
        },
        {
          subjectId: "sub2",
          subjectName: "Science",
          maxMarks: 100,
          passMarks: 33,
          marksObtained: 85
        },
        {
          subjectId: "sub3",
          subjectName: "English",
          maxMarks: 100,
          passMarks: 33,
          marksObtained: 75
        }
      ];

      const summary = calculateExamSummary(subjects);
      expect(summary.totalMaxMarks).toBe(300);
      expect(summary.totalMarksObtained).toBe(255);
      expect(summary.percentage).toBe(85);
      expect(summary.gpa).toBe(9.0); // (10 + 9 + 8) / 3 = 9.0
      expect(summary.overallGrade).toBe("A2");
      expect(summary.passed).toBe(true);
      expect(summary.failedSubjects).toHaveLength(0);
    });

    it("should mark overall passed as false if any subject is failed", () => {
      const subjects: SubjectMarkDetail[] = [
        {
          subjectId: "sub1",
          subjectName: "Mathematics",
          maxMarks: 100,
          passMarks: 33,
          marksObtained: 95
        },
        {
          subjectId: "sub2",
          subjectName: "Physics",
          maxMarks: 100,
          passMarks: 33,
          marksObtained: 25 // Failed!
        }
      ];

      const summary = calculateExamSummary(subjects);
      expect(summary.passed).toBe(false);
      expect(summary.failedSubjects).toEqual(["Physics"]);
      expect(summary.overallGrade).toBe("E");
    });
  });
});

