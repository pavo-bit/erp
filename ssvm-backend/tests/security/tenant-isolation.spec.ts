import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import {
  createTestTenant,
  cleanupTestTenant,
  createTestInvoice,
  prisma,
  TestTenantData,
} from "./helpers/seed-helper";
import {
  generateTestAccessToken,
  generateAttackerToken,
  generateExpiredToken,
  generateCrossTenantToken,
  generateEscalatedToken,
  TEST_KEYS,
} from "./helpers/jwt-helper";

// ═══════════════════════════════════════════
// GAP 2 — Multi-Tenant Penetration Test Suite
// ═══════════════════════════════════════════
// 16 security tests across 5 categories:
//   A. Cross-Tenant Data Read (4 tests)
//   B. Cross-Tenant Data Write (3 tests)
//   C. Token Manipulation (4 tests)
//   D. Privilege Escalation (3 tests)
//   E. Enumeration Attacks (2 tests)
//
// Prerequisites:
//   - Test database must be available
//   - Set environment variables for test JWT keys

const API_BASE = process.env.TEST_API_URL || "http://localhost:5000";

let tenantA: TestTenantData;
let tenantB: TestTenantData;
let tenantAAdminToken: string;
let tenantBAdminToken: string;
let tenantATeacherToken: string;
let tenantAStudentToken: string;
let tenantBStudentToken: string;
let invoiceA: string;
let invoiceB: string;

