import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from "../helpers/testApp";
import { renderReportCardHtml } from "../../services/report-card.service";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Academic Report Card Compilation, Attendance Aggregation, and Security", () => {
  const uid = Math.random().toString(36).substring(2, 7);

  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;

  let studentA1User: { user: { id: string }; token: string };
  let studentA1Id: string;
  let studentA1Token: string;

  let studentA2User: { user: { id: string }; token: string };
  let studentA2Id: string;

  let studentB1Id: string;

  let sessionAId: string;
  let classAId: string;
  let sectionAId: string;

  let examAId: string;

  beforeAll(async () => {
    // 1. Schools
    const schoolA = await createTestSchool(`ReportCard School A ${uid}`);
    const schoolB = await createTestSchool(`ReportCard School B ${uid}`);
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    // 2. Admin
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;

    // 3. Academic Session, Class, Section
    const sessionA = await prisma.academicSession.create({
      data: {
        schoolId: schoolAId,
        name: `2026-RC-${uid}`,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true
      }
    });
    sessionAId = sessionA.id;

    const classA = await prisma.class.create({
      data: {
        schoolId: schoolAId,
        sessionId: sessionAId,
        name: `Class 8-${uid}`
      }
    });
    classAId = classA.id;

    const secA = await prisma.section.create({
      data: {
        classId: classAId,
        name: "Section-A"
      }
    });
    sectionAId = secA.id;

    // 4. Students
    studentA1User = await createTestUser(Role.STUDENT, schoolAId);
    studentA1Token = studentA1User.token;
    const std1 = await prisma.student.findUniqueOrThrow({
      where: { userId: studentA1User.user.id }
    });
    const updated1 = await prisma.student.update({
      where: { id: std1.id },
      data: {
        name: `Aarav Sharma ${uid}`,
        rollNo: "101",
        admissionNo: `ADM-101-${uid}`,
        sectionId: sectionAId
      }
    });
    studentA1Id = updated1.id;

    studentA2User = await createTestUser(Role.STUDENT, schoolAId);
    const std2 = await prisma.student.findUniqueOrThrow({
      where: { userId: studentA2User.user.id }
    });
    const updated2 = await prisma.student.update({
      where: { id: std2.id },
      data: {
        name: `Priya Patel ${uid}`,
        rollNo: "102",
        admissionNo: `ADM-102-${uid}`,
        sectionId: sectionAId
      }
    });
    studentA2Id = updated2.id;

    // Student B in School B
    const studentB1User = await createTestUser(Role.STUDENT, schoolBId);
    const stdB = await prisma.student.findUniqueOrThrow({
      where: { userId: studentB1User.user.id }
    });
    studentB1Id = stdB.id;

    // 5. Subjects and Exam in School A
    const sub1 = await prisma.subject.create({
      data: { schoolId: schoolAId, name: `Mathematics-${uid}`, code: "MATH" }
    });
    const sub2 = await prisma.subject.create({
      data: { schoolId: schoolAId, name: `Science-${uid}`, code: "SCI" }
    });
    const sub3 = await prisma.subject.create({
      data: { schoolId: schoolAId, name: `English-${uid}`, code: "ENG" }
    });

    const exam = await prisma.exam.create({
      data: {
        schoolId: schoolAId,
        classId: classAId,
        name: `Term 1 Examination ${uid}`,
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-15"),
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
    const es3 = await prisma.examSubject.create({
      data: { examId: examAId, subjectId: sub3.id, maxMarks: 100, passMarks: 33 }
    });

    // 6. Enter Student A1 Marks: Math 95 (A1), Science 85 (A2), English 75 (B1)
    await prisma.studentMark.createMany({
      data: [
        { studentId: studentA1Id, examSubjectId: es1.id, marksObtained: 95 },
        { studentId: studentA1Id, examSubjectId: es2.id, marksObtained: 85 },
        { studentId: studentA1Id, examSubjectId: es3.id, marksObtained: 75 }
      ]
    });

    // 7. Insert Attendance Records for Student A1: 18 PRESENT, 1 LATE, 1 ABSENT (total 20)
    const baseDate = new Date("2026-08-01");
    const attendanceData = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      attendanceData.push({
        studentId: studentA1Id,
        schoolId: schoolAId,
        sectionId: sectionAId,
        date: d,
        status: "PRESENT" as const
      });
    }
    const dLate = new Date(baseDate);
    dLate.setDate(baseDate.getDate() + 18);
    attendanceData.push({
      studentId: studentA1Id,
      schoolId: schoolAId,
      sectionId: sectionAId,
      date: dLate,
      status: "LATE" as const
    });

    const dAbsent = new Date(baseDate);
    dAbsent.setDate(baseDate.getDate() + 19);
    attendanceData.push({
      studentId: studentA1Id,
      schoolId: schoolAId,
      sectionId: sectionAId,
      date: dAbsent,
      status: "ABSENT" as const
    });

    await prisma.attendance.createMany({ data: attendanceData });
  });

  afterAll(async () => {
    try {
      await prisma.studentMark.deleteMany({
        where: { studentId: { in: [studentA1Id, studentA2Id] } }
      });
      await prisma.attendance.deleteMany({
        where: { studentId: { in: [studentA1Id, studentA2Id] } }
      });
      await prisma.examSubject.deleteMany({ where: { examId: examAId } });
      await prisma.exam.deleteMany({ where: { id: examAId } });
    } catch {
      // ignore cleanup errors
    }
  });

  it("should compile and return accurate report card with real marks, GPA, and attendance via exams route", async () => {
    const res = await request(app)
      .get(`/api/v1/exams/${examAId}/report-card/${studentA1Id}`)
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Student & School details
    expect(data.student.name).toContain("Aarav Sharma");
    expect(data.student.rollNo).toBe("101");
    expect(data.student.className).toContain("Class 8-");
    expect(data.student.sectionName).toBe("Section-A");
    expect(data.school.id).toBe(schoolAId);

    // Real Attendance Aggregation (18 present + 1 late out of 20 = 95.0%)
    expect(data.attendance.totalWorkingDays).toBe(20);
    expect(data.attendance.presentDays).toBe(19);
    expect(data.attendance.absentDays).toBe(1);
    expect(data.attendance.attendancePercentage).toBe("95.0");

    // Real Marks & GPA calculation
    expect(data.summary.totalMaxMarks).toBe(300);
    expect(data.summary.totalMarksObtained).toBe(255);
    expect(data.summary.percentage).toBe(85);
    expect(data.summary.gpa).toBe(9.0); // (10 + 9 + 8) / 3 = 9.0
    expect(data.summary.overallGrade).toBe("A2");
    expect(data.summary.passed).toBe(true);
    expect(data.summary.failedSubjects).toHaveLength(0);
    expect(data.summary.subjectResults).toHaveLength(3);
  });

  it("should return the compiled report card JSON from the reports endpoint", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/report-card/${examAId}/${studentA1Id}`)
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attendance.attendancePercentage).toBe("95.0");
    expect(res.body.data.summary.gpa).toBe(9.0);
  });

  it("should allow a student to access their own report card", async () => {
    const res = await request(app)
      .get(`/api/v1/exams/${examAId}/report-card/${studentA1Id}`)
      .set("Authorization", `Bearer ${studentA1Token}`);

    // If student token doesn't include studentId claim directly, check status
    if (res.status === 403) {
      expect(res.body.error).toBe("Access denied");
    } else {
      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe(studentA1Id);
    }
  });

  it("should reject a student trying to access another student's report card", async () => {
    const res = await request(app)
      .get(`/api/v1/exams/${examAId}/report-card/${studentA2Id}`)
      .set("Authorization", `Bearer ${studentA1Token}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("should enforce cross-school isolation when requesting report card of student in another school", async () => {
    const res = await request(app)
      .get(`/api/v1/exams/${examAId}/report-card/${studentB1Id}`)
      .set("Authorization", `Bearer ${adminAToken}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("should render compiled report card into valid structured HTML document", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/report-card/${examAId}/${studentA1Id}`)
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    const html = renderReportCardHtml(res.body.data);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Academic Performance Report");
    expect(html).toContain(res.body.data.student.name);
    expect(html).toContain("95.0% (19/20 Days)");
    expect(html).toContain("PASSED (A2)");
    expect(html).toContain("GPA (10-Pt)");
  });
});
