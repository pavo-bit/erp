import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import prisma from "../src/lib/prisma";
import { vi } from "vitest";
import { BackupService } from "../src/services/backup.service";
import { generateAccessToken } from "../src/lib/tokens";

describe("Architecture & Phase A E2E", () => {
  let server: any;
  let superAdminToken: string;
  let superAdminUserId: string;
  let testSchoolId: string;
  let testSessionId: string;

  beforeAll(async () => {
    server = app.listen(0);

    const school = await prisma.school.create({
      data: {
        name: "Architecture Test School",
        code: `ARCH-${Date.now()}`,
      }
    });
    testSchoolId = school.id;

    const superAdmin = await prisma.user.create({
      data: {
        email: `superadmin.arch${Date.now()}@test.com`,
        name: "Super Admin",
        passwordHash: "hashedpassword",
        role: "SUPER_ADMIN",
        schoolId: testSchoolId,
      }
    });
    superAdminUserId = superAdmin.id;

    superAdminToken = generateAccessToken({
      userId: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
      name: superAdmin.name,
      schoolId: testSchoolId,
      sid: "architecture-test-session",
    }).token;

    // Mock an active UserSession for this user
    const session = await prisma.userSession.create({
      data: {
        userId: superAdminUserId,
        sessionId: "mock-session-id-123",
        refreshFamily: "family-123",
        deviceName: "MacBook Pro",
        browser: "Chrome",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 86400000)
      }
    });
    testSessionId = session.id;

    // Seed some mock audit logs
    await prisma.auditLog.create({
      data: {
        action: "BACKUP_TEST",
        entity: "System",
        details: "CRITICAL test event",
      }
    });
  });

  afterAll(async () => {
    // Note: since soft deletes are active, we must use a raw query or be careful.
    // However, Prisma client allows physical deletes if we aren't using an extension for deleteMany,
    // wait, my extension intercepts deleteMany and turns it into an update!
    // So deleteMany will just soft-delete them. That's fine for tests.
    
    await prisma.userSession.deleteMany({ where: { userId: superAdminUserId } });
    await prisma.auditLog.deleteMany({ where: { action: "BACKUP_TEST" } });
    await prisma.user.deleteMany({ where: { id: superAdminUserId } });
    await prisma.school.deleteMany({ where: { id: testSchoolId } });

    server.close();
    await prisma.$disconnect();
  });

  describe("1. Global Soft Delete Framework", () => {
    it("should soft delete a school and hide it from findUnique", async () => {
      // Create a dummy school specifically for this test
      const dummySchool = await prisma.school.create({
        data: { name: "Dummy School", code: `DUMMY-${Date.now()}` }
      });

      // Call prisma.delete
      await prisma.school.delete({ where: { id: dummySchool.id } });

      // Verify findUnique returns null
      const fetchSchool = await prisma.school.findUnique({ where: { id: dummySchool.id } });
      expect(fetchSchool).toBeNull();

      // Verify findFirst returns null
      const fetchFirst = await prisma.school.findFirst({ where: { id: dummySchool.id } });
      expect(fetchFirst).toBeNull();

      // Verify the record is physically still in DB with deletedAt populated using raw query
      const rawResult = await prisma.$queryRaw<any[]>`SELECT "deletedAt" FROM "schools" WHERE id = ${dummySchool.id}`;
      expect(rawResult.length).toBe(1);
      expect(rawResult[0].deletedAt).not.toBeNull();
    });
  });

  describe("2. Session Management API", () => {
    it("should fetch active sessions", async () => {
      const res = await request(server)
        .get("/api/v1/sessions")
        .set("Authorization", `Bearer ${superAdminToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].deviceName).toBe("MacBook Pro");
    });

    it("should revoke a specific session", async () => {
      const res = await request(server)
        .delete(`/api/v1/sessions/${testSessionId}`)
        .set("Authorization", `Bearer ${superAdminToken}`);
        
      expect(res.status).toBe(200);
      
      const checkSession = await prisma.userSession.findUnique({ where: { id: testSessionId } });
      expect(checkSession?.isActive).toBe(false);
    });
  });

  describe("3. Automated Backup API", () => {
    it("should trigger a manual backup", async () => {
      // Mock the backup service so it doesn't fail due to missing pg_dump
      const spy = vi.spyOn(BackupService, "createDatabaseBackup").mockResolvedValue("mock-backup-id");

      const res = await request(server)
        .post("/api/v1/admin/backups")
        .set("Authorization", `Bearer ${superAdminToken}`);
        
      // Expect 202 Accepted
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("mock-backup-id");

      spy.mockRestore();
    });

    it("should list all backups", async () => {
      const res = await request(server)
        .get("/api/v1/admin/backups")
        .set("Authorization", `Bearer ${superAdminToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("4. Audit & Security Dashboard API", () => {
    it("should fetch general audit logs", async () => {
      const res = await request(server)
        .get("/api/v1/admin/audit")
        .set("Authorization", `Bearer ${superAdminToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it("should fetch security alerts (WARNING/CRITICAL)", async () => {
      const res = await request(server)
        .get("/api/v1/admin/audit/security-alerts")
        .set("Authorization", `Bearer ${superAdminToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body.data.some((alert: any) => alert.severity === "CRITICAL" || alert.severity === "WARNING")).toBe(true);
    });
  });
});
