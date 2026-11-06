import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from "../helpers/testApp";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Student Academic Promotion Engine and Invariant Verification", () => {
  const uid = Math.random().toString(36).substring(2, 7);

  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;

  let sessionAId: string;
  let class1AId: string;
  let section1AId: string;
  let class2AId: string;
  let section2AId: string;

  let schoolBClassId: string;
  let schoolBSectionId: string;

  let studentPassingId: string;
  let studentFailingMarksId: string;
  let studentFailingAttendanceId: string;
  let studentSchoolBId: string;

  let examAId: string;

  beforeAll(async () => {
    // 1. Schools
    const schoolA = await createTestSchool(`Promo School A ${uid}`);
    const schoolB = await createTestSchool(`Promo School B ${uid}`);
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    // 2. Admin
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;

    // 3. Academic Sessions, Classes, Sections
    const sessionA = await prisma.academicSession.create({
      data: {
        schoolId: schoolAId,
        name: `2026-Promo-${uid}`,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true
      }
    });
    sessionAId = sessionA.id;

    const class1 = await prisma.class.create({
      data: { schoolId: schoolAId, sessionId: sessionAId, name: `Class 1-${uid}` }
    });
    class1AId = class1.id;

    const sec1 = await prisma.section.create({
      data: { classId: class1AId, name: "Section-1A" }
    });
    section1AId = sec1.id;

    const class2 = await prisma.class.create({
      data: { schoolId: schoolAId, sessionId: sessionAId, name: `Class 2-${uid}` }
    });
    class2AId = class2.id;

    const sec2 = await prisma.section.create({
      data: { classId: class2AId, name: "Section-2A" }
    });
    section2AId = sec2.id;

    // School B Class & Section
    const sessionB = await prisma.academicSession.create({
      data: { schoolId: schoolBId, name: `2026-PromoB-${uid}`, startDate: new Date("2026-04-01"), endDate: new Date("2027-03-31") }
    });
    const classB = await prisma.class.create({
      data: { schoolId: schoolBId, sessionId: sessionB.id, name: `Class B-${uid}` }
    });
    schoolBClassId = classB.id;
    const secB = await prisma.section.create({
      data: { classId: classB.id, name: "Section-B" }
    });
    schoolBSectionId = secB.id;

    // 4. Students
    // Student 1 (Passing)
    const u1 = await createTestUser(Role.STUDENT, schoolAId);
    const s1 = await prisma.student.findUniqueOrThrow({ where: { userId: u1.user.id } });
    const upd1 = await prisma.student.update({
      where: { id: s1.id },
      data: { name: `Passing Student ${uid}`, sectionId: section1AId }
    });
    studentPassingId = upd1.id;

    // Student 2 (Failing Marks)
    const u2 = await createTestUser(Role.STUDENT, schoolAId);
    const s2 = await prisma.student.findUniqueOrThrow({ where: { userId: u2.user.id } });
    const upd2 = await prisma.student.update({
      where: { id: s2.id },
      data: { name: `Failing Marks Student ${uid}`, sectionId: section1AId }
    });
    studentFailingMarksId = upd2.id;

    // Student 3 (Failing Attendance)
    const u3 = await createTestUser(Role.STUDENT, schoolAId);
    const s3 = await prisma.student.findUniqueOrThrow({ where: { userId: u3.user.id } });
    const upd3 = await prisma.student.update({
      where: { id: s3.id },
      data: { name: `Low Attendance Student ${uid}`, sectionId: section1AId }
    });
    studentFailingAttendanceId = upd3.id;

    // Student in School B
    const uB = await createTestUser(Role.STUDENT, schoolBId);
    const sB = await prisma.student.findUniqueOrThrow({ where: { userId: uB.user.id } });
    studentSchoolBId = sB.id;

    // 5. Subjects & Exam in Class 1
    const sub1 = await prisma.subject.create({
      data: { schoolId: schoolAId, name: `Math-${uid}`, code: "MTH" }
    });
    const sub2 = await prisma.subject.create({
      data: { schoolId: schoolAId, name: `Science-${uid}`, code: "SCI" }
    });

    const exam = await prisma.exam.create({
      data: {
        schoolId: schoolAId,
        classId: class1AId,
        name: `Final Exam-${uid}`,
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-10"),
        isPublished: true
      }
    });
    examAId = exam.id;

    const es1 = await prisma.examSubject.create({
      data: { examId: examAId, subjectId: sub1.id, maxMarks: 100, passMarks: 33 }
    });
    const es2 = await prisma.examSubject.create({
      data: { examId: examAId, subjectId: sub2.id, maxMarks: 100, passMarks: 33 }
    });

    // Student 1: Math 90, Science 85 -> Passed both
    await prisma.studentMark.createMany({
      data: [
        { studentId: studentPassingId, examSubjectId: es1.id, marksObtained: 90 },
        { studentId: studentPassingId, examSubjectId: es2.id, marksObtained: 85 }
      ]
    });

    // Student 2: Math 20 (FAIL), Science 70
    await prisma.studentMark.createMany({
      data: [
        { studentId: studentFailingMarksId, examSubjectId: es1.id, marksObtained: 20 },
        { studentId: studentFailingMarksId, examSubjectId: es2.id, marksObtained: 70 }
      ]
    });

    // Student 3: Math 80, Science 80 -> Passed marks
    await prisma.studentMark.createMany({
      data: [
        { studentId: studentFailingAttendanceId, examSubjectId: es1.id, marksObtained: 80 },
        { studentId: studentFailingAttendanceId, examSubjectId: es2.id, marksObtained: 80 }
      ]
    });

    // 6. Attendance
    // Student 1 & 2: 18 present out of 20 = 90%
    const baseDate = new Date("2026-08-01");
    const attList = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      attList.push(
        { studentId: studentPassingId, schoolId: schoolAId, sectionId: section1AId, date: d, status: "PRESENT" as const },
        { studentId: studentFailingMarksId, schoolId: schoolAId, sectionId: section1AId, date: d, status: "PRESENT" as const }
      );
    }
    for (let i = 18; i < 20; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      attList.push(
        { studentId: studentPassingId, schoolId: schoolAId, sectionId: section1AId, date: d, status: "ABSENT" as const },
        { studentId: studentFailingMarksId, schoolId: schoolAId, sectionId: section1AId, date: d, status: "ABSENT" as const }
      );
    }

    // Student 3: 10 present out of 20 = 50% (< 75%)
    for (let i = 0; i < 10; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      attList.push({
        studentId: studentFailingAttendanceId,
        schoolId: schoolAId,
        sectionId: section1AId,
        date: d,
        status: "PRESENT" as const
      });
    }
    for (let i = 10; i < 20; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      attList.push({
        studentId: studentFailingAttendanceId,
        schoolId: schoolAId,
        sectionId: section1AId,
        date: d,
        status: "ABSENT" as const
      });
    }

    await prisma.attendance.createMany({ data: attList });
  });

  afterAll(async () => {
    try {
      await prisma.studentTimeline.deleteMany({
        where: { studentId: { in: [studentPassingId, studentFailingMarksId, studentFailingAttendanceId] } }
      });
      await prisma.studentMark.deleteMany({
        where: { studentId: { in: [studentPassingId, studentFailingMarksId, studentFailingAttendanceId] } }
      });
      await prisma.attendance.deleteMany({
        where: { studentId: { in: [studentPassingId, studentFailingMarksId, studentFailingAttendanceId] } }
      });
      await prisma.examSubject.deleteMany({ where: { examId: examAId } });
      await prisma.exam.deleteMany({ where: { id: examAId } });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("GET /api/v1/academic/promote/evaluate/:studentId", () => {
    it("should evaluate passing student as eligible for promotion", async () => {
      const res = await request(app)
        .get(`/api/v1/academic/promote/evaluate/${studentPassingId}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.eligible).toBe(true);
      expect(data.overallPercentage).toBe(87.5); // (90 + 85) / 2
      expect(data.attendancePercentage).toBe(90.0);
      expect(data.failedSubjects).toHaveLength(0);
      expect(data.ineligibilityReasons).toHaveLength(0);
    });

    it("should flag student failing marks as ineligible", async () => {
      const res = await request(app)
        .get(`/api/v1/academic/promote/evaluate/${studentFailingMarksId}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.eligible).toBe(false);
      expect(data.failedSubjects).toContain(`Math-${uid}`);
      expect(data.ineligibilityReasons.some((r: string) => r.includes("Failed in"))).toBe(true);
    });

    it("should flag student with low attendance (< 75%) as ineligible", async () => {
      const res = await request(app)
        .get(`/api/v1/academic/promote/evaluate/${studentFailingAttendanceId}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.eligible).toBe(false);
      expect(data.attendancePercentage).toBe(50.0);
      expect(data.ineligibilityReasons.some((r: string) => r.includes("Attendance (50%)"))).toBe(true);
    });
  });

  describe("POST /api/v1/academic/promote (Batch Execution)", () => {
    it("should promote eligible students while retaining ineligible students without force flag", async () => {
      const res = await request(app)
        .post("/api/v1/academic/promote")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          studentIds: [studentPassingId, studentFailingMarksId, studentFailingAttendanceId],
          targetClassId: class2AId,
          targetSectionId: section2AId,
          remarks: "Annual General Promotion 2026"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalRequested).toBe(3);
      expect(res.body.promotedCount).toBe(1);
      expect(res.body.retainedCount).toBe(2);

      // Verify DB state: Student 1 sectionId updated to section2AId
      const checkStudent1 = await prisma.student.findUnique({ where: { id: studentPassingId } });
      expect(checkStudent1?.sectionId).toBe(section2AId);

      // Verify DB state: Students 2 & 3 sectionId remains in Section 1A
      const checkStudent2 = await prisma.student.findUnique({ where: { id: studentFailingMarksId } });
      expect(checkStudent2?.sectionId).toBe(section1AId);

      const checkStudent3 = await prisma.student.findUnique({ where: { id: studentFailingAttendanceId } });
      expect(checkStudent3?.sectionId).toBe(section1AId);

      // Verify StudentTimeline record created for Student 1
      const timeline = await prisma.studentTimeline.findFirst({
        where: { studentId: studentPassingId, type: "PROMOTION" }
      });
      expect(timeline).not.toBeNull();
      expect(timeline?.title).toContain(`Class 2-${uid} - Section-2A`);
      expect(timeline?.description).toContain("Annual General Promotion 2026");
    });

    it("should allow condoned/forced promotion when force: true is specified", async () => {
      const res = await request(app)
        .post("/api/v1/academic/promote")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          studentIds: [studentFailingMarksId],
          targetClassId: class2AId,
          targetSectionId: section2AId,
          force: true,
          remarks: "Principal condoned promotion on probation"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.promotedCount).toBe(1);
      expect(res.body.retainedCount).toBe(0);

      // Verify DB state updated
      const checkStudent2 = await prisma.student.findUnique({ where: { id: studentFailingMarksId } });
      expect(checkStudent2?.sectionId).toBe(section2AId);

      // Verify timeline record notes condoned promotion
      const timeline = await prisma.studentTimeline.findFirst({
        where: { studentId: studentFailingMarksId, type: "PROMOTION" }
      });
      expect(timeline).not.toBeNull();
      expect(timeline?.description).toContain("[CONDONED/FORCED PROMOTION]");
    });

    it("should reject promotion if destination section belongs to another school", async () => {
      const res = await request(app)
        .post("/api/v1/academic/promote")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          studentIds: [studentPassingId],
          targetClassId: schoolBClassId,
          targetSectionId: schoolBSectionId
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Destination section or class not found in this school");
    });

    it("should reject promotion if requested student belongs to another school", async () => {
      const res = await request(app)
        .post("/api/v1/academic/promote")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          studentIds: [studentSchoolBId], // School B student
          targetClassId: class2AId,
          targetSectionId: section2AId
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("One or more students were not found in this school");
    });
  });
});

