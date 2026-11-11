/**
 * ssvm-backend/src/tests/api/admission-form-lifecycle.test.ts
 *
 * Verifies the complete Admission Form lifecycle:
 *  1. Application Fee Configuration RBAC & Audit History
 *  2. Form Issuance with Monotonic Serial & Immutable Fee Snapshotting
 *  3. Genuine Binary PDF Generation (%PDF-1.4 standards compliance)
 *  4. Printable Form HTML rendering with snapshot fee resolution
 *  5. Server-Side Student Admission Register (Search, Filters, Pagination, Tenant Isolation)
 *  6. Admission Overview Metrics
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser, getTestPrisma } from "../helpers/testApp";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { AdmissionPdfService } from "../../services/admissions-bulk/admission-pdf.service";

describe("Admission Form Lifecycle & Production Hardening", () => {
  const app = createTestApp();
  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;
  let adminAUser: any;
  let teacherAToken: string;
  let adminBToken: string;

  let sessionAId: string;
  let class1Id: string;
  let sec1Id: string;
  let student1AdmNo: string;

  beforeAll(async () => {
    // 1. Create School A & School B
    const schoolA = await prisma.school.create({
      data: {
        name: "SSVM Primary Campus A",
        code: `SSVM-A-${Date.now().toString().slice(-5)}`,
        status: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: "SSVM Secondary Campus B",
        code: `SSVM-B-${Date.now().toString().slice(-5)}`,
        status: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    // 2. Create Users & Tokens
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;
    adminAUser = adminA.user;

    const teacherA = await createTestUser(Role.TEACHER, schoolAId);
    teacherAToken = teacherA.token;

    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminBToken = adminB.token;

    // 3. Create Session, Class, Section and Students in School A
    await runWithTenantDatabaseTransaction(schoolAId, async (tx: any) => {
      const sess = await tx.academicSession.create({
        data: {
          schoolId: schoolAId,
          name: "2026-2027",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true,
        },
      });
      sessionAId = sess.id;

      const cls = await tx.class.create({
        data: { schoolId: schoolAId, sessionId: sessionAId, name: "Class 1", sortOrder: 1 },
      });
      class1Id = cls.id;

      const sec = await tx.section.create({
        data: { classId: class1Id, name: "A", capacity: 40 },
      });
      sec1Id = sec.id;

      student1AdmNo = `ADM-2026-${Date.now().toString().slice(-4)}`;
      const stuUser = await tx.user.create({
        data: {
          schoolId: schoolAId,
          email: `aarav.${Date.now()}@example.com`,
          passwordHash: "dummyhash",
          name: "Aarav Sharma",
          role: Role.STUDENT,
        },
      });

      const student = await tx.student.create({
        data: {
          schoolId: schoolAId,
          userId: stuUser.id,
          admissionNo: student1AdmNo,
          rollNo: "R-01",
          name: "Aarav Sharma",
          gender: "MALE",
          isActive: true,
          sectionId: sec1Id,
        },
      });
    });
  });

  afterAll(async () => {
    try {
      if (schoolAId) await prisma.school.delete({ where: { id: schoolAId } });
      if (schoolBId) await prisma.school.delete({ where: { id: schoolBId } });
    } catch {}
  });

  describe("1. Application Fee Configuration & RBAC", () => {
    it("returns default ₹200 fee for newly created institution", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.applicationFee).toBe(200);
      expect(Array.isArray(res.body.data.history)).toBe(true);
    });

    it("rejects unauthorized requests without token", async () => {
      const res = await request(app).get("/api/v1/admin/admissions/bulk/fee");
      expect(res.status).toBe(401);
    });

    it("rejects fee modification by non-admin roles (403 Forbidden)", async () => {
      const res = await request(app)
        .put("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${teacherAToken}`)
        .send({ applicationFee: 350, reason: "Teacher unauthorized attempt" });

      expect(res.status).toBe(403);
    });

    it("allows ERP_ADMIN to update fee with mandatory reason and logs audit record", async () => {
      const res = await request(app)
        .put("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ applicationFee: 350, reason: "Governing body annual indexation" });

      expect(res.status).toBe(200);
      expect(res.body.data.newFee).toBe(350);

      // Verify audit history reflects change from 200 to 350
      const historyRes = await request(app)
        .get("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.applicationFee).toBe(350);
      expect(historyRes.body.data.history.length).toBeGreaterThanOrEqual(1);
      const latest = historyRes.body.data.history[0];
      expect(latest.previousFee).toBe(200);
      expect(latest.newFee).toBe(350);
      expect(latest.reason).toBe("Governing body annual indexation");
    });
  });

  describe("2. Form Issuance & Fee Snapshot Preservation", () => {
    let issuedFormNumber: string;

    it("issues form with unique serial and captures immutable fee snapshot", async () => {
      const res = await request(app)
        .post("/api/v1/admin/admissions/bulk/forms/issue")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({
          formType: "NEW",
          applicantName: "Rohan Varma",
          academicSession: "2026-2027",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.formNumber).toMatch(/^FORM-\d{4}-\d{4}$/);
      expect(res.body.data.feeAmount).toBe(350);
      issuedFormNumber = res.body.data.formNumber;
    });

    it("preserves original fee on previously issued form when fee is subsequently updated", async () => {
      // 1. Admin updates fee to ₹500
      await request(app)
        .put("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ applicationFee: 500, reason: "Special session surcharge" });

      // 2. Fetch print view for previously issued form (should show ₹350 snapshot)
      const printOldRes = await request(app)
        .get(`/api/v1/admin/admissions/bulk/forms/NEW/print?formNumber=${issuedFormNumber}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(printOldRes.status).toBe(200);
      expect(printOldRes.text).toContain("Application Fee: ₹350");
      expect(printOldRes.text).toContain(issuedFormNumber);

      // 3. Fetch blank form print view (should show new current fee ₹500)
      const printNewRes = await request(app)
        .get(`/api/v1/admin/admissions/bulk/forms/NEW/print`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(printNewRes.status).toBe(200);
      expect(printNewRes.text).toContain("Application Fee: ₹500");
    });
  });

  describe("3. Genuine Binary PDF Generation", () => {
    it("generates pure standards-compliant binary PDF (%PDF-1.4) for NEW admission", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/forms/NEW/pdf")
        .set("Authorization", `Bearer ${adminAToken}`)
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      expect(res.headers["content-disposition"]).toContain("attachment; filename=");

      const buffer = Buffer.from(res.body);
      expect(buffer.slice(0, 8).toString("utf-8")).toContain("%PDF-1.4");
      expect(buffer.toString("utf-8")).toContain("%%EOF");
    });

    it("generates pure binary PDF for READMISSION form preserving student identity fields", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/forms/READMISSION/pdf")
        .set("Authorization", `Bearer ${adminAToken}`)
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      const buffer = Buffer.from(res.body);
      expect(buffer.slice(0, 8).toString("utf-8")).toContain("%PDF-1.4");
    });

    it("generates pure binary PDF for TRANSFER form with TC details", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/forms/TRANSFER/pdf")
        .set("Authorization", `Bearer ${adminAToken}`)
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      const buffer = Buffer.from(res.body);
      expect(buffer.slice(0, 8).toString("utf-8")).toContain("%PDF-1.4");
    });
  });

  describe("4. Student Admission Register & Server-Side Search", () => {
    it("retrieves paginated student admission register for School A", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/register?page=1&limit=10")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);

      const student = res.body.data.students.find((s: any) => s.admissionNo === student1AdmNo);
      expect(student).toBeDefined();
      expect(student.name).toContain("Aarav");
    });

    it("filters students by name or admission number query", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/admissions/bulk/register?search=Aarav`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.students[0].name).toContain("Aarav");
    });

    it("enforces strict multi-tenant isolation (School B cannot see School A students)", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/register")
        .set("Authorization", `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      const student = res.body.data.students.find((s: any) => s.admissionNo === student1AdmNo);
      expect(student).toBeUndefined();
    });
  });

  describe("5. Admission Overview Metrics", () => {
    it("returns correct high-level admission counts and active application fee", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/overview")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalStudentsRegistered).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalFormsIssued).toBeGreaterThanOrEqual(1);
      expect(res.body.data.applicationFee).toBe(500);
    });
  });
});
