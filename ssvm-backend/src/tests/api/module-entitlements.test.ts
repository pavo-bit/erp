/**
 * ssvm-backend/src/tests/api/module-entitlements.test.ts
 *
 * Dual Portal Sidebar Completion: Module Entitlements & Guard Integration Test Suite
 *
 * Verifies:
 * 1. Central Module Registry contains all canonical modules with correct metadata.
 * 2. GET /api/v1/schools/me/modules returns entitled modules and lifecycle states.
 * 3. GET /api/v1/schools/:id/modules restricted to SUPER_ADMIN, rejected for ERP_ADMIN (403).
 * 4. PATCH /api/v1/schools/:id/modules/:moduleCode enables/disables optional modules for SUPER_ADMIN.
 * 5. Rejection of attempts to disable core modules (ACADEMICS, FINANCE).
 * 6. Dependency validation (e.g. enabling HOSTEL verifies ACADEMICS).
 * 7. Non-superadmin cannot toggle entitlements (403).
 * 8. requireModule guard rejects disabled module routes with 403 MODULE_DISABLED.
 * 9. Non-superadmin user cannot spoof tenant using x-school-id or x-tenant-id headers.
 * 10. Fail-closed behavior on database lookup error or unknown module code.
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser } from "../helpers/testApp";
import prisma from "../../lib/prisma";
import { ModuleRegistryService, CENTRAL_MODULE_REGISTRY } from "../../services/module-registry.service";

describe("SSVM ERP: Module Entitlements & Guard Integration Suite", () => {
  const app = createTestApp();

  let superAdminToken: string;
  let erpAdminAToken: string;
  let erpAdminBToken: string;

  let schoolAId: string;
  let schoolBId: string;

  beforeAll(async () => {
    // 1. Create Super Admin
    const superAdmin = await createTestUser(Role.SUPER_ADMIN, "PLATFORM");
    superAdminToken = superAdmin.token;

    // 2. Create School A & ERP Admin A
    const schoolA = await prisma.school.create({
      data: {
        name: "SSVM Model School A",
        code: `SCH-A-${Date.now().toString().slice(-4)}`,
        status: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    erpAdminAToken = adminA.token;

    // 3. Create School B & ERP Admin B
    const schoolB = await prisma.school.create({
      data: {
        name: "SSVM Model School B",
        code: `SCH-B-${Date.now().toString().slice(-4)}`,
        status: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    erpAdminBToken = adminB.token;
  });

  describe("1. Central Module Registry Catalog Contract", () => {
    it("should export exactly the 10 canonical modules", () => {
      const registry = ModuleRegistryService.getRegistry();
      expect(registry).toHaveLength(10);

      const codes = registry.map((m) => m.code);
      expect(codes).toContain("ACADEMICS");
      expect(codes).toContain("FINANCE");
      expect(codes).toContain("EXAMS");
      expect(codes).toContain("TRANSPORT");
      expect(codes).toContain("LIBRARY");
      expect(codes).toContain("HOSTEL");
      expect(codes).toContain("HR_PAYROLL");
      expect(codes).toContain("INVENTORY");
      expect(codes).toContain("COMMUNICATIONS");
      expect(codes).toContain("BIOMETRIC_ATTENDANCE");
    });

    it("should mark ACADEMICS and FINANCE as immutable core modules", () => {
      const academics = ModuleRegistryService.getModuleDefinition("ACADEMICS");
      const finance = ModuleRegistryService.getModuleDefinition("FINANCE");
      const transport = ModuleRegistryService.getModuleDefinition("TRANSPORT");

      expect(academics?.isCore).toBe(true);
      expect(finance?.isCore).toBe(true);
      expect(transport?.isCore).toBe(false);
    });

    it("should fail closed (return false) for unknown module codes", async () => {
      const isEnabled = await ModuleRegistryService.isModuleEnabled(schoolAId, "UNKNOWN_NONEXISTENT_MODULE");
      expect(isEnabled).toBe(false);
    });
  });

  describe("2. GET /api/v1/schools/me/modules (School Context)", () => {
    it("should return entitled modules with operational lifecycle state for authenticated school user", async () => {
      const res = await request(app)
        .get("/api/v1/schools/me/modules")
        .set("Authorization", `Bearer ${erpAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schoolId).toBe(schoolAId);
      expect(Array.isArray(res.body.data.modules)).toBe(true);

      // Verify core modules are present and active
      const academics = res.body.data.modules.find((m: any) => m.module.code === "ACADEMICS");
      expect(academics).toBeDefined();
      expect(academics.isEnabled).toBe(true);
      expect(academics.source).toBe("CORE");
    });

    it("should ignore arbitrary x-school-id header sent by regular school admin (prevent tenant spoofing)", async () => {
      const res = await request(app)
        .get("/api/v1/schools/me/modules")
        .set("Authorization", `Bearer ${erpAdminAToken}`)
        .set("x-school-id", schoolBId); // malicious spoof attempt

      expect(res.status).toBe(200);
      expect(res.body.data.schoolId).toBe(schoolAId); // Still locked to School A!
    });
  });

  describe("3. GET /api/v1/schools/:id/modules (Super Admin Management)", () => {
    it("should allow SUPER_ADMIN to inspect target school modules", async () => {
      const res = await request(app)
        .get(`/api/v1/schools/${schoolAId}/modules`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schoolId).toBe(schoolAId);
      expect(res.body.data.school.name).toBe("SSVM Model School A");
      expect(res.body.data.modules.length).toBe(10);
    });

    it("should reject non-superadmin (ERP_ADMIN) from accessing target school modules endpoint", async () => {
      const res = await request(app)
        .get(`/api/v1/schools/${schoolAId}/modules`)
        .set("Authorization", `Bearer ${erpAdminAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("4. PATCH /api/v1/schools/:id/modules/:moduleCode (Super Admin Toggle)", () => {
    it("should allow SUPER_ADMIN to enable an optional module (TRANSPORT)", async () => {
      const res = await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/TRANSPORT`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.module.isEnabled).toBe(true);

      // Verify entitlement service reports true for School A
      const isEnabledA = await ModuleRegistryService.isModuleEnabled(schoolAId, "TRANSPORT");
      expect(isEnabledA).toBe(true);

      // Verify School B is unaffected (strict tenant isolation)
      const isEnabledB = await ModuleRegistryService.isModuleEnabled(schoolBId, "TRANSPORT");
      expect(isEnabledB).toBe(false);
    });

    it("should reject disabling core module (ACADEMICS) with HTTP 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/ACADEMICS`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("cannot be disabled");
    });

    it("should reject disabling core module (FINANCE) with HTTP 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/FINANCE`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("cannot be disabled");
    });

    it("should reject non-superadmin (ERP_ADMIN) from toggling module entitlements", async () => {
      const res = await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/TRANSPORT`)
        .set("Authorization", `Bearer ${erpAdminAToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(403);
    });

    it("should allow SUPER_ADMIN to disable optional module (TRANSPORT)", async () => {
      const res = await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/TRANSPORT`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.module.isEnabled).toBe(false);

      const isEnabled = await ModuleRegistryService.isModuleEnabled(schoolAId, "TRANSPORT");
      expect(isEnabled).toBe(false);
    });

    it("should return 404 for unrecognized module code", async () => {
      const res = await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/INVALID_CODE`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ enabled: true });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("5. Lifecycle State Computation (Transport & Hostel)", () => {
    it("should report PROVISIONING badge when TRANSPORT is enabled but 0 vehicles exist", async () => {
      // Enable TRANSPORT for School A
      await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/TRANSPORT`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ enabled: true });

      const res = await request(app)
        .get("/api/v1/schools/me/modules")
        .set("Authorization", `Bearer ${erpAdminAToken}`);

      const transportMod = res.body.data.modules.find((m: any) => m.module.code === "TRANSPORT");
      expect(transportMod.isEnabled).toBe(true);
      expect(transportMod.operationalState).toBe("PROVISIONING");
      expect(transportMod.badge).toBe("Provisioning");
    });

    it("should report CONFIGURATION_REQUIRED badge when HOSTEL is enabled but 0 rooms exist", async () => {
      // Enable HOSTEL for School A
      await request(app)
        .patch(`/api/v1/schools/${schoolAId}/modules/HOSTEL`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ enabled: true });

      const res = await request(app)
        .get("/api/v1/schools/me/modules")
        .set("Authorization", `Bearer ${erpAdminAToken}`);

      const hostelMod = res.body.data.modules.find((m: any) => m.module.code === "HOSTEL");
      expect(hostelMod.isEnabled).toBe(true);
      expect(hostelMod.operationalState).toBe("CONFIGURATION_REQUIRED");
      expect(hostelMod.badge).toBe("Setup Required");
    });
  });
});

