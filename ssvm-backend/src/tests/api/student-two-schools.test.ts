import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma } from "../helpers/testApp";
import { hashPassword, signToken } from "../../middleware/auth";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Student user linking and two-schools isolation", () => {
  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;
  let adminBToken: string;
  let sectionAId: string;
  let sectionBId: string;

  beforeAll(async () => {
    const uid = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    // Create School A
    const schoolA = await prisma.school.create({
      data: {
        name: `School A ${uid}`,
        code: `SCHA_${uid}`,
        status: "ACTIVE",
        tenantState: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    // Create School B
    const schoolB = await prisma.school.create({
      data: {
        name: `School B ${uid}`,
        code: `SCHB_${uid}`,
        status: "ACTIVE",
        tenantState: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    // Admin for School A
    const adminA = await prisma.user.create({
      data: {
        email: `admin_a_${uid}@test.school`,
        name: "Admin A",
        passwordHash: await hashPassword("AdminA@123"),
        role: Role.ERP_ADMIN,
        schoolId: schoolAId,
        isActive: true,
      },
    });
    adminAToken = signToken({
      userId: adminA.id,
      email: adminA.email,
      name: adminA.name,
      role: adminA.role,
      schoolId: schoolAId,
    });

    // Admin for School B
    const adminB = await prisma.user.create({
      data: {
        email: `admin_b_${uid}@test.school`,
        name: "Admin B",
        passwordHash: await hashPassword("AdminB@123"),
        role: Role.ERP_ADMIN,
        schoolId: schoolBId,
        isActive: true,
      },
    });
    adminBToken = signToken({
      userId: adminB.id,
      email: adminB.email,
      name: adminB.name,
      role: adminB.role,
      schoolId: schoolBId,
    });

    // Sections for School A & B
    const academicA = await prisma.academicSession.create({
      data: {
        name: `2026-A-${uid}`,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        isCurrent: true,
        schoolId: schoolAId,
      },
    });
    const classA = await prisma.class.create({
      data: { name: `Grade 10 A ${uid}`, schoolId: schoolAId, sessionId: academicA.id },
    });
    const secA = await prisma.section.create({
      data: { name: "A", classId: classA.id },
    });
    sectionAId = secA.id;

    const academicB = await prisma.academicSession.create({
      data: {
        name: `2026-B-${uid}`,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        isCurrent: true,
        schoolId: schoolBId,
      },
    });
    const classB = await prisma.class.create({
      data: { name: `Grade 10 B ${uid}`, schoolId: schoolBId, sessionId: academicB.id },
    });
    const secB = await prisma.section.create({
      data: { name: "A", classId: classB.id },
    });
    sectionBId = secB.id;
  });

  afterAll(async () => {
    if (schoolAId) {
      await prisma.student.deleteMany({ where: { schoolId: schoolAId } });
      await prisma.user.deleteMany({ where: { schoolId: schoolAId } });
      await prisma.section.deleteMany({ where: { class: { schoolId: schoolAId } } });
      await prisma.class.deleteMany({ where: { schoolId: schoolAId } });
      await prisma.academicSession.deleteMany({ where: { schoolId: schoolAId } });
      await prisma.school.deleteMany({ where: { id: schoolAId } });
    }
    if (schoolBId) {
      await prisma.student.deleteMany({ where: { schoolId: schoolBId } });
      await prisma.user.deleteMany({ where: { schoolId: schoolBId } });
      await prisma.section.deleteMany({ where: { class: { schoolId: schoolBId } } });
      await prisma.class.deleteMany({ where: { schoolId: schoolBId } });
      await prisma.academicSession.deleteMany({ where: { schoolId: schoolBId } });
      await prisma.school.deleteMany({ where: { id: schoolBId } });
    }
  });

  it("creates students in two schools with identical admissionNo without collision, linking scoped User", async () => {
    const admissionNo = `SAME_ADM_${Date.now().toString(36)}`;

    // Create student in School A
    const resA = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        name: "Student Alpha",
        rollNo: "101",
        admissionNo,
        password: "StudentPassword@123",
        sectionId: sectionAId,
      });

    expect(resA.status).toBe(201);
    expect(resA.body.success).toBe(true);
    const studentA = resA.body.data;
    expect(studentA.userId).toBeDefined();

    // Verify linked User A
    const userA = await prisma.user.findUnique({ where: { id: studentA.userId } });
    expect(userA).not.toBeNull();
    expect(userA!.schoolId).toBe(schoolAId);
    expect(userA!.role).toBe("STUDENT");

    // Create student in School B with the EXACT SAME admissionNo
    const resB = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${adminBToken}`)
      .send({
        name: "Student Beta",
        rollNo: "101",
        admissionNo,
        password: "StudentPassword@456",
        sectionId: sectionBId,
      });

    expect(resB.status).toBe(201);
    expect(resB.body.success).toBe(true);
    const studentB = resB.body.data;
    expect(studentB.userId).toBeDefined();
    expect(studentB.userId).not.toBe(studentA.userId);

    // Verify linked User B
    const userB = await prisma.user.findUnique({ where: { id: studentB.userId } });
    expect(userB).not.toBeNull();
    expect(userB!.schoolId).toBe(schoolBId);
    expect(userB!.role).toBe("STUDENT");

    // Test student A login
    const loginResA = await request(app)
      .post("/api/v1/auth/student/login")
      .send({
        admissionNo,
        dob: "StudentPassword@123", // used as password field in student login
        schoolCode: (await prisma.school.findUnique({ where: { id: schoolAId } }))!.code,
      });

    expect(loginResA.status).toBe(200);
    expect(loginResA.body.success).toBe(true);
    expect(loginResA.body.data.user.id).toBe(studentA.id);

    // Test student B login
    const loginResB = await request(app)
      .post("/api/v1/auth/student/login")
      .send({
        admissionNo,
        dob: "StudentPassword@456",
        schoolCode: (await prisma.school.findUnique({ where: { id: schoolBId } }))!.code,
      });

    expect(loginResB.status).toBe(200);
    expect(loginResB.body.success).toBe(true);
    expect(loginResB.body.data.user.id).toBe(studentB.id);
  });

  it("rejects student login if the Student record has no linked userId (no on-the-fly User creation)", async () => {
    const unlinkedAdm = `UNLINKED_${Date.now().toString(36)}`;
    const studentUnlinked = await prisma.student.create({
      data: {
        name: "Unlinked Student",
        rollNo: "99",
        admissionNo: unlinkedAdm,
        password: await hashPassword("Unlinked@123"),
        schoolId: schoolAId,
        sectionId: sectionAId,
        userId: null,
      },
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/student/login")
      .send({
        admissionNo: unlinkedAdm,
        dob: "Unlinked@123",
        schoolCode: (await prisma.school.findUnique({ where: { id: schoolAId } }))!.code,
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.error).toMatch(/not linked/i);

    // Verify NO user was created on the fly
    const user = await prisma.user.findFirst({
      where: {
        schoolId: schoolAId,
        email: { contains: unlinkedAdm.toLowerCase() },
      },
    });
    expect(user).toBeNull();
  });

  it("rejects student login when using wrong school code", async () => {
    const admissionNo = `WRONGSCH_${Date.now().toString(36)}`;
    const studentUser = await prisma.user.create({
      data: {
        email: `student_ws_${Date.now()}@test.school`,
        name: "Student WS",
        passwordHash: await hashPassword("ValidPass@123"),
        role: Role.STUDENT,
        schoolId: schoolAId,
        isActive: true,
      },
    });

    await prisma.student.create({
      data: {
        name: "Student WS",
        rollNo: "102",
        admissionNo,
        password: await hashPassword("ValidPass@123"),
        schoolId: schoolAId,
        sectionId: sectionAId,
        userId: studentUser.id,
      },
    });

    // Attempt login with School B's code instead of School A
    const loginRes = await request(app)
      .post("/api/v1/auth/student/login")
      .send({
        admissionNo,
        dob: "ValidPass@123",
        schoolCode: (await prisma.school.findUnique({ where: { id: schoolBId } }))!.code,
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
  });

  it("rejects student login when user passwordHash is empty string", async () => {
    const admissionNo = `EMPTYHASH_${Date.now().toString(36)}`;
    const studentUser = await prisma.user.create({
      data: {
        email: `student_eh_${Date.now()}@test.school`,
        name: "Student EH",
        passwordHash: "",
        role: Role.STUDENT,
        schoolId: schoolAId,
        isActive: true,
      },
    });

    await prisma.student.create({
      data: {
        name: "Student EH",
        rollNo: "103",
        admissionNo,
        password: "",
        schoolId: schoolAId,
        sectionId: sectionAId,
        userId: studentUser.id,
      },
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/student/login")
      .send({
        admissionNo,
        dob: "AnyPassword@123",
        schoolCode: (await prisma.school.findUnique({ where: { id: schoolAId } }))!.code,
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
  });
});
