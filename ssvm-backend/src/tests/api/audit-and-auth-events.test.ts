import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, getTestPrisma } from "../helpers/testApp";
import { SchoolFactory, UserFactory } from "../helpers/factories";
import { createAuditLog, logSecurityEvent } from "../../lib/audit";
import { runWithSchoolContext } from "../../middleware/school-context.middleware";
import bcrypt from "bcryptjs";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Audit, System Logs & Auth Events Verification", () => {
  let schoolId: string;
  let testUser: any;
  const password = "ValidPassword123!";

  beforeEach(async () => {
    const school = await prisma.school.create({ data: SchoolFactory.build() });
    schoolId = school.id;

    const passwordHash = await bcrypt.hash(password, 10);
    testUser = await prisma.user.create({
      data: UserFactory.build({ schoolId, passwordHash }),
    });
  });

  it("writes a row to auth_events when a login fails", async () => {
    const wrongPassword = "WrongPassword999!";
    
    // Attempt login with invalid password
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: wrongPassword });

    expect(res.status).toBe(401);

    // Verify auth_events row was actually written
    const events = await runWithSchoolContext(schoolId, async () => {
      return await prisma.auth_events.findMany({
        where: {
          userId: testUser.id,
          success: false,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
    });

    expect(events.length).toBe(1);
    expect(events[0].success).toBe(false);
    expect(events[0].eventType).toBe("LOGIN_FAILURE");
  });

  it("writes a row to audit_logs when an audited action runs", async () => {
    const auditRecord = await createAuditLog({
      data: {
        schoolId,
        userId: testUser.id,
        action: "TEST_AUDIT_ACTION",
        entity: "User",
        entityId: testUser.id,
        details: "Testing audit log persistence",
      },
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.id).toBeDefined();

    // Verify row actually exists in database
    const savedLog = await runWithSchoolContext(schoolId, async () => {
      return await prisma.auditLog.findUnique({
        where: { id: auditRecord!.id },
      });
    });

    expect(savedLog).not.toBeNull();
    expect(savedLog?.action).toBe("TEST_AUDIT_ACTION");
    expect(savedLog?.hash).toBeDefined();
  });

  it("writes a row to system_logs when logSecurityEvent runs", async () => {
    const secEvent = await logSecurityEvent({
      schoolId,
      userId: testUser.id,
      eventType: "SUSPICIOUS_ACCESS_PROBE",
      severity: "HIGH",
      ipAddress: "192.168.1.100",
      metadata: { probeType: "SQLi_TEST" },
    });

    expect(secEvent).toBeDefined();
    expect(secEvent?.id).toBeDefined();

    // Verify row actually exists in database
    const savedSysLog = await runWithSchoolContext(schoolId, async () => {
      return await prisma.systemLog.findUnique({
        where: { id: secEvent!.id },
      });
    });

    expect(savedSysLog).not.toBeNull();
    expect(savedSysLog?.module).toBe("SECURITY");
    expect(savedSysLog?.level).toBe("ERROR");
    expect(savedSysLog?.message).toBe("SUSPICIOUS_ACCESS_PROBE");
  });
});