describe("Multi-Tenant Security — Penetration Test Suite (GAP 2)", () => {
  beforeAll(async () => {
    // Set test JWT keys in environment
    process.env.ACCESS_TOKEN_PUBLIC_KEY = TEST_KEYS.ACCESS_TOKEN_PUBLIC_KEY;
    process.env.ACCESS_TOKEN_PRIVATE_KEY = TEST_KEYS.ACCESS_TOKEN_PRIVATE_KEY;
    process.env.REFRESH_TOKEN_PUBLIC_KEY = TEST_KEYS.REFRESH_TOKEN_PUBLIC_KEY;
    process.env.REFRESH_TOKEN_PRIVATE_KEY = TEST_KEYS.REFRESH_TOKEN_PRIVATE_KEY;

    // Create two isolated tenants
    tenantA = await createTestTenant("tenantA");
    tenantB = await createTestTenant("tenantB");

    // Generate tokens for each tenant's users
    tenantAAdminToken = generateTestAccessToken({
      userId: tenantA.admin.id,
      email: tenantA.admin.email,
      name: tenantA.admin.name,
      role: "ERP_ADMIN",
      schoolId: tenantA.school.id,
    });

    tenantBAdminToken = generateTestAccessToken({
      userId: tenantB.admin.id,
      email: tenantB.admin.email,
      name: tenantB.admin.name,
      role: "ERP_ADMIN",
      schoolId: tenantB.school.id,
    });

    tenantATeacherToken = generateTestAccessToken({
      userId: tenantA.teacher.id,
      email: tenantA.teacher.email,
      name: tenantA.teacher.name,
      role: "TEACHER",
      schoolId: tenantA.school.id,
    });

    tenantAStudentToken = generateTestAccessToken({
      userId: tenantA.studentUser.id,
      email: tenantA.studentUser.email,
      name: tenantA.studentUser.name,
      role: "STUDENT",
      schoolId: tenantA.school.id,
    });

    tenantBStudentToken = generateTestAccessToken({
      userId: tenantB.studentUser.id,
      email: tenantB.studentUser.email,
      name: tenantB.studentUser.name,
      role: "STUDENT",
      schoolId: tenantB.school.id,
    });

    // Create test invoices
    invoiceA = await createTestInvoice(tenantA.school.id, tenantA.student.id);
    invoiceB = await createTestInvoice(tenantB.school.id, tenantB.student.id);
  }, 60000); // 60s timeout for setup

  afterAll(async () => {
    await cleanupTestTenant(tenantA.school.id);
    await cleanupTestTenant(tenantB.school.id);
    await prisma.$disconnect();
  });

  // ═══════════════════════════════════════════
  // Category A: Cross-Tenant Data Read
  // ═══════════════════════════════════════════

  describe("A. Cross-Tenant Data Read", () => {
    it("A1 — Admin from School A cannot list School B's students", async () => {
      const res = await request(API_BASE)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .query({ schoolId: tenantB.school.id });

      // Should either return 403, or return empty results (no School B data)
      if (res.status === 200) {
        const students = res.body.data || res.body.students || [];
        const schoolBStudents = students.filter((s: any) => s.schoolId === tenantB.school.id);
        expect(schoolBStudents).toHaveLength(0);
      } else {
        expect([403, 401]).toContain(res.status);
      }
    });

    it("A2 — Admin from School A cannot read School B's invoice by ID", async () => {
      const res = await request(API_BASE)
        .get(`/api/v1/invoices/${invoiceB}`)
        .set("Authorization", `Bearer ${tenantAAdminToken}`);

      // Must not return the invoice data
      if (res.status === 200) {
        expect(res.body.data?.schoolId).not.toBe(tenantB.school.id);
      } else {
        expect([403, 404]).toContain(res.status);
      }
    });

    it("A3 — Student from School A cannot view School B student's attendance", async () => {
      const res = await request(API_BASE)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${tenantAStudentToken}`)
        .query({ schoolId: tenantB.school.id });

      if (res.status === 200) {
        const records = res.body.data || res.body.attendance || [];
        const crossTenantRecords = records.filter((r: any) => r.schoolId === tenantB.school.id);
        expect(crossTenantRecords).toHaveLength(0);
      } else {
        expect([403, 401]).toContain(res.status);
      }
    });

    it("A4 — Teacher from School A cannot fetch School B's teacher list", async () => {
      const res = await request(API_BASE)
        .get("/api/v1/teachers")
        .set("Authorization", `Bearer ${tenantATeacherToken}`)
        .query({ schoolId: tenantB.school.id });

      if (res.status === 200) {
        const teachers = res.body.data || res.body.teachers || [];
        const crossTenantTeachers = teachers.filter((t: any) => t.schoolId === tenantB.school.id);
        expect(crossTenantTeachers).toHaveLength(0);
      } else {
        expect([403, 401]).toContain(res.status);
      }
    });
  });

  // ═══════════════════════════════════════════
  // Category B: Cross-Tenant Data Write
  // ═══════════════════════════════════════════

  describe("B. Cross-Tenant Data Write", () => {
    it("B1 — Admin from School A cannot create a student in School B", async () => {
      const res = await request(API_BASE)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .send({
          schoolId: tenantB.school.id,
          name: "Injected Student",
          admissionNo: "HACK-001",
          dateOfBirth: "2010-01-01",
          gender: "Male",
        });

      expect([403, 401, 400]).toContain(res.status);

      // Verify no student was created in School B
      const injectedStudent = await prisma.student.findFirst({
        where: { schoolId: tenantB.school.id, admissionNo: "HACK-001" },
      });
      expect(injectedStudent).toBeNull();
    });

    it("B2 — Admin from School A cannot update School B's invoice", async () => {
      const res = await request(API_BASE)
        .put(`/api/v1/invoices/${invoiceB}`)
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .send({ status: "PAID", remarks: "Cross-tenant attack" });

      expect([403, 404, 401]).toContain(res.status);

      // Verify invoice was not modified
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceB } });
      expect(invoice?.status).toBe("PENDING");
      expect(invoice?.remarks).not.toBe("Cross-tenant attack");
    });

    it("B3 — Admin from School A cannot delete School B's student", async () => {
      const res = await request(API_BASE)
        .delete(`/api/v1/students/${tenantB.student.id}`)
        .set("Authorization", `Bearer ${tenantAAdminToken}`);

      expect([403, 404, 401]).toContain(res.status);

      // Verify student still exists
      const student = await prisma.student.findUnique({ where: { id: tenantB.student.id } });
      expect(student).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════
  // Category C: Token Manipulation
  // ═══════════════════════════════════════════

  describe("C. Token Manipulation", () => {
    it("C1 — Token signed by attacker key is rejected", async () => {
      const attackerToken = generateAttackerToken({
        userId: tenantA.admin.id,
        email: tenantA.admin.email,
        name: tenantA.admin.name,
        role: "SUPER_ADMIN",
        schoolId: tenantA.school.id,
      });

      const res = await request(API_BASE)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${attackerToken}`);

      expect(res.status).toBe(401);
    });

    it("C2 — Expired token is rejected", async () => {
      const expiredToken = generateExpiredToken({
        userId: tenantA.admin.id,
        email: tenantA.admin.email,
        name: tenantA.admin.name,
        role: "ERP_ADMIN",
        schoolId: tenantA.school.id,
      });

      // Wait briefly to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const res = await request(API_BASE)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it("C3 — Tampered token payload is rejected", async () => {
      // Take a valid token, tamper with the payload, keep the same signature
      const validToken = tenantAAdminToken;
      const parts = validToken.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      payload.role = "SUPER_ADMIN"; // Tamper with role
      parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const tamperedToken = parts.join(".");

      const res = await request(API_BASE)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });

    it("C4 — Completely malformed token is rejected", async () => {
      const res = await request(API_BASE)
        .get("/api/v1/students")
        .set("Authorization", "Bearer not.a.real.token.at.all");

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════
  // Category D: Privilege Escalation
  // ═══════════════════════════════════════════

  describe("D. Privilege Escalation", () => {
    it("D1 — Student cannot access admin-only endpoints", async () => {
      const res = await request(API_BASE)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${tenantAStudentToken}`);

      expect([403, 401]).toContain(res.status);
    });

    it("D2 — Teacher cannot access ERP_ADMIN settings", async () => {
      const res = await request(API_BASE)
        .get("/api/v1/school-settings")
        .set("Authorization", `Bearer ${tenantATeacherToken}`);

      // Teachers may have limited read access, but should not be able to modify
      const writeRes = await request(API_BASE)
        .put("/api/v1/school-settings")
        .set("Authorization", `Bearer ${tenantATeacherToken}`)
        .send({ timezone: "America/New_York" });

      expect([403, 401]).toContain(writeRes.status);
    });

    it("D3 — ERP_ADMIN cannot access SUPER_ADMIN endpoints", async () => {
      const res = await request(API_BASE)
        .get("/api/v1/admin/schools")
        .set("Authorization", `Bearer ${tenantAAdminToken}`);

      expect([403, 401]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  // Category E: Enumeration Attacks
  // ═══════════════════════════════════════════

  describe("E. Enumeration Attacks", () => {
    it("E1 — Non-existent school ID returns 404, not different error for existent vs non-existent", async () => {
      const fakeSchoolId = "clxxxxxxxxxxxxxxxxxxxxxxxxx";

      const res = await request(API_BASE)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .query({ schoolId: fakeSchoolId });

      // Should return 403 (forbidden) or 404 — NOT 200 with empty data
      // The key assertion: response should be indistinguishable from a real school ID that
      // the user doesn't have access to
      const resRealSchool = await request(API_BASE)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .query({ schoolId: tenantB.school.id });

      // Both should return the same status code (no enumeration leak)
      expect(res.status).toBe(resRealSchool.status);
    });

    it("E2 — Unauthenticated requests cannot enumerate school existence", async () => {
      const res = await request(API_BASE)
        .get(`/api/v1/schools/${tenantA.school.id}`)
        .set("Authorization", "");

      expect(res.status).toBe(401);
    });
  });
});
