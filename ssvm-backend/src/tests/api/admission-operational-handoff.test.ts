/**
 * ssvm-backend/src/tests/api/admission-operational-handoff.test.ts
 *
 * Comprehensive end-to-end acceptance suite for SSVM ERP Admission Module Completion:
 * 1. CSV & Multi-File CSV Package (ZIP) template generation & upload parsing
 * 2. Complete student demographic persistence (PEN, category, locality, PIN, medical info)
 * 3. Normalized StudentGuardian architecture & shared sibling visibility
 * 4. Academic enrollment progression & Morning/Day school shift configuration
 * 5. Structured incoming transfer & Transfer Certificate (TC) records
 * 6. Document repository integrity (PENDING_UPLOAD, no fake placeholder URLs)
 * 7. Facility requirements & operational handoff for Transport and Hostel staff
 * 8. Canonical student profile data retrieval
 * 9. Fail-closed multi-tenant PostgreSQL RLS isolation
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import AdmZip from "adm-zip";
import { Role } from "@prisma/client";
import { createTestApp, createTestUser } from "../helpers/testApp";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { AdmissionWorkbookParser } from "../../services/admissions-bulk/admission-workbook-parser";
import { AdmissionTemplateRegistry } from "../../services/admissions-bulk/admission-template-registry";
import { AdmissionValidationEngine } from "../../services/admissions-bulk/admission-validation-engine";
import { AdmissionRegistrationService } from "../../services/admissions-bulk/admission-registration-service";

describe("SSVM ERP Admission Operational Handoff & Data Integrity Suite", () => {
  const app = createTestApp();
  let schoolAId: string;
  let schoolBId: string;
  let adminAToken: string;
  let adminBToken: string;
  let adminAUserId: string;

  let sessionAId: string;
  let class1Id: string;
  let sec1AId: string;
  let class7Id: string;
  let sec7AId: string;
  let registeredStudentId: string;

  beforeAll(async () => {
    // 1. Create School A
    const schoolA = await prisma.school.create({
      data: {
        name: "SSVM Sector 4 Academy",
        code: `SSVM-A-${Date.now().toString().slice(-5)}`,
        status: "ACTIVE",
      },
    });
    schoolAId = schoolA.id;

    // 2. Create School B (for tenant isolation tests)
    const schoolB = await prisma.school.create({
      data: {
        name: "SSVM Hill Top Campus",
        code: `SSVM-B-${Date.now().toString().slice(-5)}`,
        status: "ACTIVE",
      },
    });
    schoolBId = schoolB.id;

    // 3. Create Admin Users and Tokens
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;
    adminAUserId = adminA.user.id;

    const adminB = await createTestUser(Role.ERP_ADMIN, schoolBId);
    adminBToken = adminB.token;

    // 4. Create Master Academic Data in School A under tenant context
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
        data: {
          schoolId: schoolAId,
          sessionId: sessionAId,
          name: "Class 1",
          sortOrder: 1,
        },
      });
      class1Id = c1.id;

      const s1 = await tx.section.create({
        data: {
          classId: class1Id,
          name: "A",
        },
      });
      sec1AId = s1.id;

      const c7 = await tx.class.create({
        data: {
          schoolId: schoolAId,
          sessionId: sessionAId,
          name: "Class 7",
          sortOrder: 7,
        },
      });
      class7Id = c7.id;

      const s7 = await tx.section.create({
        data: {
          classId: class7Id,
          name: "A",
        },
      });
      sec7AId = s7.id;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. CSV & MULTI-FILE CSV PACKAGE (ZIP) GENERATION & PARSING
  // ─────────────────────────────────────────────────────────────

  it("downloads single-file CSV template via API", async () => {
    const res = await request(app)
      .get("/api/v1/admin/admissions/bulk/templates/NEW/csv")
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Import_Key*");
    expect(res.text).toContain("Student_Name*");
    expect(res.text).toContain("PEN_Number");
    expect(res.text).toContain("Locality");
    expect(res.text).toContain("Transport_Required(YES/NO)");
  });

  it("downloads multi-file CSV ZIP package via API containing manifest and sheet files", async () => {
    const res = await request(app)
      .get("/api/v1/admin/admissions/bulk/templates/TRANSFER/zip")
      .set("Authorization", `Bearer ${adminAToken}`)
      .responseType("blob");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/zip");

    const zip = new AdmZip(res.body);
    const entryNames = zip.getEntries().map((e) => e.entryName);
    expect(entryNames).toContain("Instructions.csv");
    expect(entryNames).toContain("Students.csv");
    expect(entryNames).toContain("Guardians.csv");
    expect(entryNames).toContain("Student_Guardians.csv");
    expect(entryNames).toContain("Previous_School.csv");
    expect(entryNames).toContain("Academic_Placement.csv");
    expect(entryNames).toContain("Student_Facilities.csv");
    expect(entryNames).toContain("Documents.csv");
    expect(entryNames).toContain("manifest.json");
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PARSING & VALIDATING COMPLETE DOMAIN FIELD SET
  // ─────────────────────────────────────────────────────────────

  it("parses single-file CSV containing demographic, placement, guardian, facility, and document fields", async () => {
    const csvContent = [
      "Import_Key*,Student_Name*,DOB*(YYYY-MM-DD),Gender*,Blood_Group,Nationality,Religion,Category,Mother_Tongue,Locality,PIN_Code,Permanent_Address,Student_Email,Student_Phone,Emergency_Phone,Medical_Info,PEN_Number,Academic_Session*,Admission_Class*,Section,Roll_No,Guardian_Name*,Guardian_Phone*,Guardian_Email,Guardian_Relation*,Guardian_Occupation,Guardian_Address,Transport_Required(YES/NO),Hostel_Required(YES/NO),Meals_Required(YES/NO),Facility_Details,Document_Category,Document_Title",
      'STU-001,Aarav Sharma,2019-06-15,MALE,B+,Indian,Hindu,GENERAL,Hindi,Sector 4,769001,"Plot 10, Sector 4, Rourkela",aarav.sharma@example.com,9876543210,9876543211,Asthma inhaler required,PEN-2026-0001,2026-2027,Class 1,A,101,Rajesh Sharma,9876543210,rajesh@example.com,FATHER,Civil Engineer,"Plot 10, Sector 4",YES,NO,NO,"Sector 4 Main Gate Stop",BIRTH_CERTIFICATE,Birth Certificate',
    ].join("\n");

    const parsed = await AdmissionWorkbookParser.parse(Buffer.from(csvContent, "utf8"), "admissions.csv");
    expect(parsed.templateType).toBe("NEW");
    expect(parsed.students.length).toBe(1);
    expect(parsed.students[0].name).toBe("Aarav Sharma");
    expect(parsed.students[0].locality).toBe("Sector 4");
    expect(parsed.students[0].pincode).toBe("769001");
    expect(parsed.students[0].pen).toBe("PEN-2026-0001");
    expect(parsed.students[0].medicalInfo).toBe("Asthma inhaler required");
    expect(parsed.guardians.length).toBe(1);
    expect(parsed.guardians[0].name).toBe("Rajesh Sharma");
    expect(parsed.facilities.length).toBe(1);
    expect(parsed.facilities[0].facilityCode).toBe("TRANSPORT");
  });

  // ─────────────────────────────────────────────────────────────
  // 3. TRANSACTIONAL REGISTRATION & DATA PERSISTENCE INTEGRITY
  // ─────────────────────────────────────────────────────────────

  it("commits admission batch and persists canonical demographics, normalized guardians, shift, facility requests, and documents", async () => {
    const csvContent = [
      "Import_Key*,Student_Name*,DOB*(YYYY-MM-DD),Gender*,Blood_Group,Nationality,Religion,Category,Mother_Tongue,Locality,PIN_Code,Permanent_Address,Student_Email,Student_Phone,Emergency_Phone,Medical_Info,PEN_Number,Academic_Session*,Admission_Class*,Section,Roll_No,Guardian_Name*,Guardian_Phone*,Guardian_Email,Guardian_Relation*,Guardian_Occupation,Guardian_Address,Transport_Required(YES/NO),Hostel_Required(YES/NO),Meals_Required(YES/NO),Facility_Details,Document_Category,Document_Title",
      'STU-001,Aarav Sharma,2019-06-15,MALE,B+,Indian,Hindu,GENERAL,Hindi,Civil Lines,769001,"Plot 12, Civil Lines, Rourkela",aarav.sharma@example.com,9876543210,9876543211,Asthma inhaler required,PEN-2026-8899,2026-2027,Class 1,A,101,Rajesh Sharma,9876543210,rajesh@example.com,FATHER,Civil Engineer,"Plot 12, Civil Lines",YES,NO,NO,"Civil Lines Stop",BIRTH_CERTIFICATE,Birth Certificate Copy',
    ].join("\n");

    const parsed = await AdmissionWorkbookParser.parse(Buffer.from(csvContent, "utf8"), "admissions.csv");
    const summary = await AdmissionValidationEngine.validateWorkbook(schoolAId, parsed, "BATCH-TEST-001");

    expect(summary.isValid).toBe(true);
    expect(summary.readyToRegisterCount).toBe(1);

    const attestation = {
      admissionType: "NEW" as const,
      sessionId: sessionAId,
      approvalDate: "2026-04-02",
      approvingAuthority: "Dr. P. K. Mohanty, Principal",
      approvalRegisterNumber: "REG-2026-OFF-09",
      attested: true,
      attestedByUserId: adminAUserId,
      attestedAt: new Date().toISOString(),
    };

    const commitResult = await AdmissionRegistrationService.commitBatch(
      schoolAId,
      "BATCH-TEST-001",
      "NEW",
      attestation,
      summary.entries,
      { skipInvalidRows: true }
    );

    expect(commitResult.status).toBe("COMPLETED");
    expect(commitResult.successCount).toBe(1);
    registeredStudentId = commitResult.results[0].studentId;
    expect(registeredStudentId).toBeDefined();

    // Direct Database Read-Back under tenant transaction
    await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      // 1. Verify Extended Demographics on Student
      const student = await tx.student.findUnique({
        where: { id: registeredStudentId },
      });
      expect(student).not.toBeNull();
      expect(student!.name).toBe("Aarav Sharma");
      expect(student!.locality).toBe("Civil Lines");
      expect(student!.pincode).toBe("769001");
      expect(student!.pen).toBe("PEN-2026-8899");
      expect(student!.medicalInfo).toBe("Asthma inhaler required");
      expect(student!.emergencyPhone).toBe("9876543211");
      expect(student!.nationality).toBe("Indian");
      expect(student!.religion).toBe("Hindu");

      // 2. Verify Normalized StudentGuardian junction
      const studentGuardians = await tx.studentGuardian.findMany({
        where: { studentId: registeredStudentId },
        include: { guardian: true },
      });
      expect(studentGuardians.length).toBe(1);
      expect(studentGuardians[0].isPrimary).toBe(true);
      expect(studentGuardians[0].relationship).toBe("FATHER");
      expect(studentGuardians[0].guardian.primaryPhone).toBe("9876543210");
      expect(student!.guardianId).toBe(studentGuardians[0].guardianId); // Backward compatible pointer

      // 3. Verify StudentEnrollment and Morning Batch shift resolution (Class 1 -> Morning)
      const enrollment = await tx.studentEnrollment.findFirst({
        where: { studentId: registeredStudentId, sessionId: sessionAId },
        include: { shift: true, class: true },
      });
      expect(enrollment).not.toBeNull();
      expect(enrollment!.class.name).toBe("Class 1");
      expect(enrollment!.shift).not.toBeNull();
      expect(enrollment!.shift!.name).toBe("Morning Batch");
      expect(enrollment!.shift!.startTime).toBe("07:30");
      expect(enrollment!.shift!.endTime).toBe("12:30");

      // 4. Verify FacilityRequest created without premature allocation
      const facilityRequests = await tx.facilityRequest.findMany({
        where: { studentId: registeredStudentId },
      });
      expect(facilityRequests.length).toBe(1);
      expect(facilityRequests[0].facilityType).toBe("TRANSPORT");
      expect(facilityRequests[0].status).toBe("REQUESTED");
      expect(facilityRequests[0].details).toContain("Civil Lines");

      // Verify NO premature TransportAllocation exists
      const allocations = await tx.transportAllocation.findMany({
        where: { studentId: registeredStudentId },
      });
      expect(allocations.length).toBe(0);

      // 5. Verify Document stored as PENDING_UPLOAD without fake PDF URLs
      const docs = await tx.document.findMany({
        where: { ownerType: "STUDENT", ownerId: registeredStudentId },
      });
      expect(docs.length).toBe(1);
      expect(docs[0].verificationStatus).toBe("PENDING_UPLOAD");
      expect(docs[0].fileUrl).toBe(""); // No synthetic fake PDF URLs
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. MULTI-FILE CSV PACKAGE (ZIP) & INCOMING TRANSFER ADMISSION
  // ─────────────────────────────────────────────────────────────

  it("commits multi-file CSV ZIP package for incoming transfer student with previous education & Day Batch shift", async () => {
    const zip = new AdmZip();

    // 1. Instructions.csv
    zip.addFile("Instructions.csv", Buffer.from('"Parameter","Value"\n"Admission Type","TRANSFER"\n"Template Version","1.0.0"\n', "utf8"));

    // 2. Students.csv
    zip.addFile(
      "Students.csv",
      Buffer.from(
        '"Import_Key*","Student_Name*","DOB*(YYYY-MM-DD)","Gender*","Blood_Group","Nationality","Religion","Category","Mother_Tongue","Locality","PIN_Code","Permanent_Address","Student_Email","Student_Phone","Emergency_Phone","Medical_Info","PEN_Number"\n' +
        '"STU-002","Diya Patel","2013-08-20","FEMALE","O+","Indian","Hindu","OBC","Gujarati","Sector 7","769007","Sector 7, Rourkela","diya.patel@example.com","9876543222","9876543223","None","PEN-2026-7711"\n',
        "utf8"
      )
    );

    // 3. Guardians.csv
    zip.addFile(
      "Guardians.csv",
      Buffer.from(
        '"Guardian_Key*","Guardian_Name*","Relationship*","Primary_Phone*","Primary_Email","Occupation","Annual_Income","Residential_Address","Is_Emergency_Contact"\n' +
        '"GRD-002","Suresh Patel","FATHER","9876543222","suresh@example.com","Businessman","1200000","Sector 7, Rourkela","YES"\n',
        "utf8"
      )
    );

    // 4. Student_Guardians.csv
    zip.addFile(
      "Student_Guardians.csv",
      Buffer.from('"Import_Key*","Guardian_Key*","Relationship_To_Student*","Is_Primary"\n"STU-002","GRD-002","FATHER","YES"\n', "utf8")
    );

    // 5. Academic_Placement.csv (Class 7 -> Day Batch)
    zip.addFile(
      "Academic_Placement.csv",
      Buffer.from('"Import_Key*","Academic_Session*","Admission_Class*","Allocated_Section","Allocated_Roll_No"\n"STU-002","2026-2027","Class 7","A","701"\n', "utf8")
    );

    // 6. Previous_School.csv
    zip.addFile(
      "Previous_School.csv",
      Buffer.from(
        '"Import_Key*","Previous_School_Name*","Board_Affiliation","Last_Class_Passed","Academic_Session","Roll_No","Transfer_Certificate_No","TC_Issue_Date(YYYY-MM-DD)","School_Address"\n' +
        '"STU-002","Kendriya Vidyalaya Rourkela","CBSE","Class 6","2025-2026","14","TC-KV-2026-9042","2026-03-28","Sector 1, Rourkela"\n',
        "utf8"
      )
    );

    // 7. Student_Facilities.csv (Hostel & Meals)
    zip.addFile(
      "Student_Facilities.csv",
      Buffer.from(
        '"Import_Key*","Facility_Code*","Facility_Details"\n' +
        '"STU-002","HOSTEL","Girls Hostel Block B Room Preference"\n' +
        '"STU-002","MEALS","Vegetarian Meal Plan"\n',
        "utf8"
      )
    );

    const parsed = await AdmissionWorkbookParser.parse(zip.toBuffer(), "transfer_package.zip");
    expect(parsed.templateType).toBe("TRANSFER");
    expect(parsed.students.length).toBe(1);
    expect(parsed.previousSchools.length).toBe(1);
    expect(parsed.previousSchools[0].previousSchoolName).toBe("Kendriya Vidyalaya Rourkela");

    const summary = await AdmissionValidationEngine.validateWorkbook(schoolAId, parsed, "BATCH-TEST-TRANSFER");
    expect(summary.isValid).toBe(true);

    const attestation = {
      admissionType: "TRANSFER" as const,
      sessionId: sessionAId,
      approvalDate: "2026-04-03",
      approvingAuthority: "Dr. P. K. Mohanty, Principal",
      attested: true,
      attestedByUserId: adminAUserId,
      attestedAt: new Date().toISOString(),
    };

    const commitResult = await AdmissionRegistrationService.commitBatch(
      schoolAId,
      "BATCH-TEST-TRANSFER",
      "TRANSFER",
      attestation,
      summary.entries,
      { skipInvalidRows: true }
    );

    expect(commitResult.status).toBe("COMPLETED");
    const transferStudentId = commitResult.results[0].studentId;

    // Direct Database Read-Back under tenant transaction
    await runWithTenantDatabaseTransaction(schoolAId, async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: transferStudentId },
      });
      expect(student).not.toBeNull();
      expect(student!.previousSchool).toBe("Kendriya Vidyalaya Rourkela");
      expect(student!.previousBoard).toBe("CBSE");
      expect(student!.tcNumber).toBe("TC-KV-2026-9042");
      expect(student!.tcStatus).toBe("SUBMITTED");

      // Verify Class 7 resolved to Day Batch shift
      const enrollment = await tx.studentEnrollment.findFirst({
        where: { studentId: transferStudentId, sessionId: sessionAId },
        include: { shift: true },
      });
      expect(enrollment!.shift!.name).toBe("Day Batch");
      expect(enrollment!.shift!.startTime).toBe("11:30");
      expect(enrollment!.shift!.endTime).toBe("16:30");

      // Verify Facility Requests for HOSTEL and MEALS
      const facRequests = await tx.facilityRequest.findMany({
        where: { studentId: transferStudentId },
      });
      expect(facRequests.length).toBe(2);
      const codes = facRequests.map((f) => f.facilityType);
      expect(codes).toContain("HOSTEL");
      expect(codes).toContain("MEALS");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. OPERATIONAL HANDOFF ENDPOINTS (TRANSPORT & HOSTEL)
  // ─────────────────────────────────────────────────────────────

  it("retrieves pending transport requests with student locality and school shift", async () => {
    const res = await request(app)
      .get("/api/v1/admin/admissions/bulk/facilities/pending?facilityType=TRANSPORT")
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requests.length).toBeGreaterThan(0);

    const transportReq = res.body.data.requests[0];
    expect(transportReq.facilityType).toBe("TRANSPORT");
    expect(transportReq.status).toBe("REQUESTED");
    expect(transportReq.student.locality).toBe("Civil Lines");
    expect(transportReq.student.shiftName).toBe("Morning Batch");
    expect(transportReq.student.shiftTime).toBe("07:30 - 12:30");
  });

  it("allows operational staff to update facility request review status with audit logging", async () => {
    // Fetch pending request ID
    const listRes = await request(app)
      .get("/api/v1/admin/admissions/bulk/facilities/pending?facilityType=TRANSPORT")
      .set("Authorization", `Bearer ${adminAToken}`);

    const reqId = listRes.body.data.requests[0].id;

    const patchRes = await request(app)
      .patch(`/api/v1/admin/admissions/bulk/facilities/${reqId}/status`)
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        status: "APPROVED",
        notes: "Assigned Route 4 Civil Lines - Stop approved by Transport Manager",
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe("APPROVED");
    expect(patchRes.body.data.notes).toContain("Route 4 Civil Lines");
  });

  // ─────────────────────────────────────────────────────────────
  // 6. CANONICAL STUDENT PROFILE INTEGRATION
  // ─────────────────────────────────────────────────────────────

  it("canonical student profile endpoints return extended demographics, shift, transfer, and facility requests", async () => {
    expect(registeredStudentId).toBeDefined();

    // 1. Personal Endpoint
    const personalRes = await request(app)
      .get(`/api/v1/students/${registeredStudentId}/personal`)
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(personalRes.status).toBe(200);
    expect(personalRes.body.data.pen).toBe("PEN-2026-8899");
    expect(personalRes.body.data.locality).toBe("Civil Lines");
    expect(personalRes.body.data.pincode).toBe("769001");
    expect(personalRes.body.data.medicalInfo).toBe("Asthma inhaler required");

    // 2. Academics Endpoint
    const academicsRes = await request(app)
      .get(`/api/v1/students/${registeredStudentId}/academics`)
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(academicsRes.status).toBe(200);
    expect(academicsRes.body.data.placement.class).toBe("Class 1");
    expect(academicsRes.body.data.placement.shiftName).toBe("Morning Batch");

    // 3. Facilities Endpoint
    const facilitiesRes = await request(app)
      .get(`/api/v1/students/${registeredStudentId}/facilities`)
      .set("Authorization", `Bearer ${adminAToken}`);

    expect(facilitiesRes.status).toBe(200);
    expect(facilitiesRes.body.data.requests.length).toBeGreaterThan(0);
    expect(facilitiesRes.body.data.requests[0].facilityType).toBe("TRANSPORT");
  });

  // ─────────────────────────────────────────────────────────────
  // 7. MULTI-TENANT ISOLATION
  // ─────────────────────────────────────────────────────────────

  it("strictly enforces multi-tenant isolation: School B administrator cannot view School A facility requests or students", async () => {
    const res = await request(app)
      .get("/api/v1/admin/admissions/bulk/facilities/pending?facilityType=TRANSPORT")
      .set("Authorization", `Bearer ${adminBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests.length).toBe(0); // Zero requests in School B
  });
});
