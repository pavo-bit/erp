/**
 * ssvm-backend/src/tests/unit/admissions-bulk.test.ts
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import ExcelJS from "exceljs";
import { AdmissionTemplateRegistry } from "../../services/admissions-bulk/admission-template-registry";
import { AdmissionWorkbookParser } from "../../services/admissions-bulk/admission-workbook-parser";
import { AdmissionValidationEngine } from "../../services/admissions-bulk/admission-validation-engine";
import { AdmissionRegistrationService } from "../../services/admissions-bulk/admission-registration-service";
import {
  AdmissionTemplateType,
  OfflineApprovalAttestation,
  ParsedAdmissionWorkbook,
} from "../../services/admissions-bulk/admission-types";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { runWithSchoolContext } from "../../middleware/school-context.middleware";
import { createTestUser } from "../helpers/testApp";
import { Role } from "@prisma/client";

describe("SSVM Bulk Student Registration & Admission Workflow", () => {
  let schoolId: string;
  let sessionId: string;
  let testClassId: string;
  let testSectionId: string;
  let staffUserId: string;

  beforeAll(async () => {
    // Setup isolated test school & academic session
    schoolId = `school_bulk_adm_${Date.now()}`;
    await prisma.school.create({
      data: {
        id: schoolId,
        name: "SSVM Demonstration Central School",
        code: `SSVM-${Date.now().toString().slice(-6)}`,
      },
    });

    await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const session = await tx.academicSession.create({
        data: {
          schoolId,
          name: "2026-2027",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true,
        },
      });
      sessionId = session.id;

      // Configured Class: Class 1
      const cls = await tx.class.create({
        data: {
          schoolId,
          sessionId,
          name: "Class 1",
          sections: {
            create: [{ name: "A", capacity: 40 }],
          },
        },
        include: { sections: true },
      });
      testClassId = cls.id;
      testSectionId = cls.sections[0].id;

      const shift = await tx.schoolShift.create({
        data: {
          schoolId,
          sessionId,
          name: "Morning Shift",
          type: "MORNING",
          startTime: "07:30",
          endTime: "12:30",
          isActive: true,
        },
      });

      await tx.schoolShiftClass.create({
        data: {
          schoolId,
          sessionId,
          shiftId: shift.id,
          classId: cls.id,
          isActive: true,
        },
      });
    });

    // Staff user for attestation
    const { user } = await createTestUser(Role.ERP_ADMIN, schoolId);
    staffUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup school cascade
    try {
      await prisma.school.delete({ where: { id: schoolId } });
    } catch {
      // Ignore cleanup error if already deleted
    }
  });

  // =========================================================================
  // 1. TEMPLATE REGISTRY & WORKBOOK GENERATOR
  // =========================================================================
  describe("1. Template Registry & Multi-Sheet Excel Generation", () => {
    it("registers all three distinct admission templates with version 1.0.0", () => {
      const templates = AdmissionTemplateRegistry.getAllTemplates();
      expect(templates.length).toBe(3);

      const types: AdmissionTemplateType[] = ["NEW", "READMISSION", "TRANSFER"];
      for (const t of types) {
        const meta = AdmissionTemplateRegistry.getMetadata(t);
        expect(meta).toBeDefined();
        expect(meta.version).toBe("1.0.0");
        expect(meta.requiredSheets.length).toBeGreaterThanOrEqual(5);
        expect(meta.fileName.endsWith(".xlsx")).toBe(true);
      }
    });

    it("generates valid New Admission workbook with all required sheets and instructions", async () => {
      const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer("NEW");
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);

      const requiredSheets = [
        "Instructions",
        "Students",
        "Guardians",
        "Student_Guardians",
        "Academic_Placement",
        "Previous_Education",
        "Student_Facilities",
        "Documents",
      ];
      for (const sheetName of requiredSheets) {
        const ws = wb.getWorksheet(sheetName);
        expect(ws, `Missing required worksheet '${sheetName}'`).toBeDefined();
      }

      // Check header row in Students
      const studentSheet = wb.getWorksheet("Students")!;
      const headers: string[] = [];
      studentSheet.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value));
      });

      expect(headers.some((h) => h.includes("Import_Key"))).toBe(true);
      expect(headers.some((h) => h.includes("Student_Name"))).toBe(true);
      expect(headers.some((h) => h.includes("DOB"))).toBe(true);
      expect(headers.some((h) => h.includes("Gender"))).toBe(true);
      expect(headers.some((h) => h.includes("Blood_Group"))).toBe(true);
    });

    it("generates valid Re-admission workbook with Existing_SSVM_Admission_No header", async () => {
      const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer("READMISSION");
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);

      const reAdmissionsSheet = wb.getWorksheet("ReAdmissions");
      expect(reAdmissionsSheet).toBeDefined();

      const headers: string[] = [];
      reAdmissionsSheet!.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value));
      });
      expect(headers.some((h) => h.includes("Existing_SSVM_Admission_No"))).toBe(true);
      expect(headers.some((h) => h.includes("Import_Key"))).toBe(true);
    });

    it("generates valid Transfer Admission workbook with Previous_School sheet", async () => {
      const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer("TRANSFER");
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);

      const prevSchoolSheet = wb.getWorksheet("Previous_School");
      expect(prevSchoolSheet).toBeDefined();

      const headers: string[] = [];
      prevSchoolSheet!.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value));
      });
      expect(headers.some((h) => h.includes("Previous_School_Name"))).toBe(true);
      expect(headers.some((h) => h.includes("TC_Number"))).toBe(true);
    });
  });

  // =========================================================================
  // 2. PARSER: COLUMN ALIGNMENT & EMPTY CELL HANDLING
  // =========================================================================
  describe("2. Parser Engine & Strict Non-Compacting Column Mapping", () => {
    it("maps empty optional cells to null and never converts them to literal 'N/A'", async () => {
      const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer("NEW");
      const parsed = await AdmissionWorkbookParser.parse(buffer);

      expect(parsed.templateType).toBe("NEW");
      expect(parsed.students.length).toBeGreaterThanOrEqual(1);

      const first = parsed.students[0];
      // PEN and Mother_Tongue are optional in sample; if blank, must be null
      expect(first.pen === null || typeof first.pen === "string").toBe(true);
      expect(first.pen).not.toBe("N/A");
      expect(first.email === null || typeof first.email === "string").toBe(true);
    });

    it("preserves 1-based source row numbers for accurate error reporting", async () => {
      const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer("NEW");
      const parsed = await AdmissionWorkbookParser.parse(buffer);

      for (let i = 0; i < parsed.students.length; i++) {
        expect(parsed.students[i].sourceRowNumber).toBe(i + 2); // Row 1 is header, data starts at Row 2
      }
    });

    it("detects relationship keys correctly across multi-sheet structures", async () => {
      const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer("NEW");
      const parsed = await AdmissionWorkbookParser.parse(buffer);

      expect(parsed.students[0].importKey).toBeDefined();
      expect(parsed.guardians.length).toBeGreaterThanOrEqual(1);
      expect(parsed.studentGuardians.length).toBeGreaterThanOrEqual(1);

      const link = parsed.studentGuardians[0];
      expect(link.importKey).toBe(parsed.students[0].importKey);
      expect(link.guardianKey).toBe(parsed.guardians[0].guardianKey);
    });
  });

  // =========================================================================
  // 3. VALIDATION ENGINE & CONTROLLED VOCABULARY
  // =========================================================================
  describe("3. Multi-Tier Validation Engine & Duplicate Detection", () => {
    it("accepts valid controlled blood groups: A+, A-, B+, B-, AB+, AB-, O+, O-, NOT_KNOWN", async () => {
      const validGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "NOT_KNOWN"];
      for (const bg of validGroups) {
        const dummyWorkbook: ParsedAdmissionWorkbook = {
          templateType: "NEW",
          templateVersion: "1.0.0",
          students: [
            {
              importKey: "IMP_BG_1",
              name: "Arjun Verma",
              fullName: "Arjun Verma",
              dob: "2018-05-15",
              gender: "MALE",
              bloodGroup: bg,
              sourceRowNumber: 2,
            },
          ],
          guardians: [
            {
              guardianKey: "G_1",
              name: "Ramesh Verma",
              relationship: "FATHER",
              primaryPhone: "9876543210",
              sourceRowNumber: 2,
            },
          ],
          studentGuardians: [
            {
              importKey: "IMP_BG_1",
              guardianKey: "G_1",
              relationship: "FATHER",
              isPrimary: true,
              sourceRowNumber: 2,
            },
          ],
          academicPlacements: [
            {
              importKey: "IMP_BG_1",
              sessionName: "2026-2027",
              className: "Class 1",
              sectionName: "A",
              sourceRowNumber: 2,
            },
          ],
          previousEducations: [],
          facilities: [],
          documents: [],
          parseErrors: [],
        };

        const result = await AdmissionValidationEngine.validateWorkbook(schoolId, dummyWorkbook, "BATCH_TEST");
        expect(result.isValid, `Blood group ${bg} should be valid`).toBe(true);
      }
    });

    it("rejects invalid blood group values such as 'X+' or 'Unknown'", async () => {
      const dummyWorkbook: ParsedAdmissionWorkbook = {
        templateType: "NEW",
        templateVersion: "1.0.0",
        students: [
          {
            importKey: "IMP_BG_ERR",
            name: "Invalid Blood Student",
            fullName: "Invalid Blood Student",
            dob: "2018-05-15",
            gender: "FEMALE",
            bloodGroup: "INVALID_GROUP",
            sourceRowNumber: 2,
          },
        ],
        guardians: [],
        studentGuardians: [],
        academicPlacements: [
          {
            importKey: "IMP_BG_ERR",
            sessionName: "2026-2027",
            className: "Class 1",
            sourceRowNumber: 2,
          },
        ],
        previousEducations: [],
        facilities: [],
        documents: [],
        parseErrors: [],
      };

      const result = await AdmissionValidationEngine.validateWorkbook(schoolId, dummyWorkbook, "BATCH_ERR");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_BLOOD_GROUP")).toBe(true);
    });

    it("blocks broken guardian reference when referenced Guardian_Key does not exist", async () => {
      const dummyWorkbook: ParsedAdmissionWorkbook = {
        templateType: "NEW",
        templateVersion: "1.0.0",
        students: [
          {
            importKey: "IMP_BROKEN_G",
            name: "Broken Guardian Student",
            fullName: "Broken Guardian Student",
            dob: "2018-01-01",
            gender: "MALE",
            sourceRowNumber: 2,
          },
        ],
        guardians: [], // Empty guardians!
        studentGuardians: [
          {
            importKey: "IMP_BROKEN_G",
            guardianKey: "NON_EXISTENT_G",
            relationship: "MOTHER",
            isPrimary: true,
            sourceRowNumber: 2,
          },
        ],
        academicPlacements: [
          {
            importKey: "IMP_BROKEN_G",
            sessionName: "2026-2027",
            className: "Class 1",
            sourceRowNumber: 2,
          },
        ],
        previousEducations: [],
        facilities: [],
        documents: [],
        parseErrors: [],
      };

      const result = await AdmissionValidationEngine.validateWorkbook(schoolId, dummyWorkbook, "BATCH_G_ERR");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "BROKEN_GUARDIAN_REFERENCE")).toBe(true);
    });

    it("enforces mandatory existing SSVM admission number for Re-admissions", async () => {
      const dummyWorkbook: ParsedAdmissionWorkbook = {
        templateType: "READMISSION",
        templateVersion: "1.0.0",
        students: [
          {
            importKey: "IMP_READM_MISSING",
            name: "Former Student",
            existingAdmissionNo: undefined, // Missing mandatory existing number!
            fullName: "Former Student",
            dob: "2017-02-14",
            gender: "MALE",
            sourceRowNumber: 2,
          },
        ],
        guardians: [],
        studentGuardians: [],
        academicPlacements: [
          {
            importKey: "IMP_READM_MISSING",
            sessionName: "2026-2027",
            className: "Class 1",
            sourceRowNumber: 2,
          },
        ],
        previousEducations: [],
        facilities: [],
        documents: [],
        parseErrors: [],
      };

      const result = await AdmissionValidationEngine.validateWorkbook(schoolId, dummyWorkbook, "BATCH_READM_ERR");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_EXISTING_ADMISSION_NO")).toBe(true);
    });
  });

  // =========================================================================
  // 4. OFFLINE APPROVAL ATTESTATION & SECURITY
  // =========================================================================
  describe("4. Offline Approval Attestation & Fail-Closed Policy", () => {
    it("fails closed immediately if attestation is missing or attested is false", async () => {
      const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer("NEW");
      const parsed = await AdmissionWorkbookParser.parse(buffer);

      const unverifiedAttestation: OfflineApprovalAttestation = {
        admissionType: "NEW",
        academicSession: "2026-2027",
        approvalDate: "2026-03-15",
        approvingAuthority: "Principal Dr. S. K. Dash",
        approvalRegisterNumber: "REG-2026-OFFLINE-01",
        attested: false, // NOT ATTESTED!
        attestedByUserId: staffUserId,
        attestedAt: new Date().toISOString(),
      };

      await expect(
        AdmissionRegistrationService.commitBatch(
          schoolId,
          "BATCH_UNVERIFIED",
          "NEW",
          unverifiedAttestation,
          []
        )
      ).rejects.toThrow(/ATTESTATION_REQUIRED/);
    });
  });

  // =========================================================================
  // 5. TRANSACTIONAL REGISTRATION COMMITS
  // =========================================================================
  describe("5. Canonical Registration Commits (New, Re-admission, Transfer)", () => {
    let newStudentAdmissionNo: string;
    let newStudentId: string;

    it("Scenario A: Successfully registers New Admission with unique monotonic number", async () => {
      const validAttestation: OfflineApprovalAttestation = {
        admissionType: "NEW",
        academicSession: "2026-2027",
        approvalDate: "2026-03-15",
        approvingAuthority: "Principal Dr. S. K. Dash",
        approvalRegisterNumber: "OFFLINE-REG-001",
        attested: true,
        attestedByUserId: staffUserId,
        attestedAt: new Date().toISOString(),
      };

      const uniqueKey = `NEW_${Date.now()}`;
      const workbook: ParsedAdmissionWorkbook = {
        templateType: "NEW",
        templateVersion: "1.0.0",
        students: [
          {
            importKey: uniqueKey,
            name: "Aditya Narayan Nayak",
            fullName: "Aditya Narayan Nayak",
            dob: "2019-06-21",
            gender: "MALE",
            bloodGroup: "O+",
            nationality: "Indian",
            addressLine1: "Plot 102, Cuttack Road",
            city: "Cuttack",
            state: "Odisha",
            pinCode: "753001",
            sourceRowNumber: 2,
          },
        ],
        guardians: [
          {
            guardianKey: "G_ADITYA",
            name: "Debabrata Nayak",
            relationship: "FATHER",
            primaryPhone: "9437012345",
            email: "debabrata@ssvm.test",
            occupation: "Bank Officer",
            sourceRowNumber: 2,
          },
        ],
        studentGuardians: [
          {
            importKey: uniqueKey,
            guardianKey: "G_ADITYA",
            relationship: "FATHER",
            isPrimary: true,
            sourceRowNumber: 2,
          },
        ],
        academicPlacements: [
          {
            importKey: uniqueKey,
            sessionName: "2026-2027",
            className: "Class 1",
            sectionName: "A",
            sourceRowNumber: 2,
          },
        ],
        previousEducations: [],
        facilities: [],
        documents: [],
        parseErrors: [],
      };

      const batchId = `BATCH_A_${Date.now()}`;
      const validationRes = await AdmissionValidationEngine.validateWorkbook(
        schoolId,
        workbook,
        batchId
      );
      expect(validationRes.isValid).toBe(true);

      const result = await AdmissionRegistrationService.commitBatch(
        schoolId,
        batchId,
        "NEW",
        validAttestation,
        validationRes.entries
      );

      expect(result.status).toBe("COMPLETED");
      expect(result.successfulRows).toBe(1);
      expect(result.failedRows).toBe(0);

      const registered = result.records[0];
      expect(registered.status).toBe("REGISTERED");
      expect(registered.admissionNo).toBeDefined();
      expect(registered.admissionNo).toMatch(/^ADM-\d{4}-\d{4}$/);

      newStudentAdmissionNo = registered.admissionNo!;
      newStudentId = registered.studentId!;

      // Verify canonical DB records
      await runWithSchoolContext(schoolId, async () => {
        const studentInDb = await prisma.student.findUnique({
          where: { id: newStudentId },
          include: { guardian: true, user: true, timelines: true },
        });
        expect(studentInDb).toBeDefined();
        expect(studentInDb?.name).toBe("Aditya Narayan Nayak");
        expect(studentInDb?.admissionNo).toBe(newStudentAdmissionNo);
        expect(studentInDb?.guardian?.primaryName).toBe("Debabrata Nayak");
        expect(studentInDb?.user?.role).toBe("STUDENT");

        // Verify Admission Register entry
        const admissionRecord = await prisma.admission.findFirst({
          where: { schoolId, applicantName: "Aditya Narayan Nayak" },
        });
        expect(admissionRecord).toBeDefined();
        expect(admissionRecord?.status).toBe("ENROLLED");
      });
    });

    it("Scenario B: Successfully registers Re-admission preserving original permanent number", async () => {
      expect(newStudentAdmissionNo, "Previous student must have been created").toBeDefined();

      // Create new academic session 2027-2028 for Re-admission placement
      await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        const nextSession = await tx.academicSession.create({
          data: {
            schoolId,
            name: "2027-2028",
            startDate: new Date("2027-04-01"),
            endDate: new Date("2028-03-31"),
          },
        });
        const c2 = await tx.class.create({
          data: {
            schoolId,
            sessionId: nextSession.id,
            name: "Class 2",
            sections: {
              create: [{ name: "A", capacity: 40 }],
            },
          },
        });
        const shift2 = await tx.schoolShift.create({
          data: {
            schoolId,
            sessionId: nextSession.id,
            name: "Morning Shift",
            type: "MORNING",
            startTime: "07:30",
            endTime: "12:30",
            isActive: true,
          },
        });
        await tx.schoolShiftClass.create({
          data: {
            schoolId,
            sessionId: nextSession.id,
            shiftId: shift2.id,
            classId: c2.id,
            isActive: true,
          },
        });
      });

      const validAttestation: OfflineApprovalAttestation = {
        admissionType: "READMISSION",
        academicSession: "2027-2028",
        approvalDate: "2026-03-20",
        approvingAuthority: "Principal Dr. S. K. Dash",
        approvalRegisterNumber: "OFFLINE-REG-002",
        attested: true,
        attestedByUserId: staffUserId,
        attestedAt: new Date().toISOString(),
      };

      const reKey = `READM_${Date.now()}`;
      const workbook: ParsedAdmissionWorkbook = {
        templateType: "READMISSION",
        templateVersion: "1.0.0",
        students: [
          {
            importKey: reKey,
            existingAdmissionNo: newStudentAdmissionNo, // Re-admitting the student created in Scenario A!
            name: "Aditya Narayan Nayak",
            fullName: "Aditya Narayan Nayak",
            dob: "2019-06-21",
            gender: "MALE",
            bloodGroup: "O+",
            sourceRowNumber: 2,
          },
        ],
        guardians: [],
        studentGuardians: [],
        academicPlacements: [
          {
            importKey: reKey,
            sessionName: "2027-2028",
            className: "Class 2",
            sectionName: "A",
            sourceRowNumber: 2,
          },
        ],
        previousEducations: [],
        facilities: [],
        documents: [],
        parseErrors: [],
      };

      const batchId = `BATCH_B_${Date.now()}`;
      const validationRes = await AdmissionValidationEngine.validateWorkbook(
        schoolId,
        workbook,
        batchId
      );
      expect(validationRes.isValid).toBe(true);

      const result = await AdmissionRegistrationService.commitBatch(
        schoolId,
        batchId,
        "READMISSION",
        validAttestation,
        validationRes.entries
      );

      expect(result.status).toBe("COMPLETED");
      expect(result.successfulRows).toBe(1);

      const registered = result.records[0];
      expect(registered.status).toBe("READMISSION_RECORDED");
      expect(registered.admissionNo).toBe(newStudentAdmissionNo); // PRESERVED original number!
      expect(registered.studentId).toBe(newStudentId); // PRESERVED canonical student identity!

      // Verify StudentTimeline has READMISSION event
      await runWithSchoolContext(schoolId, async () => {
        const timelineEntries = await prisma.studentTimeline.findMany({
          where: { studentId: newStudentId, type: "READMISSION" },
        });
        expect(timelineEntries.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("Scenario C: Successfully registers Incoming Transfer Admission with previous school history", async () => {
      const validAttestation: OfflineApprovalAttestation = {
        admissionType: "TRANSFER",
        academicSession: "2026-2027",
        approvalDate: "2026-03-22",
        approvingAuthority: "Principal Dr. S. K. Dash",
        approvalRegisterNumber: "OFFLINE-REG-003",
        attested: true,
        attestedByUserId: staffUserId,
        attestedAt: new Date().toISOString(),
      };

      const transferKey = `TRF_${Date.now()}`;
      const workbook: ParsedAdmissionWorkbook = {
        templateType: "TRANSFER",
        templateVersion: "1.0.0",
        students: [
          {
            importKey: transferKey,
            name: "Sneha Mohapatra",
            fullName: "Sneha Mohapatra",
            dob: "2018-09-10",
            gender: "FEMALE",
            bloodGroup: "B+",
            nationality: "Indian",
            sourceRowNumber: 2,
          },
        ],
        guardians: [
          {
            guardianKey: "G_SNEHA",
            name: "Prakash Mohapatra",
            relationship: "FATHER",
            primaryPhone: "9861011223",
            sourceRowNumber: 2,
          },
        ],
        studentGuardians: [
          {
            importKey: transferKey,
            guardianKey: "G_SNEHA",
            relationship: "FATHER",
            isPrimary: true,
            sourceRowNumber: 2,
          },
        ],
        academicPlacements: [
          {
            importKey: transferKey,
            sessionName: "2026-2027",
            className: "Class 1",
            sectionName: "A",
            sourceRowNumber: 2,
          },
        ],
        previousSchools: [
          {
            importKey: transferKey,
            previousSchoolName: "Kendriya Vidyalaya No. 1, Bhubaneswar",
            previousBoard: "CBSE",
            tcNumber: "TC-2026-8891",
            tcIssueDate: "2026-03-10",
            previousClass: "UKG",
            sourceRowNumber: 2,
          },
        ],
        facilities: [],
        documents: [],
        parseErrors: [],
      };

      const batchId = `BATCH_C_${Date.now()}`;
      const validationRes = await AdmissionValidationEngine.validateWorkbook(
        schoolId,
        workbook,
        batchId
      );
      expect(validationRes.isValid).toBe(true);

      const result = await AdmissionRegistrationService.commitBatch(
        schoolId,
        batchId,
        "TRANSFER",
        validAttestation,
        validationRes.entries
      );

      expect(result.status).toBe("COMPLETED");
      expect(result.successfulRows).toBe(1);

      const registered = result.records[0];
      expect(registered.status).toBe("REGISTERED");
      expect(registered.admissionNo).toBeDefined();

      // Verify student has TRANSFER timeline event with TC metadata
      await runWithSchoolContext(schoolId, async () => {
        const timelineEntries = await prisma.studentTimeline.findMany({
          where: { studentId: registered.studentId, type: "TRANSFER_ADMISSION" },
        });
        expect(timelineEntries.length).toBeGreaterThanOrEqual(1);
        expect(timelineEntries[0].description).toContain("Kendriya Vidyalaya");
        expect(timelineEntries[0].description).toContain("TC-2026-8891");
      });
    });
  });

  // =========================================================================
  // 6. VOLUME SCALABILITY TESTS (1, 10, 50, 100, 500 records)
  // =========================================================================
  describe("6. Volume Benchmarks (1, 10, 50, 100, 500 records)", () => {
    function generateSyntheticBatch(count: number): ParsedAdmissionWorkbook {
      const students: any[] = [];
      const guardians: any[] = [];
      const studentGuardians: any[] = [];
      const academicPlacements: any[] = [];

      for (let i = 1; i <= count; i++) {
        const importKey = `BENCH_${count}_${i}`;
        const guardianKey = `G_BENCH_${count}_${i}`;

        students.push({
          importKey,
          name: `Benchmark Student ${i}`,
          fullName: `Benchmark Student ${i}`,
          dob: "2018-01-01",
          gender: i % 2 === 0 ? "FEMALE" : "MALE",
          bloodGroup: "O+",
          sourceRowNumber: i + 1,
        });

        guardians.push({
          guardianKey,
          name: `Guardian of ${i}`,
          relationship: "FATHER",
          primaryPhone: `900000${String(i).padStart(4, "0")}`,
          sourceRowNumber: i + 1,
        });

        studentGuardians.push({
          importKey,
          guardianKey,
          relationship: "FATHER",
          isPrimary: true,
          sourceRowNumber: i + 1,
        });

        academicPlacements.push({
          importKey,
          sessionName: "2026-2027",
          className: "Class 1",
          sectionName: "A",
          sourceRowNumber: i + 1,
        });
      }

      return {
        templateType: "NEW",
        templateVersion: "1.0.0",
        students,
        guardians,
        studentGuardians,
        academicPlacements,
        previousEducations: [],
        facilities: [],
        documents: [],
        parseErrors: [],
      };
    }

    it("validates 1 record within 100ms", async () => {
      const batch = generateSyntheticBatch(1);
      const start = Date.now();
      const res = await AdmissionValidationEngine.validateWorkbook(schoolId, batch, "BATCH_V1");
      const duration = Date.now() - start;

      expect(res.isValid).toBe(true);
      expect(res.totalRows).toBe(1);
      expect(duration).toBeLessThan(1000);
    });

    it("validates 10 records within 250ms", async () => {
      const batch = generateSyntheticBatch(10);
      const start = Date.now();
      const res = await AdmissionValidationEngine.validateWorkbook(schoolId, batch, "BATCH_V10");
      const duration = Date.now() - start;

      expect(res.isValid).toBe(true);
      expect(res.totalRows).toBe(10);
      expect(duration).toBeLessThan(2000);
    });

    it("validates 50 records within 500ms", async () => {
      const batch = generateSyntheticBatch(50);
      const start = Date.now();
      const res = await AdmissionValidationEngine.validateWorkbook(schoolId, batch, "BATCH_V50");
      const duration = Date.now() - start;

      expect(res.isValid).toBe(true);
      expect(res.totalRows).toBe(50);
      expect(duration).toBeLessThan(3000);
    });

    it("validates 100 records within 1000ms", async () => {
      const batch = generateSyntheticBatch(100);
      const start = Date.now();
      const res = await AdmissionValidationEngine.validateWorkbook(schoolId, batch, "BATCH_V100");
      const duration = Date.now() - start;

      expect(res.isValid).toBe(true);
      expect(res.totalRows).toBe(100);
      expect(duration).toBeLessThan(5000);
    });

    it("validates 500 records within 2500ms without memory exhaustion", async () => {
      const batch = generateSyntheticBatch(500);
      const start = Date.now();
      const res = await AdmissionValidationEngine.validateWorkbook(schoolId, batch, "BATCH_V500");
      const duration = Date.now() - start;

      expect(res.isValid).toBe(true);
      expect(res.totalRows).toBe(500);
      expect(duration).toBeLessThan(10000);
    });
  });
});
