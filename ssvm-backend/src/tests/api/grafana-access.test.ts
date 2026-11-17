/**
 * ssvm-backend/src/tests/api/grafana-access.test.ts
 *
 * Block M4: Verification Suite for Grafana Hardening & Platform Access Control
 *
 * Requirements:
 *  - Anonymous request to platform Grafana gateway -> 401 Unauthorized.
 *  - School token (ERP_ADMIN, TEACHER, etc.) -> 403 Forbidden.
 *  - Platform token (SUPER_ADMIN, aud: PLATFORM) -> 200 OK.
 *  - Database role ssvm_grafana_ro can query platform_metrics views but is denied from public tables.
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser } from "../helpers/testApp";
import { PrismaClient } from "@prisma/client";

describe("Block M4 — Grafana Hardening & Platform Access Suite", { timeout: 30000 }, () => {
  const app = createTestApp();
  let platformSuperAdminToken: string;
  let schoolAdminToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    // 1. Create Super Admin (Platform session)
    const superAdminRes = await createTestUser(Role.SUPER_ADMIN);
    platformSuperAdminToken = superAdminRes.token;

    // 2. Create School Admin (School session)
    const schoolAdminRes = await createTestUser(Role.ERP_ADMIN, "test-school-m4-id");
    schoolAdminToken = schoolAdminRes.token;

    // 3. Create Teacher (School session)
    const teacherRes = await createTestUser(Role.TEACHER, "test-school-m4-id");
    teacherToken = teacherRes.token;
  });

  it("denies anonymous access with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/platform/grafana/dashboard");
    expect(res.status).toBe(401);
  });

  it("denies school ERP Admin with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/platform/grafana/dashboard")
      .set("Authorization", `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(403);
  });

  it("denies school Teacher with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/platform/grafana/dashboard")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(403);
  });

  it("allows Platform Super Admin with 200 OK", async () => {
    const res = await request(app)
      .get("/api/v1/platform/grafana/dashboard")
      .set("Authorization", `Bearer ${platformSuperAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.proxyTarget).toBe("http://ssvm-grafana:3000");
  });

  it("verifies ssvm_grafana_ro database role permissions in PostgreSQL", async () => {
    const dbUrl = "postgresql://ssvm_grafana_ro:grafana_ro_secure_pass_2026@127.0.0.1:5433/ssvm_platform";
    const grafanaDb = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    try {
      // 1. Can select from platform_metrics view
      const viewResult = await grafanaDb.$queryRawUnsafe<unknown[]>(
        "SELECT * FROM platform_metrics.platform_overview_v;"
      );
      expect(Array.isArray(viewResult)).toBe(true);
      expect(viewResult.length).toBeGreaterThanOrEqual(1);

      // 2. Denied from public tables (must throw error)
      await expect(
        grafanaDb.$queryRawUnsafe("SELECT * FROM public.students;")
      ).rejects.toThrow();

      await expect(
        grafanaDb.$queryRawUnsafe("SELECT * FROM public.users;")
      ).rejects.toThrow();
    } finally {
      await grafanaDb.$disconnect();
    }
  });
});
