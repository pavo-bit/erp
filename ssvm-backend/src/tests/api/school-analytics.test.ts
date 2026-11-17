/**
 * ssvm-backend/src/tests/api/school-analytics.test.ts
 *
 * Block M6: School-Scoped Analytics API Verification Suite
 *
 * Requirements:
 *  - GET /api/v1/analytics/school/overview and /trends
 *  - Strict tenant transaction isolation: School A sees only School A data, School B sees only School B data.
 *  - Super Admin token returns 403 Forbidden.
 *  - Anonymous request returns 401 Unauthorized.
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser, getTestPrisma } from "../helpers/testApp";

describe("Block M6 — School-Scoped Analytics API Suite", { timeout: 30000 }, () => {
  const app = createTestApp();
  const db = getTestPrisma();

  let schoolAId: string;
  let schoolBId: string;
  let schoolAdminAToken: string;
  let schoolAdminBToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create School A
    const schoolA = await db.school.create({
      data: {
        code: `SCHA_${timestamp}`,
        name: `Analytics School A ${timestamp}`,
        email: `analytics_a_${timestamp}@test.com`,
        phone: "1111111111",
        status: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    // 2. Create School B
    const schoolB = await db.school.create({
      data: {
        code: `SCHB_${timestamp}`,
        name: `Analytics School B ${timestamp}`,
        email: `analytics_b_${timestamp}@test.com`,
        phone: "2222222222",
        status: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    // 3. Create Users
    const adminARes = await createTestUser(Role.ERP_ADMIN, schoolAId);
    schoolAdminAToken = adminARes.token;

    const adminBRes = await createTestUser(Role.ERP_ADMIN, schoolBId);
    schoolAdminBToken = adminBRes.token;

    const superAdminRes = await createTestUser(Role.SUPER_ADMIN);
    superAdminToken = superAdminRes.token;

    // 4. Seed School A: 3 students, attendance records, invoices
    const studentA1 = await db.student.create({
      data: {
        schoolId: schoolAId,
        rollNo: "A-01",
        name: "Student A1",
        gender: "Male",
        isActive: true,
      },
    });

    const studentA2 = await db.student.create({
      data: {
        schoolId: schoolAId,
        rollNo: "A-02",
        name: "Student A2",
        gender: "Female",
        isActive: true,
      },
    });

    await db.student.create({
      data: {
        schoolId: schoolAId,
        rollNo: "A-03",
        name: "Student A3",
        gender: "Male",
        isActive: false, // inactive student
      },
    });

    // School A attendance: 1 PRESENT, 1 ABSENT => 50%
    const today = new Date();
    await db.attendance.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA1.id,
        date: today,
        status: "PRESENT",
      },
    });

    await db.attendance.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA2.id,
        date: today,
        status: "ABSENT",
      },
    });

    // School A Invoices: 1 paid 1000, 1 overdue 500 (remaining 500, defaulter)
    await db.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA1.id,
        amount: 1000,
        amountPaid: 1000,
        remainingAmount: 0,
        status: "PAID",
        dueDate: new Date(Date.now() - 86400000),
      },
    });

    await db.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA2.id,
        amount: 500,
        amountPaid: 0,
        remainingAmount: 500,
        status: "OVERDUE",
        dueDate: new Date(Date.now() - 86400000),
      },
    });

    // 5. Seed School B: 1 student, 1 PRESENT attendance, 1 fully paid invoice
    const studentB1 = await db.student.create({
      data: {
        schoolId: schoolBId,
        rollNo: "B-01",
        name: "Student B1",
        gender: "Female",
        isActive: true,
      },
    });

    await db.attendance.create({
      data: {
        schoolId: schoolBId,
        studentId: studentB1.id,
        date: today,
        status: "PRESENT",
      },
    });

    await db.invoice.create({
      data: {
        schoolId: schoolBId,
        studentId: studentB1.id,
        amount: 3000,
        amountPaid: 3000,
        remainingAmount: 0,
        status: "PAID",
        dueDate: new Date(Date.now() - 86400000),
      },
    });
  });

  it("rejects unauthenticated requests with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/analytics/school/overview");
    expect(res.status).toBe(401);
  });

  it("strictly forbids Super Admin tokens on /school/overview with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/school/overview")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("FORBIDDEN_PLATFORM_ROLE");
  });

  it("strictly forbids Super Admin tokens on /school/trends with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/school/trends")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("FORBIDDEN_PLATFORM_ROLE");
  });

  it("returns isolated School A analytics overview to School A admin", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/school/overview")
      .set("Authorization", `Bearer ${schoolAdminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { enrolment, attendance, finances, defaulters } = res.body.data;

    // School A enrolment: 3 total, 2 active, 1 inactive, 2 male, 1 female
    expect(enrolment.total).toBe(3);
    expect(enrolment.active).toBe(2);
    expect(enrolment.inactive).toBe(1);
    expect(enrolment.gender.male).toBe(2);
    expect(enrolment.gender.female).toBe(1);

    // School A attendance: 1 present / 2 total = 50%
    expect(attendance.overallRate).toBe(50);
    expect(attendance.totalRecords).toBe(2);
    expect(attendance.presentRecords).toBe(1);

    // School A finances: totalBilled: 1500, totalCollected: 1000, totalDue: 500
    expect(finances.totalBilled).toBe(1500);
    expect(finances.totalCollected).toBe(1000);
    expect(finances.totalDue).toBe(500);

    // School A defaulters: 1 student (Student A2)
    expect(defaulters.count).toBe(1);
  });

  it("returns isolated School B analytics overview to School B admin", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/school/overview")
      .set("Authorization", `Bearer ${schoolAdminBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { enrolment, attendance, finances, defaulters } = res.body.data;

    // School B enrolment: 1 total, 1 active, 0 inactive, 1 female
    expect(enrolment.total).toBe(1);
    expect(enrolment.active).toBe(1);
    expect(enrolment.inactive).toBe(0);
    expect(enrolment.gender.female).toBe(1);

    // School B attendance: 1 present / 1 total = 100%
    expect(attendance.overallRate).toBe(100);
    expect(attendance.totalRecords).toBe(1);
    expect(attendance.presentRecords).toBe(1);

    // School B finances: totalBilled: 3000, totalCollected: 3000, totalDue: 0
    expect(finances.totalBilled).toBe(3000);
    expect(finances.totalCollected).toBe(3000);
    expect(finances.totalDue).toBe(0);

    // School B defaulters: 0
    expect(defaulters.count).toBe(0);
  });

  it("returns 6-month monthly trends for School A admin", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/school/trends")
      .set("Authorization", `Bearer ${schoolAdminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(6);

    const latestMonth = res.body.data[res.body.data.length - 1];
    expect(latestMonth).toHaveProperty("month");
    expect(latestMonth.enrolment).toBe(3);
    expect(latestMonth.attendanceRate).toBe(50);
    expect(latestMonth.feeBilled).toBe(1500);
    expect(latestMonth.feeCollected).toBe(1000);
    expect(latestMonth.feeDue).toBe(500);
    expect(latestMonth.defaulters).toBe(1);
  });
});
