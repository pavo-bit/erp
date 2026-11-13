/**
 * ssvm-backend/src/tests/api/controlled-school-simulation.test.ts
 * Phase 13 Final Controlled Multi-School Simulation & End-to-End Validation
 *
 * Simulates School A, School B, and School C across 12 user personas:
 *   - Super Admin
 *   - School A Admin, School B Admin, School C Admin
 *   - School A Teacher, School B Teacher
 *   - School A Parent, School B Parent
 *   - School A Student, School B Student
 *   - School A Cashier / Finance Operator
 *   - School A HR Operator
 *   - School A Transport Fleet Manager
 *
 * Verifies:
 *   - School A: TRANSPORT + LIBRARY + BIOMETRIC_ATTENDANCE
 *   - School B: LIBRARY only (TRANSPORT disabled)
 *   - School C: TRANSPORT + HOSTEL (LIBRARY disabled)
 *   - 15 Mandatory Tenant Isolation Assertions
 *   - SaaS Modular Entitlement rejection (HTTP 403 MODULE_DISABLED)
 *   - Hardware IoT Transport Telemetry & bound validation
 *   - Biometric Fingerprint Attendance contract, deduplication, on-device privacy & BLOCKED_EXTERNAL status
 *   - SHFI Incident Lifecycle & dual persistence
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma } from "../helpers/testApp";
import { hashPassword, signToken } from "../../middleware/auth";
import { generateVehicleHardwareToken, vehicleTelemetryStore } from "../../routes/admin/transport";
import { generateBiometricHardwareToken, processedBiometricEvents } from "../../routes/attendance";
import { ModuleRegistryService } from "../../services/module-registry.service";
import { DiagnosticEventService } from "../../services/diagnostic-event.service";
import { IncidentService } from "../../services/incident.service";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Master Controlled Three-School Simulation, Entitlements & E2E Validation", () => {
  const uid = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  // Schools
  let schoolAId: string;
  let schoolBId: string;
  let schoolCId: string;

  // Personas & Tokens
  let superAdminUserId: string;
  let superAdminToken: string;
  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let schoolCAdminToken: string;
  let teacherAToken: string;
  let teacherBToken: string;
  let parentAToken: string;
  let parentBToken: string;
  let studentAToken: string;
  let studentBToken: string;
  let cashierAToken: string;
  let hrUserAToken: string;
  let transportUserAToken: string;

  // Entities
  let classAId: string;
  let sectionAId: string;
  let studentAId: string;
  let studentBId: string;
  let teacherAId: string;
  let teacherAEmployeeId: string;
  let invoiceAId: string;
  let vehicleAId: string;
  let routeAId: string;
  let stopAId: string;

  beforeAll(async () => {
    vehicleTelemetryStore.clear();
    processedBiometricEvents.clear();

    // 1. Create Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: `superadmin_${uid}@erp.platform`,
        name: "Super Administrator",
        passwordHash: await hashPassword("Super@123"),
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    superAdminUserId = superAdmin.id;
    superAdminToken = signToken({
      userId: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role,
      schoolId: undefined,
    });

    // 2. Create Schools A, B, and C
    const schoolA = await prisma.school.create({
      data: {
        name: `School A Academy ${uid}`,
        code: `SCHA_${uid}`,
        status: "ACTIVE",
        tenantState: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: `School B Institute ${uid}`,
        code: `SCHB_${uid}`,
        status: "ACTIVE",
        tenantState: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    const schoolC = await prisma.school.create({
      data: {
        name: `School C Residential ${uid}`,
        code: `SCHC_${uid}`,
        status: "ACTIVE",
        tenantState: "ACTIVE",
      },
    });
    schoolCId = schoolC.id;

    // Helper to generate personas
    async function makeUser(email: string, name: string, role: Role, schoolId: string | null) {
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: await hashPassword("Secret@123"),
          role,
          schoolId,
          isActive: true,
        },
      });
      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: schoolId ?? undefined,
      });
      return { user, token };
    }

    // Admins
    const adminA = await makeUser(`admin_a_${uid}@schoola.edu`, "Admin School A", Role.ERP_ADMIN, schoolAId);
    schoolAAdminToken = adminA.token;

    const adminB = await makeUser(`admin_b_${uid}@schoolb.edu`, "Admin School B", Role.ERP_ADMIN, schoolBId);
    schoolBAdminToken = adminB.token;

    const adminC = await makeUser(`admin_c_${uid}@schoolc.edu`, "Admin School C", Role.ERP_ADMIN, schoolCId);
    schoolCAdminToken = adminC.token;

    // Academic Sessions for Schools A, B, and C
    const sessionA = await prisma.academicSession.create({
      data: {
        schoolId: schoolAId,
        name: `2026-2027 ${uid}`,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });

    const sessionB = await prisma.academicSession.create({
      data: {
        schoolId: schoolBId,
        name: `2026-2027 ${uid}`,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });

    // Teachers
    const teacherA = await makeUser(`teacher_a_${uid}@schoola.edu`, "Teacher A", Role.TEACHER, schoolAId);
    teacherAToken = teacherA.token;
    teacherAEmployeeId = `EMP-A-${uid}`;
    const teacherARecord = await prisma.teacher.create({
      data: { userId: teacherA.user.id, schoolId: schoolAId, employeeId: teacherAEmployeeId },
    });
    teacherAId = teacherARecord.id;

    const teacherB = await makeUser(`teacher_b_${uid}@schoolb.edu`, "Teacher B", Role.TEACHER, schoolBId);
    teacherBToken = teacherB.token;
    await prisma.teacher.create({
      data: { userId: teacherB.user.id, schoolId: schoolBId, employeeId: `EMP-B-${uid}` },
    });

    // Parents
    const parentA = await makeUser(`parent_a_${uid}@familya.org`, "Guardian A", Role.PARENT, schoolAId);
    parentAToken = parentA.token;

    const parentB = await makeUser(`parent_b_${uid}@familyb.org`, "Guardian B", Role.PARENT, schoolBId);
    parentBToken = parentB.token;

    // Students
    const studentUserA = await makeUser(`student_a_${uid}@schoola.edu`, "Student A", Role.STUDENT, schoolAId);
    studentAToken = studentUserA.token;

    const studentUserB = await makeUser(`student_b_${uid}@schoolb.edu`, "Student B", Role.STUDENT, schoolBId);
    studentBToken = studentUserB.token;

    // Academic Structure for School A
    const clsA = await prisma.class.create({
      data: { name: `Grade 10 ${uid}`, schoolId: schoolAId, sessionId: sessionA.id },
    });
    classAId = clsA.id;

    const secA = await prisma.section.create({
      data: { name: "Section A", classId: classAId },
    });
    sectionAId = secA.id;

    // Guardian A
    const guardianA = await prisma.guardian.create({
      data: {
        userId: parentA.user.id,
        schoolId: schoolAId,
        primaryName: "Guardian A",
        primaryPhone: "+919876543210",
        primaryRelation: "Father",
      },
    });

    const studentRecordA = await prisma.student.create({
      data: {
        userId: studentUserA.user.id,
        schoolId: schoolAId,
        admissionNo: `ADM-A-${uid}`,
        name: "Student A",
        rollNo: "101",
        sectionId: sectionAId,
        guardianId: guardianA.id,
      },
    });
    studentAId = studentRecordA.id;

    // Academic Structure for School B
    const clsB = await prisma.class.create({
      data: { name: `Grade 12 ${uid}`, schoolId: schoolBId, sessionId: sessionB.id },
    });
    const secB = await prisma.section.create({
      data: { name: "Section B", classId: clsB.id },
    });
    const studentRecordB = await prisma.student.create({
      data: {
        userId: studentUserB.user.id,
        schoolId: schoolBId,
        admissionNo: `ADM-B-${uid}`,
        name: "Student B",
        rollNo: "201",
        sectionId: secB.id,
      },
    });
    studentBId = studentRecordB.id;

    // Operational Personas (School A)
    const cashierA = await makeUser(`cashier_${uid}@schoola.edu`, "Cashier A", Role.ACCOUNTANT, schoolAId);
    cashierAToken = cashierA.token;

    const hrUserA = await makeUser(`hr_${uid}@schoola.edu`, "HR Officer A", Role.HR, schoolAId);
    hrUserAToken = hrUserA.token;

    const transportUserA = await makeUser(`transport_${uid}@schoola.edu`, "Fleet Mgr A", Role.ERP_ADMIN, schoolAId);
    transportUserAToken = transportUserA.token;

    // Configure Entitlements
    // School A: Transport + Library + Biometric (with HR dependency)
    await ModuleRegistryService.setSchoolModules(
      schoolAId,
      { HR_PAYROLL: true, TRANSPORT: true, LIBRARY: true, BIOMETRIC_ATTENDANCE: true },
      superAdminUserId
    );
    // School B: Library enabled, Transport disabled
    await ModuleRegistryService.setSchoolModules(
      schoolBId,
      { LIBRARY: true, TRANSPORT: false },
      superAdminUserId
    );
    // School C: Transport + Hostel enabled, Library disabled
    await ModuleRegistryService.setSchoolModules(
      schoolCId,
      { TRANSPORT: true, HOSTEL: true, LIBRARY: false },
      superAdminUserId
    );
  });

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 1: MANDATORY 15 TENANT ISOLATION TESTS
  // ═════════════════════════════════════════════════════════════════════

  it("[Isolation 1] School A admin cannot access School B student records", async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentBId}`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect([403, 404]).toContain(res.status);
    if (res.body.success) expect(res.body.data).toBeNull();
  });

  it("[Isolation 2] School B admin cannot access School A student records", async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentAId}`)
      .set("Authorization", `Bearer ${schoolBAdminToken}`);

    expect([403, 404]).toContain(res.status);
    if (res.body.success) expect(res.body.data).toBeNull();
  });

  it("[Isolation 3] School A parent cannot access School B student records", async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentBId}`)
      .set("Authorization", `Bearer ${parentAToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it("[Isolation 4] School B parent cannot access School A fee or invoice records", async () => {
    const inv = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentAId,
        amount: 15000,
        amountPaid: 0,
        remainingAmount: 15000,
        status: "PENDING",
        dueDate: new Date(Date.now() + 86400000),
      },
    });
    invoiceAId = inv.id;

    const res = await request(app)
      .get(`/api/v1/finance/invoices/${invoiceAId}`)
      .set("Authorization", `Bearer ${parentBToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it("[Isolation 5] Teacher access is restricted to their own school data", async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentBId}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it("[Isolation 6] Student cannot access other students' records", async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentBId}`)
      .set("Authorization", `Bearer ${studentAToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it("[Isolation 7] Finance/Cashier cannot perform academic mutations", async () => {
    const res = await request(app)
      .post(`/api/v1/academic/classes`)
      .set("Authorization", `Bearer ${cashierAToken}`)
      .send({ name: "Unauthorized Class by Cashier" });

    expect(res.status).toBe(403);
  });

  it("[Isolation 8] Teacher cannot access financial invoices", async () => {
    const res = await request(app)
      .get(`/api/v1/finance/invoices/${invoiceAId}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it("[Isolation 9] Super Admin accessing tenant private student data fails closed without trusted context", async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentAId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it("[Isolation 10] Missing authentication token fails closed with 401", async () => {
    const res = await request(app).get(`/api/v1/students/${studentAId}`);
    expect(res.status).toBe(401);
  });

  it("[Isolation 11] Invalid or corrupted tenant JWT fails closed", async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentAId}`)
      .set("Authorization", "Bearer invalid.token.payload");

    expect(res.status).toBe(401);
  });

  it("[Isolation 12] Cross-tenant object IDs in assignment requests are rejected", async () => {
    const res = await request(app)
      .post(`/api/v1/classes/${classAId}/students`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`)
      .send({ studentId: studentBId });

    expect([400, 403, 404]).toContain(res.status);
  });

  it("[Isolation 13] Diagnostic Event query strictly scopes by schoolId", async () => {
    const result = await DiagnosticEventService.query({
      schoolId: schoolAId,
      limit: 10,
    });
    expect(Array.isArray(result.events)).toBe(true);
    for (const ev of result.events) {
      if (ev.schoolId) expect(ev.schoolId).toBe(schoolAId);
    }
  });

  it("[Isolation 14] Export and report endpoints enforce tenant boundaries", async () => {
    const res = await request(app)
      .get(`/api/v1/finance/reports/fee-collection?schoolId=${schoolBId}`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect([400, 403, 404]).toContain(res.status);
  });

  it("[Isolation 15] Universal search does not leak cross-tenant records", async () => {
    const res = await request(app)
      .get(`/api/v1/search?q=ADM-B`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    if (res.status === 200 && res.body.data) {
      const results = res.body.data;
      const students = Array.isArray(results) ? results : (results.students || []);
      const leaked = students.filter((r: any) => r.admissionNo === `ADM-B-${uid}` || r.schoolId === schoolBId);
      expect(leaked.length).toBe(0);
    } else {
      expect([200, 400, 404]).toContain(res.status);
    }
  });

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 2: MODULAR SAAS ENTITLEMENTS (SCHOOL A vs B vs C)
  // ═════════════════════════════════════════════════════════════════════

  it("[Entitlement 1] School A has TRANSPORT enabled and can query vehicles", async () => {
    const res = await request(app)
      .get(`/api/v1/admin/transport/vehicles`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("[Entitlement 2] School B has TRANSPORT disabled: direct API request is rejected with 403 MODULE_DISABLED", async () => {
    const res = await request(app)
      .get(`/api/v1/admin/transport/vehicles`)
      .set("Authorization", `Bearer ${schoolBAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("MODULE_DISABLED");
    expect(res.body.module).toBe("TRANSPORT");
  });

  it("[Entitlement 3] School B has LIBRARY enabled and can access book catalog", async () => {
    const res = await request(app)
      .get(`/api/v1/library/books`)
      .set("Authorization", `Bearer ${schoolBAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("[Entitlement 4] School C has LIBRARY disabled: access is rejected with 403 MODULE_DISABLED", async () => {
    const res = await request(app)
      .get(`/api/v1/library/books`)
      .set("Authorization", `Bearer ${schoolCAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("MODULE_DISABLED");
    expect(res.body.module).toBe("LIBRARY");
  });

  it("[Entitlement 5] School C has HOSTEL enabled and can access rooms", async () => {
    const res = await request(app)
      .get(`/api/v1/ancillary/hostel/rooms`)
      .set("Authorization", `Bearer ${schoolCAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("[Entitlement 6] Super Admin can view Central Module Registry and per-school entitlements", async () => {
    const regRes = await request(app)
      .get(`/api/v1/saas/modules/registry`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(regRes.status).toBe(200);
    expect(regRes.body.data.length).toBeGreaterThanOrEqual(10);

    const schoolModulesRes = await request(app)
      .get(`/api/v1/saas/schools/${schoolAId}/modules`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(schoolModulesRes.status).toBe(200);
    expect(schoolModulesRes.body.data.schoolId).toBe(schoolAId);
  });

  it("[Entitlement 7] School user can fetch own active modules via /api/v1/schools/me/modules", async () => {
    const res = await request(app)
      .get(`/api/v1/schools/me/modules`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.schoolId).toBe(schoolAId);
    expect(Array.isArray(res.body.data.modules)).toBe(true);
  });

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 3: END-TO-END BUSINESS LIFECYCLES
  // ═════════════════════════════════════════════════════════════════════

  it("[E2E Finance] Collects offline cash fee payment and generates official receipt", async () => {
    const res = await request(app)
      .post(`/api/v1/finance/fee-collection/record-payment`)
      .set("Authorization", `Bearer ${cashierAToken}`)
      .send({
        studentId: studentAId,
        amountReceived: 10000,
        paymentMethod: "CASH",
        allocations: [{ invoiceId: invoiceAId, amount: 10000 }],
        remarks: "Counter cash collection simulation",
      });

    expect([200, 201]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      expect(res.body.success).toBe(true);
      const receipt = res.body.data.receipt || res.body.data;
      expect(receipt.receiptNo || receipt.receiptNumber || receipt.id).toBeDefined();
    }
  });

  it("[E2E Transport & IoT] Ingests hardware GPS telemetry and exposes live moving location", async () => {
    // 1. Create Route and Stop
    const route = await prisma.transportRoute.create({
      data: {
        schoolId: schoolAId,
        name: `Route North ${uid}`,
      },
    });
    routeAId = route.id;

    const stop = await prisma.transportStop.create({
      data: {
        routeId: routeAId,
        name: "Central Square Stop",
        latitude: 12.9716,
        longitude: 77.5946,
      },
    });
    stopAId = stop.id;

    // 2. Create Vehicle
    const vehicle = await prisma.transportVehicle.create({
      data: {
        schoolId: schoolAId,
        registrationNumber: `KA-04-E2E-${Date.now()}`,
        vehicleType: "BUS",
        capacity: 40,
        status: "ACTIVE",
      },
    });
    vehicleAId = vehicle.id;

    // 3. Generate Hardware IoT Token
    const deviceToken = generateVehicleHardwareToken(vehicleAId, schoolAId);

    // 4. Ingest Telemetry
    const telemetryRes = await request(app)
      .post(`/api/v1/admin/transport/vehicles/${vehicleAId}/telemetry`)
      .set("X-Device-Token", deviceToken)
      .send({
        latitude: 12.9725,
        longitude: 77.5955,
        speed: 38.5,
        heading: 180,
      });

    expect(telemetryRes.status).toBe(200);
    expect(telemetryRes.body.success).toBe(true);

    // 5. Query Location as School Admin
    const locRes = await request(app)
      .get(`/api/v1/admin/transport/vehicles/${vehicleAId}/location`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect(locRes.status).toBe(200);
    expect(locRes.body.data.latitude).toBe(12.9725);
    expect(locRes.body.data.speed).toBe(38.5);

    // 6. Cross-Tenant Check: School B Admin cannot see School A vehicle location
    const crossRes = await request(app)
      .get(`/api/v1/admin/transport/vehicles/${vehicleAId}/location`)
      .set("Authorization", `Bearer ${schoolBAdminToken}`);

    expect([403, 404]).toContain(crossRes.status);
  });

  it("[E2E Parent Transport] Parent A can fetch student bus allocation with vehicle info", async () => {
    // Allocate Student A to Stop A
    await prisma.transportAllocation.create({
      data: {
        schoolId: schoolAId,
        studentId: studentAId,
        stopId: stopAId,
        status: "ACTIVE",
      },
    });

    const res = await request(app)
      .get(`/api/v1/admin/transport/allocations?studentId=${studentAId}`)
      .set("Authorization", `Bearer ${parentAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("[E2E Biometrics] Ingests fingerprint event with deduplication idempotency and on-device privacy", async () => {
    const eventId = `bio-evt-${Date.now()}`;
    const deviceToken = generateBiometricHardwareToken("ZKT-01", schoolAId);

    // 1. Submit First Punch Event
    const punchRes = await request(app)
      .post(`/api/v1/attendance/biometric/event`)
      .set("X-Device-Token", deviceToken)
      .send({
        deviceId: "ZKT-01",
        schoolId: schoolAId,
        events: [
          {
            eventId,
            employeeId: teacherAEmployeeId,
            timestamp: new Date().toISOString(),
            eventType: "CHECK_IN",
            verificationMethod: "FINGERPRINT_ON_DEVICE",
          },
        ],
      });

    expect(punchRes.status).toBe(200);
    expect(punchRes.body.processedCount).toBe(1);
    expect(punchRes.body.ignoredCount).toBe(0);
    expect(punchRes.body.results[0].status).toBe("RECORDED");

    // 2. Re-submit identical event (Replay / Network retry) -> Idempotency check
    const replayRes = await request(app)
      .post(`/api/v1/attendance/biometric/event`)
      .set("X-Device-Token", deviceToken)
      .send({
        deviceId: "ZKT-01",
        schoolId: schoolAId,
        events: [
          {
            eventId,
            employeeId: teacherAEmployeeId,
            timestamp: new Date().toISOString(),
            eventType: "CHECK_IN",
            verificationMethod: "FINGERPRINT_ON_DEVICE",
          },
        ],
      });

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.processedCount).toBe(0);
    expect(replayRes.body.ignoredCount).toBe(1);
    expect(replayRes.body.results[0].status).toBe("DUPLICATE_IGNORED");

    // 3. Query Biometric Status: Certified On-Device Matching and BLOCKED_EXTERNAL
    const statusRes = await request(app)
      .get(`/api/v1/attendance/biometric/status`)
      .set("Authorization", `Bearer ${schoolAAdminToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.hardwareIntegrationStatus).toBe("BLOCKED_EXTERNAL");
    expect(statusRes.body.data.privacyCompliance).toBe("ON_DEVICE_TEMPLATE_MATCHING");
  });

  it("[E2E SHFI & Reliability] Records diagnostic event and advances incident lifecycle", async () => {
    // 1. Ingest Synthetic Failure Event
    const event = await DiagnosticEventService.ingest({
      eventType: "PAYMENT_TIMEOUT",
      schoolId: schoolAId,
      module: "FINANCE",
      service: "payment-gateway",
      operation: "RECONCILIATION_CHECK",
      severity: "HIGH",
      category: "INTEGRATION",
      errorCode: "GATEWAY_TIMEOUT",
      rawDescription: "Synthetic transient timeout in payment verification",
      actor: "INTEGRATION_TEST",
    });

    expect(event).toBeDefined();
    expect(event.id).toBeDefined();

    // 2. Create Incident
    const incident = IncidentService.createManualIncident({
      title: `Simulated Finance Outage ${uid}`,
      summary: "Automated test incident verification",
      severity: "HIGH",
      schoolId: schoolAId,
      affectedService: "payment-gateway",
      affectedModule: "FINANCE",
      actor: "SIMULATION_HARNESS",
    });

    expect(incident).toBeDefined();
    expect(incident.id).toBeDefined();
    expect(incident.status).toBe("TRIAGED");

    // 3. Transition: TRIAGED -> INVESTIGATING
    const updated = IncidentService.transitionStatus(
      incident.id,
      "INVESTIGATING",
      { id: superAdminUserId, role: "SUPER_ADMIN" },
      { resolutionNotes: "SRE acknowledged alert" }
    );
    expect(updated.status).toBe("INVESTIGATING");

    // 4. Transition: INVESTIGATING -> RESOLVED
    const resolved = IncidentService.transitionStatus(
      incident.id,
      "RESOLVED",
      { id: superAdminUserId, role: "SUPER_ADMIN" },
      { resolutionNotes: "Root cause mitigated in simulation" }
    );
    expect(resolved.status).toBe("RESOLVED");
  });
});
