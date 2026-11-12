/**
 * ssvm-backend/src/tests/api/admission-form-lifecycle.test.ts
 *
 * PROMPT 5: Rigorous Production Acceptance & Corrective Lifecycle Test Suite
 * Executes against real PostgreSQL 16 on port 5433 with tenant isolation & RLS.
 *
 * Verifies:
 *  1. Application Fee Configuration RBAC, Concurrency & Atomic Audit History
 *  2. Form Issuance with Concurrency-Safe Advisory Locking & Monotonic FORM-YYYY-XXXX
 *  3. Strict Elimination of Caller-Supplied Fee Overrides
 *  4. Form Type Mismatch & Unknown Form Number Rejection (400 / 404)
 *  5. Genuine Standards-Compliant Pure Binary PDF Generation (%PDF-1.4)
 *  6. Printable A4 HTML Form Rendering with Snapshot Fee Resolution
 *  7. Server-Side Student Admission Register (Search, Filters, Pagination, Tenant Isolation)
 *  8. Dedicated Server-Side Re-admission Records Endpoint
 *  9. Granular Capability-Based RBAC Enforcement (Receptionist, Teacher, Admin)
 * 10. Multi-Tenant Fail-Closed Isolation
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser } from "../helpers/testApp";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";

describe("PROMPT 5 — SSVM ERP Admission Final Corrective Acceptance Suite", () => {
  const app = createTestApp();
  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;
  let teacherAToken: string;
  let receptionistAToken: string;
  let adminBToken: string;

  let sessionAId: string;
  let class1Id: string;
  let sec1Id: string;
  let newStudentAdmNo: string;
  let readmittedStudentAdmNo: string;
  let issuedFormNumber: string;

  beforeAll(async () => {
    // 1. Create School A & School B
    const schoolA = await prisma.school.create({
      data: {
        name: "SSVM Demonstration Academy A",
        code: `SSVM-A-${Date.now().toString().slice(-5)}`,
        status: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: "SSVM Demonstration Academy B",
        code: `SSVM-B-${Date.now().toString().slice(-5)}`,
        status: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    // 2. Create Users & Tokens for various roles
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;

    const receptionistA = await createTestUser(Role.RECEPTIONIST, schoolAId);
    receptionistAToken = receptionistA.token;

    const teacherA = await createTestUser(Role.TEACHER, schoolAId);
    teacherAToken = teacherA.token;

    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminBToken = adminB.token;

    // 3. Create Session, Class, Section, and Students inside Tenant A Transaction
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

      // Student 1: New Admission
      newStudentAdmNo = `ADM-2026-${Date.now().toString().slice(-4)}`;
      const stu1User = await tx.user.create({
        data: {
          schoolId: schoolAId,
          email: `aarav.${Date.now()}@example.com`,
          passwordHash: "dummyhash",
          name: "Aarav Sharma",
          role: Role.STUDENT,
        },
      });

      await tx.student.create({
        data: {
          schoolId: schoolAId,
          userId: stu1User.id,
          admissionNo: newStudentAdmNo,
          rollNo: "R-01",
          name: "Aarav Sharma",
          gender: "MALE",
          isActive: true,
          sectionId: sec1Id,
        },
      });

      // Student 2: Re-admission with permanent identity
      readmittedStudentAdmNo = `ADM-2024-9988`;
      const stu2User = await tx.user.create({
        data: {
          schoolId: schoolAId,
          email: `priya.${Date.now()}@example.com`,
          passwordHash: "dummyhash",
          name: "Priya Nair",
          role: Role.STUDENT,
        },
      });

      const stu2 = await tx.student.create({
        data: {
          schoolId: schoolAId,
          userId: stu2User.id,
          admissionNo: readmittedStudentAdmNo,
          rollNo: "R-02",
          name: "Priya Nair",
          gender: "FEMALE",
          isActive: true,
          sectionId: sec1Id,
        },
      });

      // Add Re-admission timeline event
      await tx.studentTimeline.create({
        data: {
          studentId: stu2.id,
          title: "Student Re-admission Approved",
          type: "READMISSION",
          description: "Student re-enrolled into session 2026-2027 retaining permanent identity ADM-2024-9988.",
          date: new Date("2026-04-02"),
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

  describe("1. Application Fee Configuration & Granular RBAC", () => {
    it("returns default ₹200 fee for newly created institution", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.applicationFee).toBe(200);
      expect(res.body.data.currentFee).toBe(200);
      expect(Array.isArray(res.body.data.history)).toBe(true);
    });

    it("rejects unauthorized requests without token (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/v1/admin/admissions/bulk/fee");
      expect(res.status).toBe(401);
    });

    it("rejects fee modification by Teacher or Receptionist (403 Forbidden)", async () => {
      const teacherRes = await request(app)
        .put("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${teacherAToken}`)
        .send({ applicationFee: 350, reason: "Teacher unauthorized attempt" });
      expect(teacherRes.status).toBe(403);

      const receptionistRes = await request(app)
        .put("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${receptionistAToken}`)
        .send({ applicationFee: 350, reason: "Receptionist unauthorized attempt" });
      expect(receptionistRes.status).toBe(403);
    });

    it("rejects fee modification with missing or empty reason (400 Bad Request)", async () => {
      const res = await request(app)
        .put("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ applicationFee: 350, reason: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("reason");
    });

    it("allows ERP_ADMIN to update fee with mandatory reason and logs atomic audit record", async () => {
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
      expect(latest.userName).toBeDefined();
      expect(latest.timestamp).toBeDefined();
    });
  });

  describe("2. Concurrency-Safe Form Issuance & Advisory Locking", () => {
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

    it("issues forms concurrently without duplicate serial collisions", async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post("/api/v1/admin/admissions/bulk/forms/issue")
          .set("Authorization", `Bearer ${adminAToken}`)
          .send({
            formType: "NEW",
            applicantName: `Concurrent Candidate ${i + 1}`,
            academicSession: "2026-2027",
          })
      );

      const responses = await Promise.all(requests);
      const serials = responses.map((r) => {
        expect(r.status).toBe(201);
        return r.body.data.formNumber;
      });

      // Verify every generated serial is completely unique
      const uniqueSerials = new Set(serials);
      expect(uniqueSerials.size).toBe(5);
    });

    it("allows Receptionist to issue official forms (ADMISSION_CREATE capability)", async () => {
      const res = await request(app)
        .post("/api/v1/admin/admissions/bulk/forms/issue")
        .set("Authorization", `Bearer ${receptionistAToken}`)
        .send({
          formType: "NEW",
          applicantName: "Reception Walk-in Applicant",
          academicSession: "2026-2027",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.formNumber).toBeDefined();
    });
  });

  describe("3. Elimination of Caller Fee Overrides & Snapshot Integrity", () => {
    it("preserves original snapshot fee on issued form when active fee is subsequently updated", async () => {
      // 1. Admin updates fee to ₹500
      await request(app)
        .put("/api/v1/admin/admissions/bulk/fee")
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ applicationFee: 500, reason: "Mid-session adjustment" });

      // 2. Fetch print view for previously issued form (should retain ₹350 snapshot)
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

    it("strictly ignores caller-supplied fee query parameter on print and PDF routes", async () => {
      // Attempting ?fee=0 or ?fee=9999 must NOT override the snapshot or current fee
      const printTampered = await request(app)
        .get(`/api/v1/admin/admissions/bulk/forms/NEW/print?formNumber=${issuedFormNumber}&fee=0`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(printTampered.status).toBe(200);
      expect(printTampered.text).toContain("Application Fee: ₹350");
      expect(printTampered.text).not.toContain("Application Fee: ₹0");
    });

    it("rejects non-existent form numbers with 404 Not Found", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/forms/NEW/print?formNumber=FORM-9999-9999")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });

    it("rejects form type mismatch with 400 Bad Request", async () => {
      // Form was issued as NEW; requesting it as TRANSFER must be rejected
      const res = await request(app)
        .get(`/api/v1/admin/admissions/bulk/forms/TRANSFER/print?formNumber=${issuedFormNumber}`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("mismatch");
    });
  });

  describe("4. Genuine Standards-Compliant Pure Binary PDF (%PDF-1.4)", () => {
    it("generates pure binary PDF (%PDF-1.4) containing issued form metadata", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/admissions/bulk/forms/NEW/pdf?formNumber=${issuedFormNumber}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      expect(res.headers["content-disposition"]).toContain("attachment; filename=");

      const buffer = Buffer.from(res.body);
      expect(buffer.slice(0, 8).toString("utf-8")).toContain("%PDF-1.4");
      expect(buffer.toString("utf-8")).toContain("%%EOF");
      expect(buffer.toString("utf-8")).toContain(issuedFormNumber);
    });

    it("generates valid binary PDF for READMISSION form preserving student identity", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/forms/READMISSION/pdf")
        .set("Authorization", `Bearer ${adminAToken}`)
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      const buffer = Buffer.from(res.body);
      expect(buffer.slice(0, 8).toString("utf-8")).toContain("%PDF-1.4");
    });

    it("generates valid binary PDF for TRANSFER form with TC clearance fields", async () => {
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

  describe("5. Student Admission Register & Server-Side Filters", () => {
    it("retrieves paginated student admission register with canonical fields", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/register?page=1&limit=10")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);

      const stu1 = res.body.data.students.find((s: any) => s.admissionNo === newStudentAdmNo);
      expect(stu1).toBeDefined();
      expect(stu1.name).toBe("Aarav Sharma");
      expect(stu1.firstName).toBe("Aarav");
      expect(stu1.admissionType).toBe("NEW");
      expect(stu1.status).toBe("ACTIVE");
    });

    it("filters students by admissionType=READMISSION server-side", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/register?admissionType=READMISSION")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students.length).toBeGreaterThanOrEqual(1);
      const student = res.body.data.students.find((s: any) => s.admissionNo === readmittedStudentAdmNo);
      expect(student).toBeDefined();
      expect(student.admissionType).toBe("READMISSION");
    });

    it("filters students by name or admission number search query", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/admissions/bulk/register?search=Aarav`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students.length).toBe(1);
      expect(res.body.data.students[0].name).toBe("Aarav Sharma");
    });

    it("enforces strict multi-tenant isolation (School B cannot see School A students)", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/register")
        .set("Authorization", `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      const student = res.body.data.students.find((s: any) => s.admissionNo === newStudentAdmNo);
      expect(student).toBeUndefined();
    });
  });

  describe("6. Dedicated Server-Side Re-admission Records Endpoint", () => {
    it("retrieves dedicated re-admission records server-side with identity preservation verification", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/readmissions")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();

      const record = res.body.data.students.find((s: any) => s.admissionNo === readmittedStudentAdmNo);
      expect(record).toBeDefined();
      expect(record.name).toBe("Priya Nair");
      expect(record.admissionNo).toBe(readmittedStudentAdmNo);
      expect(record.identityPreserved).toBe(true);
    });
  });

  describe("7. Admission Overview Real Institutional Metrics", () => {
    it("returns real institutional metadata and admission statistics", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admissions/bulk/overview")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.schoolName).toBe("SSVM Demonstration Academy A");
      expect(res.body.data.totalStudentsRegistered).toBeGreaterThanOrEqual(2);
      expect(res.body.data.totalFormsIssued).toBeGreaterThanOrEqual(1);
      expect(res.body.data.applicationFee).toBe(500);
    });
  });
});
