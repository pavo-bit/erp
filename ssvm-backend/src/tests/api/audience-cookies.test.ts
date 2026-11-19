/**
 * ssvm-backend/src/tests/api/audience-cookies.test.ts
 *
 * Block M Task 2: Verification Suite for Audience Cookie Separation,
 * Portal Validation, Real 'aud' Claim, and WRONG_PORTAL Guarding.
 *
 * Specifications:
 *  1. Separate cookie names per audience (platform_access_token vs school_access_token).
 *  2. Real 'aud' claim written at login from a validated 'portal' field.
 *  3. 403 WRONG_PORTAL on mismatch (increments ssvm_wrong_portal_denials_total).
 *  4. Delete legacy 'auth_token' cookie.
 *  5. Auth middleware reads only the cookie of the route's audience.
 *  6. Cross-cookie cases: opposite cookies rejected with 403, co-existing cookies properly routed.
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser, createTestSchool } from "../helpers/testApp";
import { getAuthPrisma } from "../../lib/authPrisma";
import { hashPassword } from "../../middleware/auth";
import { verifyAccessToken } from "../../lib/tokens";

describe("Block M Task 2 — Audience Cookie Separation & Portal Security", () => {
  const app = createTestApp();
  let schoolId: string;
  let superAdminUser: { id: string; email: string };
  let erpAdminUser: { id: string; email: string };
  const testPassword = "Password@123";

  beforeAll(async () => {
    const school = await createTestSchool();
    schoolId = school.id;

    const authDb = getAuthPrisma();
    const passwordHash = await hashPassword(testPassword);

    // 1. Create Super Admin in DB
    const superAdminRes = await createTestUser(Role.SUPER_ADMIN);
    superAdminUser = superAdminRes.user;
    await authDb.user.update({
      where: { id: superAdminUser.id },
      data: { passwordHash },
    });

    // 2. Create School ERP Admin in DB
    const erpAdminRes = await createTestUser(Role.ERP_ADMIN, schoolId);
    erpAdminUser = erpAdminRes.user;
    await authDb.user.update({
      where: { id: erpAdminUser.id },
      data: { passwordHash },
    });
  });

  describe("Login Portal Validation & 'aud' Claim", () => {
    it("logs in via platform portal and issues platform_* cookies with real 'aud': 'PLATFORM'", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: superAdminUser.email,
          password: testPassword,
          portal: "super-admin",
        });

      expect(res.status).toBe(200);

      // Verify Set-Cookie headers
      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies).toBeDefined();

      const platformAccessCookie = cookies.find((c) => c.startsWith("platform_access_token="));
      const platformRefreshCookie = cookies.find((c) => c.startsWith("platform_refresh_token="));
      const legacyAuthToken = cookies.find((c) => c.startsWith("auth_token="));

      expect(platformAccessCookie).toBeDefined();
      expect(platformRefreshCookie).toBeDefined();
      // Legacy auth_token MUST NOT be set
      expect(legacyAuthToken).toBeUndefined();

      // Extract token and verify JWT claim
      const match = platformAccessCookie!.match(/^platform_access_token=([^;]+)/);
      const token = match![1];
      const payload = verifyAccessToken(token);
      expect(payload).toBeDefined();
      expect(payload?.aud).toBe("PLATFORM");
    });

    it("logs in via school portal and issues school_* cookies with real 'aud': 'SCHOOL'", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: erpAdminUser.email,
          password: testPassword,
          portal: "erp-admin",
        });

      expect(res.status).toBe(200);

      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies).toBeDefined();

      const schoolAccessCookie = cookies.find((c) => c.startsWith("school_access_token="));
      const schoolRefreshCookie = cookies.find((c) => c.startsWith("school_refresh_token="));
      const legacyAuthToken = cookies.find((c) => c.startsWith("auth_token="));

      expect(schoolAccessCookie).toBeDefined();
      expect(schoolRefreshCookie).toBeDefined();
      expect(legacyAuthToken).toBeUndefined();

      const match = schoolAccessCookie!.match(/^school_access_token=([^;]+)/);
      const token = match![1];
      const payload = verifyAccessToken(token);
      expect(payload).toBeDefined();
      expect(payload?.aud).toBe("SCHOOL");
    });

    it("rejects school user attempting to log into platform portal with 403 WRONG_PORTAL", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: erpAdminUser.email,
          password: testPassword,
          portal: "super-admin",
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("WRONG_PORTAL");
      expect(res.body.error).toBe("WRONG_PORTAL");
    });

    it("rejects invalid portal value with 400 INVALID_PORTAL", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: superAdminUser.email,
          password: testPassword,
          portal: "malicious-portal-xyz",
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_PORTAL");
    });
  });

  describe("Cross-Cookie Isolation & Audience Guarding", () => {
    let platformCookie: string;
    let schoolCookie: string;

    beforeAll(async () => {
      // Obtain valid platform cookie
      const platRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: superAdminUser.email, password: testPassword, portal: "super-admin" });
      const platCookies = platRes.headers["set-cookie"] as unknown as string[];
      const platMatch = platCookies.find((c) => c.startsWith("platform_access_token="))!;
      platformCookie = platMatch.split(";")[0];

      // Obtain valid school cookie
      const schoolRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: erpAdminUser.email, password: testPassword, portal: "erp-admin" });
      const schCookies = schoolRes.headers["set-cookie"] as unknown as string[];
      const schMatch = schCookies.find((c) => c.startsWith("school_access_token="))!;
      schoolCookie = schMatch.split(";")[0];
    });

    it("allows platform token cookie on platform route", async () => {
      const res = await request(app)
        .get("/api/v1/platform/schools/health-usage")
        .set("Cookie", [platformCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects school cookie sent alone to platform route with 403 WRONG_PORTAL", async () => {
      const res = await request(app)
        .get("/api/v1/platform/schools/health-usage")
        .set("Cookie", [schoolCookie]);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("WRONG_PORTAL");
    });

    it("handles co-existing browser cookies by reading only the route's audience cookie", async () => {
      // Both cookies present simultaneously in browser jar
      const dualCookies = [platformCookie, schoolCookie];

      // On platform route: selects platform_access_token -> 200 OK
      const platRes = await request(app)
        .get("/api/v1/platform/schools/health-usage")
        .set("Cookie", dualCookies);

      expect(platRes.status).toBe(200);
      expect(platRes.body.success).toBe(true);
    });

    it("rejects Bearer token with aud: 'SCHOOL' on platform route with 403 WRONG_PORTAL", async () => {
      // Extract the raw token from schoolCookie
      const token = schoolCookie.replace("school_access_token=", "");

      const res = await request(app)
        .get("/api/v1/platform/schools/health-usage")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("WRONG_PORTAL");
    });
  });
});
