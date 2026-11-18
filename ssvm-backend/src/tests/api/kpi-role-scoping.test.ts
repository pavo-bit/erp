import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp, getTestPrisma, createTestSchool, createTestUser } from "../helpers/testApp";
import { Role } from "@prisma/client";

describe("K4 — Role-Scoped KPIs & Cross-User Security", () => {
  let app: any;
  let prisma: ReturnType<typeof getTestPrisma>;
  let schoolA: any;
  let teacherUser: any;
  let teacherToken: string;
  let studentUser: any;
  let studentToken: string;
  let parentUser: any;
  let parentToken: string;

  beforeAll(async () => {
    app = createTestApp();
    prisma = getTestPrisma();
    schoolA = await createTestSchool();

    // 1. Create Teacher
    const teacherData = await createTestUser(Role.TEACHER, schoolA.id);
    teacherUser = teacherData.user;
    teacherToken = teacherData.token;

    // Create Teacher model record
    await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        schoolId: schoolA.id,
        isActive: true,
      },
    });

    // 2. Create Student
    const studentData = await createTestUser(Role.STUDENT, schoolA.id);
    studentUser = studentData.user;
    studentToken = studentData.token;

    // 3. Create Parent
    const parentData = await createTestUser(Role.PARENT, schoolA.id);
    parentUser = parentData.user;
    parentToken = parentData.token;

    const guardian = await prisma.guardian.create({
      data: {
        userId: parentUser.id,
        schoolId: schoolA.id,
        primaryName: parentUser.name,
        primaryPhone: "9876543210",
      },
    });

    const studentRecord = await prisma.student.findFirst({
      where: { userId: studentUser.id },
    });

    if (studentRecord) {
      await prisma.studentGuardian.create({
        data: {
          schoolId: schoolA.id,
          studentId: studentRecord.id,
          guardianId: guardian.id,
          relationship: "FATHER",
        },
      });
    }
  });

  afterAll(async () => {
    // cleanup
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Authentication & Cross-User Denial Guards
  // ───────────────────────────────────────────────────────────────────────────

  it("denies unauthenticated access to /kpi/teacher, /kpi/student, and /kpi/parent with 401", async () => {
    const resTeacher = await request(app).get("/api/v1/kpi/teacher");
    expect(resTeacher.status).toBe(401);

    const resStudent = await request(app).get("/api/v1/kpi/student");
    expect(resStudent.status).toBe(401);

    const resParent = await request(app).get("/api/v1/kpi/parent");
    expect(resParent.status).toBe(401);
  });

  it("denies STUDENT access to /kpi/teacher with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/teacher")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("denies TEACHER access to /kpi/student with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/student")
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("denies TEACHER access to /kpi/parent with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/parent")
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("denies STUDENT access to /kpi/parent with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/parent")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Scoped Retrieval for Authorized Identities
  // ───────────────────────────────────────────────────────────────────────────

  it("allows TEACHER to retrieve their own scoped KPIs with 200 OK", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/teacher")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe("TEACHER");
    expect(res.body.userId).toBe(teacherUser.id);
    expect(Array.isArray(res.body.data)).toBe(true);

    const kpiIds = res.body.data.map((k: any) => k.id);
    expect(kpiIds).toContain("kpi_teacher_classes_count");
    expect(kpiIds).toContain("kpi_teacher_class_attendance_rate");
  });

  it("allows STUDENT to retrieve their own personal scoped KPIs with 200 OK", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/student")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe("STUDENT");
    expect(res.body.userId).toBeTruthy();
    expect(Array.isArray(res.body.data)).toBe(true);

    const kpiIds = res.body.data.map((k: any) => k.id);
    expect(kpiIds).toContain("kpi_student_own_attendance_rate");
    expect(kpiIds).toContain("kpi_student_own_fee_due");
    expect(kpiIds).toContain("kpi_student_own_average_marks");
  });

  it("allows PARENT to retrieve their own linked wards KPIs with 200 OK", async () => {
    const res = await request(app)
      .get("/api/v1/kpi/parent")
      .set("Authorization", `Bearer ${parentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe("PARENT");
    expect(res.body.userId).toBe(parentUser.id);
    expect(Array.isArray(res.body.data)).toBe(true);

    const kpiIds = res.body.data.map((k: any) => k.id);
    expect(kpiIds).toContain("kpi_parent_children_count");
    expect(kpiIds).toContain("kpi_parent_total_fee_due");
    expect(kpiIds).toContain("kpi_parent_average_children_attendance");
  });
});
