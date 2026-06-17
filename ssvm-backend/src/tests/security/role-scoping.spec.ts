import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../index";
import prisma from "../../lib/prisma";
import { generateAccessToken } from "../../lib/tokens";

process.env.SKIP_TRUNCATE = "true";

describe("Domain-Specific Role Guards", () => {
  let schoolId: string;
  
  let websiteAdminToken: string;
  let accountantToken: string;
  let erpAdminToken: string;

  let studentId: string;

  beforeAll(async () => {
    const runId = Date.now().toString().slice(-6);

    const school = await prisma.school.create({
      data: {
        name: `Role Scope School ${runId}`,
        email: `admin@rolescope${runId}.com`,
        phone: "1234567890",
        address: "Test",
        website: `rolescope${runId}.example.com`,
        code: `R${runId}`
      }
    });
    schoolId = school.id;

    // Create WEBSITE_ADMIN
    const webAdmin = await prisma.user.create({
      data: {
        email: `webadmin${runId}@test.com`,
        passwordHash: "test",
        name: "Web Admin",
        role: "WEBSITE_ADMIN",
        schoolId,
        isActive: true,
      }
    });
    websiteAdminToken = generateAccessToken({ userId: webAdmin.id, email: webAdmin.email, name: webAdmin.name, role: "WEBSITE_ADMIN", schoolId, branchId: null, sid: "test", impersonated: false }).token;

    // Create ACCOUNTANT
    const accountant = await prisma.user.create({
      data: {
        email: `accountant${runId}@test.com`,
        passwordHash: "test",
        name: "Accountant",
        role: "ACCOUNTANT",
        schoolId,
        isActive: true,
      }
    });
    accountantToken = generateAccessToken({ userId: accountant.id, email: accountant.email, name: accountant.name, role: "ACCOUNTANT", schoolId, branchId: null, sid: "test", impersonated: false }).token;

    // Create ERP_ADMIN
    const erpAdmin = await prisma.user.create({
      data: {
        email: `erpadmin${runId}@test.com`,
        passwordHash: "test",
        name: "ERP Admin",
        role: "ERP_ADMIN",
        schoolId,
        isActive: true,
      }
    });
    erpAdminToken = generateAccessToken({ userId: erpAdmin.id, email: erpAdmin.email, name: erpAdmin.name, role: "ERP_ADMIN", schoolId, branchId: null, sid: "test", impersonated: false }).token;

    // Create a student for invoice testing
    const studentUser = await prisma.user.create({
      data: {
        email: `student${runId}@test.com`,
        passwordHash: "test",
        name: "Test Student",
        role: "STUDENT",
        schoolId,
        isActive: true,
      }
    });
    
    // Setup class/section
    const session = await prisma.academicSession.create({ data: { schoolId, name: `2025-${runId}`, startDate: new Date(), endDate: new Date(), isCurrent: true } });
    const classRecord = await prisma.class.create({ data: { schoolId, sessionId: session.id, name: `10-${runId}`, sortOrder: 10 } });
    const sectionRecord = await prisma.section.create({ data: { classId: classRecord.id, name: "A", capacity: 30 } });
    
    const student = await prisma.student.create({
      data: {
        userId: studentUser.id,
        schoolId,
        sectionId: sectionRecord.id,
        rollNo: "R1",
        admissionNo: `A${runId}`,
        name: "Test Student",
        address: "Test",
        dob: new Date(),
        gender: "Male"
      }
    });
    studentId = student.id;
  });

  afterAll(async () => {
    await prisma.school.delete({ where: { id: schoolId } }).catch(() => {});
  });

  it("WEBSITE_ADMIN fails when accessing POST /api/v1/invoices (403)", async () => {
    const res = await request(app)
      .post("/api/v1/invoices")
      .set("Cookie", [`access_token=${websiteAdminToken}`])
      .send({
        studentId,
        amount: 1000,
        type: "MONTHLY",
        dueDate: new Date().toISOString(),
      });
    expect(res.status).toBe(403);
  });

  it("WEBSITE_ADMIN fails when accessing GET /api/v1/hr/salaries (403)", async () => {
    const res = await request(app)
      .get("/api/v1/hr/salaries")
      .set("Cookie", [`access_token=${websiteAdminToken}`]);
    expect(res.status).toBe(403);
  });

  it("WEBSITE_ADMIN succeeds when accessing POST /api/v1/notices (201)", async () => {
    const res = await request(app)
      .post("/api/v1/notices")
      .set("Cookie", [`access_token=${websiteAdminToken}`])
      .send({
        title: "Test Notice",
        content: "Test Content",
        category: "General",
        status: "DRAFT"
      });
    expect(res.status).toBe(201);
  });

  it("ACCOUNTANT succeeds when accessing POST /api/v1/invoices (201)", async () => {
    const res = await request(app)
      .post("/api/v1/invoices")
      .set("Cookie", [`access_token=${accountantToken}`])
      .send({
        studentId,
        amount: 1000,
        type: "MONTHLY",
        dueDate: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
  });

  it("ACCOUNTANT fails when accessing POST /api/v1/notices (403)", async () => {
    const res = await request(app)
      .post("/api/v1/notices")
      .set("Cookie", [`access_token=${accountantToken}`])
      .send({
        title: "Accountant Notice",
        content: "Should Fail",
        category: "General"
      });
    expect(res.status).toBe(403);
  });

  it("ERP_ADMIN succeeds on both (201)", async () => {
    const noticeRes = await request(app)
      .post("/api/v1/notices")
      .set("Cookie", [`access_token=${erpAdminToken}`])
      .send({
        title: "ERP Notice",
        content: "Test",
        category: "General"
      });
    expect(noticeRes.status).toBe(201);

    const invoiceRes = await request(app)
      .post("/api/v1/invoices")
      .set("Cookie", [`access_token=${erpAdminToken}`])
      .send({
        studentId,
        amount: 500,
        type: "MISCELLANEOUS",
        dueDate: new Date().toISOString(),
      });
    expect(invoiceRes.status).toBe(201);
  });
});
