/**
 * ssvm-backend/src/tests/api/support-sessions.test.ts
 *
 * Block M7: Super Admin Platform Health & Audited Support Session API Suite
 *
 * Requirements:
 *  - Platform health & usage aggregates endpoint (PLATFORM audience only, no student rows).
 *  - Support session request (requires MFA re-auth, issues read-only short-lived token).
 *  - Audit log and notification dispatched.
 *  - School visibility in GET /schools/me/support-session.
 *  - Revocation and expiry lifecycles.
 *  - Prometheus gauge ssvm_support_sessions_active tracking.
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser, getTestPrisma } from "../helpers/testApp";
import { SupportSessionService } from "../../services/support-session.service";
import { supportSessionsActive } from "../../middleware/metrics";
import { generateSecret, generateSync } from "otplib";

describe("Block M7 — Platform Health & Support Session Suite", { timeout: 30000 }, () => {
  const app = createTestApp();
  const db = getTestPrisma();

  let platformSuperAdminToken: string;
  let superAdminUserId: string;
  let schoolAdminToken: string;
  let testSchoolId: string;
  let userMfaSecret: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create School
    const school = await db.school.create({
      data: {
        code: `M7SCH_${timestamp}`,
        name: `M7 Health School ${timestamp}`,
        email: `m7_school_${timestamp}@test.com`,
        phone: "9998887776",
        status: "ACTIVE",
      },
    });
    testSchoolId = school.id;

    // 2. Create School Admin (Audience: SCHOOL)
    const schoolAdminRes = await createTestUser(Role.ERP_ADMIN, testSchoolId);
    schoolAdminToken = schoolAdminRes.token;

    // 3. Create Super Admin (Audience: PLATFORM) with 2FA enabled
    userMfaSecret = generateSecret();
    const superAdminRes = await createTestUser(Role.SUPER_ADMIN);
    superAdminUserId = superAdminRes.user.id;
    platformSuperAdminToken = superAdminRes.token;

    await db.user.update({
      where: { id: superAdminUserId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: userMfaSecret,
      },
    });
  });

  beforeEach(() => {
    SupportSessionService.clear();
  });

  describe("Platform Health & Usage Endpoints", () => {
    it("denies access without authentication (401)", async () => {
      const res = await request(app).get("/api/v1/platform/schools/health-usage");
      expect(res.status).toBe(401);
    });

    it("denies access to school roles (403)", async () => {
      const res = await request(app)
        .get("/api/v1/platform/schools/health-usage")
        .set("Authorization", `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(403);
    });

    it("returns per-school aggregates without exposing student rows to Super Admin", async () => {
      const res = await request(app)
        .get("/api/v1/platform/schools/health-usage")
        .set("Authorization", `Bearer ${platformSuperAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const target = res.body.data.find((s: { schoolId: string }) => s.schoolId === testSchoolId);
      expect(target).toBeDefined();
      expect(target.schoolName).toContain("M7 Health School");
      expect(target.status).toBe("ACTIVE");
      expect(target).toHaveProperty("plan");
      expect(target).toHaveProperty("modules");
      expect(target).toHaveProperty("activeUsers");
      expect(target).toHaveProperty("errorRate");
      // Verify NO student data/rows are returned
      expect(target).not.toHaveProperty("students");
      expect(target).not.toHaveProperty("studentList");
    });

    it("returns single school health and usage aggregates", async () => {
      const res = await request(app)
        .get(`/api/v1/platform/schools/${testSchoolId}/health-usage`)
        .set("Authorization", `Bearer ${platformSuperAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schoolId).toBe(testSchoolId);
      expect(res.body.data.schoolCode).toContain("M7SCH_");
    });
  });

  describe("Support Session Lifecycle & MFA Re-Authentication", () => {
    it("rejects support session request when MFA code is missing (400)", async () => {
      const res = await request(app)
        .post("/api/v1/platform/support-sessions/request")
        .set("Authorization", `Bearer ${platformSuperAdminToken}`)
        .send({
          schoolId: testSchoolId,
          reason: "Emergency data verification",
          durationMinutes: 15,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MFA_REQUIRED");
    });

    it("rejects support session request when MFA code is invalid (401)", async () => {
      const res = await request(app)
        .post("/api/v1/platform/support-sessions/request")
        .set("Authorization", `Bearer ${platformSuperAdminToken}`)
        .send({
          schoolId: testSchoolId,
          reason: "Emergency data verification",
          durationMinutes: 15,
          mfaCode: "000000", // Invalid TOTP code
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_MFA_CODE");
    });

    it("successfully requests support session with valid TOTP code", async () => {
      const validTotp = generateSync({ secret: userMfaSecret });

      const res = await request(app)
        .post("/api/v1/platform/support-sessions/request")
        .set("Authorization", `Bearer ${platformSuperAdminToken}`)
        .send({
          schoolId: testSchoolId,
          reason: "Diagnosing report card printing defect",
          durationMinutes: 20,
          mfaCode: validTotp,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.status).toBe("ACTIVE");
      expect(res.body.data.schoolId).toBe(testSchoolId);

      // Verify Prometheus metric incremented
      const metricValue = (await (supportSessionsActive as unknown as { get: () => Promise<{ values: Array<{ value: number }> }> }).get()).values[0]?.value;
      expect(metricValue).toBe(1);

      // Verify session visible to School Admin in GET /schools/me/support-session
      const schoolCheck = await request(app)
        .get("/schools/me/support-session")
        .set("Authorization", `Bearer ${schoolAdminToken}`);

      expect(schoolCheck.status).toBe(200);
      expect(schoolCheck.body.success).toBe(true);
      expect(schoolCheck.body.data.active).toBe(true);
      expect(schoolCheck.body.data.session.id).toBe(res.body.data.sessionId);
      expect(schoolCheck.body.data.session.reason).toBe("Diagnosing report card printing defect");

      // Verify audit log entry was created
      const auditLog = await db.auditLog.findFirst({
        where: {
          schoolId: testSchoolId,
          action: "SUPPORT_SESSION_INITIATED",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.reason).toBe("Diagnosing report card printing defect");

      // Verify notification created for school
      const notification = await db.notification.findFirst({
        where: {
          schoolId: testSchoolId,
          type: "IN_APP",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(notification).toBeDefined();
      expect(notification?.subject).toContain("Platform Support Session Initiated");
    });

    it("revokes an active support session and decrements metric", async () => {
      const validTotp = generateSync({ secret: userMfaSecret });

      const createRes = await request(app)
        .post("/api/v1/platform/support-sessions/request")
        .set("Authorization", `Bearer ${platformSuperAdminToken}`)
        .send({
          schoolId: testSchoolId,
          reason: "Configuration review",
          durationMinutes: 30,
          mfaCode: validTotp,
        });

      const sessionId = createRes.body.data.sessionId;

      // Revoke the session
      const revokeRes = await request(app)
        .post(`/api/v1/platform/support-sessions/${sessionId}/revoke`)
        .set("Authorization", `Bearer ${platformSuperAdminToken}`);

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.success).toBe(true);
      expect(revokeRes.body.data.session.status).toBe("REVOKED");

      // Verify metric decremented back to 0
      const metricValue = (await (supportSessionsActive as unknown as { get: () => Promise<{ values: Array<{ value: number }> }> }).get()).values[0]?.value;
      expect(metricValue).toBe(0);

      // Verify school sees no active support session anymore
      const schoolCheck = await request(app)
        .get("/schools/me/support-session")
        .set("Authorization", `Bearer ${schoolAdminToken}`);

      expect(schoolCheck.status).toBe(200);
      expect(schoolCheck.body.data.active).toBe(false);
      expect(schoolCheck.body.data.session).toBeNull();
    });

    it("auto-reconciles expired sessions", async () => {
      const validTotp = generateSync({ secret: userMfaSecret });

      const createRes = await request(app)
        .post("/api/v1/platform/support-sessions/request")
        .set("Authorization", `Bearer ${platformSuperAdminToken}`)
        .send({
          schoolId: testSchoolId,
          reason: "Quick test",
          durationMinutes: 5,
          mfaCode: validTotp,
        });

      const sessionId = createRes.body.data.sessionId;
      const session = SupportSessionService.getSession(sessionId);
      expect(session).toBeDefined();

      // Simulate expiry by setting expiresAt to the past
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000);
      }

      // Check active session for school — should detect expiry and return null
      const activeSession = SupportSessionService.getActiveSessionForSchool(testSchoolId);
      expect(activeSession).toBeNull();
      expect(session?.status).toBe("EXPIRED");
    });
  });
});
