import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from "../helpers/testApp";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Academic Timetable Collision Detection and Isolation", () => {
  const uid = Math.random().toString(36).substring(2, 7);

  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;

  let sessionAId: string;
  let classAId: string;
  let sectionA1Id: string;
  let sectionA2Id: string;

  let teacherA1Id: string;
  let teacherA2Id: string;
  let subjectA1Id: string;
  let subjectA2Id: string;

  let assignmentA1Sec1Id: string;
  let assignmentA1Sec2Id: string;
  let assignmentA2Sec2Id: string;
  let assignmentSchoolBId: string;

  beforeAll(async () => {
    // 1. Schools
    const schoolA = await createTestSchool(`Timetable School A ${uid}`);
    const schoolB = await createTestSchool(`Timetable School B ${uid}`);
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    // 2. Admin User
    const adminA = await createTestUser(Role.ADMIN, schoolAId);
    adminAToken = adminA.token;

    // 3. Academic Session & Class
    const sessionA = await prisma.academicSession.create({
      data: {
        schoolId: schoolAId,
        name: `2026-TT-${uid}`,
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
        name: `Class 10-${uid}`
      }
    });
    classAId = classA.id;

    const sec1 = await prisma.section.create({
      data: { classId: classAId, name: "Section-A" }
    });
    sectionA1Id = sec1.id;

    const sec2 = await prisma.section.create({
      data: { classId: classAId, name: "Section-B" }
    });
    sectionA2Id = sec2.id;

    // 4. Teachers
    const tUser1 = await createTestUser(Role.TEACHER, schoolAId);
    const teacher1 = await prisma.teacher.create({
      data: {
        userId: tUser1.user.id,
        schoolId: schoolAId,
        employeeId: `EMP1-${uid}`
      }
    });
    teacherA1Id = teacher1.id;

    const tUser2 = await createTestUser(Role.TEACHER, schoolAId);
    const teacher2 = await prisma.teacher.create({
      data: {
        userId: tUser2.user.id,
        schoolId: schoolAId,
        employeeId: `EMP2-${uid}`
      }
    });
    teacherA2Id = teacher2.id;

    // 5. Subjects
    const sub1 = await prisma.subject.create({
      data: { schoolId: schoolAId, name: `Physics-${uid}`, code: "PHY" }
    });
    subjectA1Id = sub1.id;

    const sub2 = await prisma.subject.create({
      data: { schoolId: schoolAId, name: `Chemistry-${uid}`, code: "CHE" }
    });
    subjectA2Id = sub2.id;

    // 6. Teacher Subject Assignments
    const asgn1 = await prisma.teacherSubjectAssignment.create({
      data: {
        schoolId: schoolAId,
        academicSessionId: sessionAId,
        sectionId: sectionA1Id,
        subjectId: subjectA1Id,
        teacherId: teacherA1Id
      }
    });
    assignmentA1Sec1Id = asgn1.id;

    const asgn2 = await prisma.teacherSubjectAssignment.create({
      data: {
        schoolId: schoolAId,
        academicSessionId: sessionAId,
        sectionId: sectionA2Id,
        subjectId: subjectA1Id,
        teacherId: teacherA1Id // Same teacher teaching Sec 2
      }
    });
    assignmentA1Sec2Id = asgn2.id;

    const asgn3 = await prisma.teacherSubjectAssignment.create({
      data: {
        schoolId: schoolAId,
        academicSessionId: sessionAId,
        sectionId: sectionA2Id,
        subjectId: subjectA2Id,
        teacherId: teacherA2Id
      }
    });
    assignmentA2Sec2Id = asgn3.id;

    // School B assignment
    const sessionB = await prisma.academicSession.create({
      data: {
        schoolId: schoolBId,
        name: `2026-B-${uid}`,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31")
      }
    });
    const classB = await prisma.class.create({
      data: { schoolId: schoolBId, sessionId: sessionB.id, name: `Class B-${uid}` }
    });
    const secB = await prisma.section.create({
      data: { classId: classB.id, name: "Sec-B" }
    });
    const tUserB = await createTestUser(Role.TEACHER, schoolBId);
    const teacherB = await prisma.teacher.create({
      data: { userId: tUserB.user.id, schoolId: schoolBId, employeeId: `EMPB-${uid}` }
    });
    const subB = await prisma.subject.create({
      data: { schoolId: schoolBId, name: "Bio", code: "BIO" }
    });
    const asgnB = await prisma.teacherSubjectAssignment.create({
      data: {
        schoolId: schoolBId,
        academicSessionId: sessionB.id,
        sectionId: secB.id,
        subjectId: subB.id,
        teacherId: teacherB.id
      }
    });
    assignmentSchoolBId = asgnB.id;
  });

  afterAll(async () => {
    try {
      await prisma.timetableSlot.deleteMany({
        where: { timetable: { schoolId: { in: [schoolAId, schoolBId] } } }
      });
      await prisma.timetable.deleteMany({
        where: { schoolId: { in: [schoolAId, schoolBId] } }
      });
    } catch {
      // ignore cleanup errors
    }
  });

  it("should reject slots where startTime does not precede endTime", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA1Id,
        day: "MONDAY",
        slots: [
          {
            period: 1,
            teacherSubjectAssignmentId: assignmentA1Sec1Id,
            startTime: "10:00",
            endTime: "09:00" // Invalid: end < start
          }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("INVALID_TIME");
  });

  it("should reject duplicate period numbers within the same section timetable request", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA1Id,
        day: "MONDAY",
        slots: [
          {
            period: 1,
            teacherSubjectAssignmentId: assignmentA1Sec1Id,
            startTime: "09:00",
            endTime: "09:45"
          },
          {
            period: 1, // Duplicate period 1
            teacherSubjectAssignmentId: assignmentA1Sec1Id,
            startTime: "09:50",
            endTime: "10:35"
          }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("SECTION_COLLISION");
  });

  it("should reject time overlaps within the same section request", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA1Id,
        day: "MONDAY",
        slots: [
          {
            period: 1,
            teacherSubjectAssignmentId: assignmentA1Sec1Id,
            startTime: "09:00",
            endTime: "10:00"
          },
          {
            period: 2,
            teacherSubjectAssignmentId: assignmentA1Sec1Id,
            startTime: "09:45", // Overlaps with 09:00-10:00
            endTime: "10:30"
          }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("SECTION_COLLISION");
  });

  it("should successfully save a valid timetable for Section A1", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA1Id,
        day: "MONDAY",
        slots: [
          {
            period: 1,
            teacherSubjectAssignmentId: assignmentA1Sec1Id,
            startTime: "09:00",
            endTime: "09:45"
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slots).toHaveLength(1);
    expect(res.body.data.slots[0].period).toBe(1);
  });

  it("should prevent teacher double-booking when the same teacher is scheduled in Section A2 at the same period", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA2Id,
        day: "MONDAY",
        slots: [
          {
            period: 1, // teacherA1 is already in Section A1 during period 1!
            teacherSubjectAssignmentId: assignmentA1Sec2Id,
            startTime: "09:00",
            endTime: "09:45"
          }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("TEACHER_COLLISION");
    expect(res.body.error).toContain("Collision: Teacher");
  });

  it("should prevent teacher double-booking when times overlap even if period number differs", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA2Id,
        day: "MONDAY",
        slots: [
          {
            period: 2, // Period 2, but time 09:30-10:15 overlaps Section A1 (09:00-09:45)
            teacherSubjectAssignmentId: assignmentA1Sec2Id,
            startTime: "09:30",
            endTime: "10:15"
          }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("TEACHER_COLLISION");
  });

  it("should allow scheduling different teacher in Section A2 during the same time slot", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA2Id,
        day: "MONDAY",
        slots: [
          {
            period: 1,
            teacherSubjectAssignmentId: assignmentA2Sec2Id, // teacherA2 (different teacher)
            startTime: "09:00",
            endTime: "09:45"
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slots).toHaveLength(1);
  });

  it("should reject cross-tenant teacher assignment from another school", async () => {
    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        sectionId: sectionA1Id,
        day: "TUESDAY",
        slots: [
          {
            period: 1,
            teacherSubjectAssignmentId: assignmentSchoolBId, // School B assignment!
            startTime: "09:00",
            endTime: "09:45"
          }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("CROSS_TENANT_VIOLATION");
  });
});

