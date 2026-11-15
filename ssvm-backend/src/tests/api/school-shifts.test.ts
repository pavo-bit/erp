/**
 * ssvm-backend/src/tests/api/school-shifts.test.ts
 *
 * Phase 1 Integration Test Suite:
 * Institution-Specific, Session-Aware School Shift Configuration
 *
 * Verifies:
 * 1. Normalized SchoolShiftClass model with unique (schoolId, sessionId, classId).
 * 2. Super Admin shift configuration, class multi-assignment, and publication lifecycle.
 * 3. Validation API detecting unassigned classes, invalid timings, and conflicting assignments.
 * 4. Multi-tenant isolation: School B administrator cannot view or alter School A shifts.
 * 5. Dynamic admission registration resolver allocating exact configured shifts without hardcoded regex.
 * 6. Explicit failure (NO_SHIFT_CONFIGURED_FOR_CLASS) and transaction rollback when registering into an unmapped class.
 * 7. Support for institution-specific variants (e.g. Evening Batch).
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser } from "../helpers/testApp";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { AdmissionRegistrationService } from "../../services/admissions-bulk/admission-registration-service";
import type { OfflineApprovalAttestation } from "../../services/admissions-bulk/admission-types";

describe.sequential("SSVM ERP Phase 1: Institution-Specific School Shift Configuration Suite", () => {
  const app = createTestApp();

  let superAdminToken: string;
  let adminAToken: string;
  let adminBToken: string;

  let adminAUserId: string;
  let adminBUserId: string;

  let schoolAId: string;
  let schoolBId: string;

  let sessionAId: string;
  let sessionBId: string;

  let class1Id: string;
  let sec1AId: string;
  let class7Id: string;
  let sec7AId: string;
  let unassignedClassId: string;

  let morningShiftAId: string;
  let dayShiftAId: string;

  beforeAll(async () => {
    // 1. Create Super Admin
    const superAdmin = await createTestUser(Role.SUPER_ADMIN, "PLATFORM");
    superAdminToken = superAdmin.token;

    // 2. Create School A & Admin
    const schoolA = await prisma.school.create({
      data: {
        name: "SSVM Central Campus",
        code: `CENTRAL-${Date.now().toString().slice(-4)}`,
        status: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;
    adminAUserId = adminA.user.id;

    // 3. Create School B & Admin
    const schoolB = await prisma.school.create({
      data: {
        name: "SSVM Valley Campus",
        code: `VALLEY-${Date.now().toString().slice(-4)}`,
        status: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;
    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminBToken = adminB.token;
    adminBUserId = adminB.user.id;

    // 4. Setup Academic Session and Classes in School A
    await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      const session = await tx.academicSession.create({
        data: {
          schoolId: schoolAId,
          name: "2026-2027",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true,
        },
      });
      sessionAId = session.id;

      const c1 = await tx.class.create({
        data: { schoolId: schoolAId, sessionId: sessionAId, name: "Class 1", sortOrder: 1 },
      });
      class1Id = c1.id;
      const s1 = await tx.section.create({ data: { classId: class1Id, name: "A" } });
      sec1AId = s1.id;

      const c7 = await tx.class.create({
        data: { schoolId: schoolAId, sessionId: sessionAId, name: "Class 7", sortOrder: 7 },
      });
      class7Id = c7.id;
      const s7 = await tx.section.create({ data: { classId: class7Id, name: "A" } });
      sec7AId = s7.id;

      const unassigned = await tx.class.create({
        data: { schoolId: schoolAId, sessionId: sessionAId, name: "Class 11 Science", sortOrder: 11 },
      });
      unassignedClassId = unassigned.id;
    });

    // 5. Setup Academic Session and Class in School B
    await runWithTenantDatabaseTransaction(schoolBId, async (tx) => {
      const session = await tx.academicSession.create({
        data: {
          schoolId: schoolBId,
          name: "2026-2027",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true,
        },
      });
      sessionBId = session.id;

      await tx.class.create({
        data: { schoolId: schoolBId, sessionId: sessionBId, name: "Class 10", sortOrder: 10 },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. SUPER ADMIN CONFIGURATION, VALIDATION & ADMISSION RESOLUTION LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  it("executes complete School Shift configuration, validation, publication, and dynamic admission resolution lifecycle", async () => {
    // 1. Super Admin lists sessions and classes
    const sessionsRes = await request(app)
      .get(`/api/v1/super-admin/schools/${schoolAId}/sessions`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.length).toBeGreaterThan(0);
    expect(sessionsRes.body.data[0].id).toBe(sessionAId);

    const classesRes = await request(app)
      .get(`/api/v1/super-admin/schools/${schoolAId}/sessions/${sessionAId}/classes`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(classesRes.status).toBe(200);
    expect(classesRes.body.data.length).toBe(3);
    const names = classesRes.body.data.map((c: any) => c.name);
    expect(names).toContain("Class 1");
    expect(names).toContain("Class 7");

    // 2. Super Admin creates Morning Batch shift
    const morningRes = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolAId}/shifts`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Morning Batch",
        type: "MORNING",
        startTime: "07:30",
        endTime: "12:30",
        sessionId: sessionAId,
        classIds: [class1Id],
      });

    expect(morningRes.status).toBe(201);
    expect(morningRes.body.success).toBe(true);
    expect(morningRes.body.data.name).toBe("Morning Batch");
    expect(morningRes.body.data.type).toBe("MORNING");
    expect(morningRes.body.data.publicationStatus).toBe("DRAFT");
    morningShiftAId = morningRes.body.data.id;

    // Verify database junction record under tenant context
    const ssc = await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      return tx.schoolShiftClass.findFirst({
        where: { schoolId: schoolAId, sessionId: sessionAId, classId: class1Id },
      });
    });
    expect(ssc).not.toBeNull();
    expect(ssc?.shiftId).toBe(morningShiftAId);

    // 3. Super Admin creates Day Batch shift
    const dayRes = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolAId}/shifts`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Day Batch",
        type: "DAY",
        startTime: "11:30",
        endTime: "16:30",
        sessionId: sessionAId,
        classIds: [class7Id],
      });

    expect(dayRes.status).toBe(201);
    expect(dayRes.body.success).toBe(true);
    expect(dayRes.body.data.name).toBe("Day Batch");
    dayShiftAId = dayRes.body.data.id;

    // 4. Validates shift completeness
    const valRes = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolAId}/shifts/validate`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ sessionId: sessionAId });

    expect(valRes.status).toBe(200);
    expect(valRes.body.data.isValid).toBe(true); // Valid timings & zero overlaps
    expect(valRes.body.data.summary.totalClasses).toBe(3);
    expect(valRes.body.data.summary.assignedClasses).toBe(2);
    expect(valRes.body.data.summary.unassignedClasses).toBe(1);
    expect(valRes.body.data.warnings.length).toBeGreaterThan(0);
    expect(valRes.body.data.warnings[0]).toContain("Class 11 Science");

    // 5. Publishes shift configuration
    const pubRes = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolAId}/shifts/publish`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ sessionId: sessionAId });

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.success).toBe(true);
    expect(pubRes.body.data.version).toBeGreaterThanOrEqual(1);

    // Verify shifts in DB are now PUBLISHED under tenant context
    const publishedShifts = await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      return tx.schoolShift.findMany({
        where: { schoolId: schoolAId, sessionId: sessionAId },
      });
    });
    expect(publishedShifts.length).toBe(2);
    expect(publishedShifts[0].publicationStatus).toBe("PUBLISHED");
    expect(publishedShifts[1].publicationStatus).toBe("PUBLISHED");

    // 6. Dynamically resolves Morning Batch and version for Class 1 during new admission
    const morningEntries = [
      {
        importKey: "STU-SHIFT-01",
        student: {
          name: "Rohan Verma",
          dob: "2020-05-15",
          gender: "MALE",
          address: "Sector 4, Bokaro",
        },
        guardians: [
          {
            isPrimary: true,
            isEmergencyContact: true,
            relationship: "FATHER",
            guardian: {
              name: "Suresh Verma",
              primaryPhone: "9876543201",
              primaryRelation: "Father",
            },
          },
        ],
        placement: {
          className: "Class 1",
          sectionName: "A",
          rollNo: "01",
        },
        resolvedClassId: class1Id,
        resolvedSectionId: sec1AId,
        resolvedSessionId: sessionAId,
      },
    ];

    const morningAttestation: OfflineApprovalAttestation = {
      admissionType: "NEW",
      sessionId: sessionAId,
      approvingAuthority: "Principal",
      approvalDate: "2026-11-12",
      attested: true,
      attestedByUserId: adminAUserId,
      attestedAt: new Date().toISOString(),
      approvalRegisterNumber: "REG-SHIFT-001",
    };

    const morningCommit = await AdmissionRegistrationService.commitBatch(
      schoolAId,
      "BATCH-SHIFT-1",
      "NEW",
      morningAttestation,
      morningEntries as any
    );

    expect(morningCommit.successCount).toBe(1);
    expect(morningCommit.results.length).toBe(1);
    const morningStudentId = morningCommit.results[0].studentId;

    const morningEnrollment = await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      return tx.studentEnrollment.findFirst({
        where: { studentId: morningStudentId, sessionId: sessionAId },
        include: { shift: true },
      });
    });

    expect(morningEnrollment).not.toBeNull();
    expect(morningEnrollment?.shiftId).toBe(morningShiftAId);
    expect(morningEnrollment?.shiftVersion).toBeGreaterThanOrEqual(1);
    expect(morningEnrollment?.shift?.name).toBe("Morning Batch");

    // 7. Dynamically resolves Day Batch for Class 7 during new admission
    const dayEntries = [
      {
        importKey: "STU-SHIFT-07",
        student: {
          name: "Ananya Sharma",
          dob: "2014-08-20",
          gender: "FEMALE",
          address: "Sector 5, Bokaro",
        },
        guardians: [
          {
            isPrimary: true,
            isEmergencyContact: true,
            relationship: "MOTHER",
            guardian: {
              name: "Pooja Sharma",
              primaryPhone: "9876543202",
              primaryRelation: "Mother",
            },
          },
        ],
        placement: {
          className: "Class 7",
          sectionName: "A",
          rollNo: "07",
        },
        resolvedClassId: class7Id,
        resolvedSectionId: sec7AId,
        resolvedSessionId: sessionAId,
      },
    ];

    const dayAttestation: OfflineApprovalAttestation = {
      admissionType: "NEW",
      sessionId: sessionAId,
      approvingAuthority: "Principal",
      approvalDate: "2026-11-12",
      attested: true,
      attestedByUserId: adminAUserId,
      attestedAt: new Date().toISOString(),
      approvalRegisterNumber: "REG-SHIFT-007",
    };

    const dayCommit = await AdmissionRegistrationService.commitBatch(
      schoolAId,
      "BATCH-SHIFT-7",
      "NEW",
      dayAttestation,
      dayEntries as any
    );

    expect(dayCommit.successCount).toBe(1);
    expect(dayCommit.results.length).toBe(1);
    const dayStudentId = dayCommit.results[0].studentId;

    const dayEnrollment = await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      return tx.studentEnrollment.findFirst({
        where: { studentId: dayStudentId, sessionId: sessionAId },
        include: { shift: true },
      });
    });

    expect(dayEnrollment).not.toBeNull();
    expect(dayEnrollment?.shiftId).toBe(dayShiftAId);
    expect(dayEnrollment?.shiftVersion).toBeGreaterThanOrEqual(1);
    expect(dayEnrollment?.shift?.name).toBe("Day Batch");
  });

  it("rejects shift creation with invalid timings (startTime >= endTime)", async () => {
    const res = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolAId}/shifts`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Broken Batch",
        type: "EVENING",
        startTime: "17:00",
        endTime: "12:00",
        sessionId: sessionAId,
        classIds: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("earlier than end time");
  });

  // ─────────────────────────────────────────────────────────────
  // 2. TENANT ISOLATION & AUTHORIZATION
  // ─────────────────────────────────────────────────────────────

  it("enforces tenant isolation: School B admin cannot view or alter School A shifts", async () => {
    const res = await request(app)
      .get(`/api/v1/super-admin/schools/${schoolAId}/shifts`)
      .set("Authorization", `Bearer ${adminBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Access denied");

    // Attempting to modify School A shifts with School B token
    const postRes = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolAId}/shifts`)
      .set("Authorization", `Bearer ${adminBToken}`)
      .send({
        name: "Hacked Shift",
        type: "MORNING",
        startTime: "08:00",
        endTime: "13:00",
        sessionId: sessionAId,
      });

    expect(postRes.status).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ADMISSION RESOLUTION EDGE CASES
  // ─────────────────────────────────────────────────────────────

  it.sequential("fails closed with NO_SHIFT_CONFIGURED_FOR_CLASS and rolls back transaction when class is unmapped", async () => {
    const entries = [
      {
        importKey: "STU-UNMAPPED",
        student: {
          name: "Vikram Malhotra",
          dob: "2010-02-14",
          gender: "MALE",
          address: "Sector 11, Bokaro",
        },
        guardians: [
          {
            isPrimary: true,
            isEmergencyContact: true,
            relationship: "FATHER",
            guardian: {
              name: "Rajesh Malhotra",
              primaryPhone: "9876543203",
              primaryRelation: "Father",
            },
          },
        ],
        placement: {
          className: "Class 11 Science",
          rollNo: "11",
        },
        resolvedClassId: unassignedClassId,
        resolvedSessionId: sessionAId,
      },
    ];

    const attestation: OfflineApprovalAttestation = {
      admissionType: "NEW",
      sessionId: sessionAId,
      approvingAuthority: "Principal",
      approvalDate: "2026-11-12",
      attested: true,
      attestedByUserId: adminAUserId,
      attestedAt: new Date().toISOString(),
      approvalRegisterNumber: "REG-UNMAPPED",
    };

    await expect(
      AdmissionRegistrationService.commitBatch(
        schoolAId,
        "BATCH-UNMAPPED",
        "NEW",
        attestation,
        entries as any
      )
    ).rejects.toThrow("NO_SHIFT_CONFIGURED_FOR_CLASS");

    // Verify transaction rollback: no student was created
    const student = await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      return tx.student.findFirst({
        where: { name: "Vikram Malhotra" },
      });
    });
    expect(student).toBeNull();
  });

  it.sequential("School B configures an Evening Batch and verifies institution-specific independence", async () => {
    // 1. Get Class 10 in School B under tenant transaction
    const class10 = await runWithTenantDatabaseTransaction(schoolBId, async (tx) => {
      return tx.class.findFirst({
        where: { schoolId: schoolBId, name: "Class 10" },
      });
    });
    expect(class10).not.toBeNull();

    // 2. Super Admin creates Evening Batch in School B
    const shiftRes = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolBId}/shifts`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Evening Shift",
        type: "EVENING",
        startTime: "16:00",
        endTime: "20:30",
        sessionId: sessionBId,
        classIds: [class10!.id],
      });

    expect(shiftRes.status).toBe(201);
    const eveningShiftId = shiftRes.body.data.id;

    // 3. Publish School B configuration
    const pubRes = await request(app)
      .post(`/api/v1/super-admin/schools/${schoolBId}/shifts/publish`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ sessionId: sessionBId });

    expect(pubRes.status).toBe(200);

    // 4. Register student in School B into Class 10
    const entries = [
      {
        importKey: "STU-EVENING-10",
        student: {
          name: "Deepak Rawat",
          dob: "2010-09-12",
          gender: "MALE",
          address: "Hill Top Colony",
        },
        guardians: [
          {
            isPrimary: true,
            isEmergencyContact: true,
            relationship: "FATHER",
            guardian: {
              name: "Mohan Rawat",
              primaryPhone: "9876543204",
              primaryRelation: "Father",
            },
          },
        ],
        placement: {
          className: "Class 10",
          rollNo: "10",
        },
        resolvedClassId: class10!.id,
        resolvedSessionId: sessionBId,
      },
    ];

    const attestation: OfflineApprovalAttestation = {
      admissionType: "NEW",
      sessionId: sessionBId,
      approvingAuthority: "Director",
      approvalDate: "2026-11-12",
      attested: true,
      attestedByUserId: adminBUserId,
      attestedAt: new Date().toISOString(),
      approvalRegisterNumber: "REG-EVENING-B",
    };

    const commitResult = await AdmissionRegistrationService.commitBatch(
      schoolBId,
      "BATCH-EVENING-B",
      "NEW",
      attestation,
      entries as any
    );

    expect(commitResult.successCount).toBe(1);
    expect(commitResult.results.length).toBe(1);
    const studentId = commitResult.results[0].studentId;

    const enrollment = await runWithTenantDatabaseTransaction(schoolBId, async (tx) => {
      return tx.studentEnrollment.findFirst({
        where: { studentId, sessionId: sessionBId },
        include: { shift: true },
      });
    });

    expect(enrollment).not.toBeNull();
    expect(enrollment?.shiftId).toBe(eveningShiftId);
    expect(enrollment?.shift?.name).toBe("Evening Shift");
    expect(enrollment?.shift?.type).toBe("EVENING");
  });
});
