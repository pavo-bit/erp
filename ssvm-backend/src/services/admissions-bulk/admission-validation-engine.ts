/**
 * ssvm-backend/src/services/admissions-bulk/admission-validation-engine.ts
 *
 * Comprehensive multi-tier validation engine for SSVM ERP Bulk Admission Registration.
 * Handles workbook structure, field-level data dictionary constraints, relational
 * integrity across sheets, tenant configuration lookups, and duplicate detection.
 */

import prisma from "../../lib/prisma";
import { runWithSchoolContext } from "../../middleware/school-context.middleware";
import {
  AdmissionType,
  CellError,
  ParsedAdmissionWorkbook,
  ValidatedStudentEntry,
  AdmissionBatchPreviewSummary,
  OfflineApprovalAttestation,
  StudentSheetRow,
  GuardianSheetRow,
  AcademicPlacementRow,
} from "./admission-types";

export class AdmissionValidationEngine {
  /**
   * Validate entire parsed workbook within tenant institutional scope
   */
  public static async validateWorkbook(
    schoolId: string,
    parsed: ParsedAdmissionWorkbook,
    batchId: string,
    attestation?: OfflineApprovalAttestation | null
  ): Promise<AdmissionBatchPreviewSummary> {
    return runWithSchoolContext(schoolId, async () => {
      const summaryErrors: CellError[] = [...parsed.parseErrors];

      // 1. Preload Tenant Master Configuration (Sessions, Classes, Sections)
      const tenantCache = await this.preloadTenantConfiguration(schoolId);

      // 2. Preload Existing Student Database Records for Duplicate Checks
      const existingStudentCache = await this.preloadExistingStudentCache(schoolId, parsed);

      // 3. Build Internal Lookup Maps
      const guardianMap = new Map<string, GuardianSheetRow>(
        parsed.guardians.map((g) => [g.guardianKey, g])
      );

      const placementMap = new Map<string, AcademicPlacementRow>(
        (parsed.academicPlacements || []).map((p) => [p.importKey, p])
      );

      const previousSchoolMap = new Map(
        (parsed.previousSchools || []).map((ps) => [ps.importKey, ps])
      );

      // Group student-guardian links
      const studentGuardiansGroup = new Map<string, StudentGuardianLinkRow[]>();
      for (const link of (parsed.studentGuardians || [])) {
        const arr = studentGuardiansGroup.get(link.importKey) || [];
        arr.push(link);
        studentGuardiansGroup.set(link.importKey, arr);
      }

      // Group facilities and documents
      const facilitiesGroup = new Map<string, any[]>();
      for (const f of (parsed.facilities || [])) {
        const arr = facilitiesGroup.get(f.importKey) || [];
        arr.push(f);
        facilitiesGroup.set(f.importKey, arr);
      }

      const documentsGroup = new Map<string, any[]>();
      for (const d of (parsed.documents || [])) {
        const arr = documentsGroup.get(d.importKey) || [];
        arr.push(d);
        documentsGroup.set(d.importKey, arr);
      }

      const docsGroup = new Map<string, any[]>();
      for (const d of parsed.documents) {
        const arr = docsGroup.get(d.importKey) || [];
        arr.push(d);
        docsGroup.set(d.importKey, arr);
      }

      // 4. Validate Each Student Entry
      const seenImportKeys = new Set<string>();
      const entries: ValidatedStudentEntry[] = [];

      for (const student of parsed.students) {
        const errors: CellError[] = [];
        const warnings: CellError[] = [];

        // 4.1 Intra-Workbook Key Uniqueness
        if (seenImportKeys.has(student.importKey)) {
          errors.push({
            sheet: "Students",
            rowNumber: student.sourceRowNumber,
            field: "Import_Key",
            fieldLabel: "Import Key",
            value: student.importKey,
            code: "DUPLICATE_IMPORT_KEY",
            message: `Duplicate Import_Key '${student.importKey}' appears multiple times in the workbook.`,
            suggestedCorrection: "Ensure every student row has a unique Import_Key.",
          });
        }
        seenImportKeys.add(student.importKey);

        // 4.2 Validate Student Core Attributes
        this.validateStudentAttributes(student, parsed.templateType, errors, warnings);

        // 4.3 Validate Linked Guardians
        const links = studentGuardiansGroup.get(student.importKey) || [];
        const resolvedGuardians: Array<{ guardian: GuardianSheetRow; isPrimary: boolean; relationship: string }> = [];

        if (links.length === 0) {
          warnings.push({
            sheet: "Student_Guardians",
            rowNumber: student.sourceRowNumber,
            field: "Guardian",
            fieldLabel: "Guardian Link",
            value: null,
            code: "NO_GUARDIAN_LINKED",
            message: `No guardian linked to student '${student.importKey}' in 'Student_Guardians' sheet.`,
            isWarning: true,
            suggestedCorrection: "Link at least one guardian with Is_Primary = TRUE.",
          });
        } else {
          let hasPrimary = false;
          for (const l of links) {
            const guardian = guardianMap.get(l.guardianKey);
            if (!guardian) {
              errors.push({
                sheet: "Student_Guardians",
                rowNumber: l.sourceRowNumber,
                field: "Guardian_Key",
                fieldLabel: "Guardian Key",
                value: l.guardianKey,
                code: "BROKEN_GUARDIAN_REFERENCE",
                message: `Referenced Guardian_Key '${l.guardianKey}' does not exist in 'Guardians' sheet.`,
              });
            } else {
              if (l.isPrimary) hasPrimary = true;
              resolvedGuardians.push({
                guardian,
                isPrimary: l.isPrimary,
                relationship: l.relationship || guardian.relationship,
              });
            }
          }

          if (links.length > 0 && !hasPrimary) {
            warnings.push({
              sheet: "Student_Guardians",
              rowNumber: student.sourceRowNumber,
              field: "Is_Primary",
              fieldLabel: "Primary Guardian",
              value: null,
              code: "NO_PRIMARY_GUARDIAN",
              message: "No guardian marked as primary (Is_Primary = TRUE). The first guardian will be used as primary.",
              isWarning: true,
            });
            if (resolvedGuardians.length > 0) {
              resolvedGuardians[0].isPrimary = true;
            }
          }
        }

        // 4.4 Validate Academic Placement
        const placement = placementMap.get(student.importKey);
        let resolvedClassId: string | undefined;
        let resolvedSectionId: string | undefined;
        let resolvedSessionId: string | undefined;

        if (!placement) {
          errors.push({
            sheet: "Academic_Placement",
            rowNumber: student.sourceRowNumber,
            field: "Academic_Placement",
            fieldLabel: "Academic Placement",
            value: null,
            code: "MISSING_ACADEMIC_PLACEMENT",
            message: `Missing academic placement record for student '${student.importKey}' in 'Academic_Placement' sheet.`,
            suggestedCorrection: "Add placement specifying Session and Admission Class.",
          });
        } else {
          // Verify Session
          const session = tenantCache.sessions.find(
            (s) => s.name.toLowerCase() === placement.sessionName.trim().toLowerCase()
          );
          if (!session) {
            errors.push({
              sheet: "Academic_Placement",
              rowNumber: placement.sourceRowNumber,
              field: "Academic_Session",
              fieldLabel: "Academic Session",
              value: placement.sessionName,
              code: "INVALID_ACADEMIC_SESSION",
              message: `Academic Session '${placement.sessionName}' does not exist in institution configuration.`,
              suggestedCorrection: `Configured sessions: [${tenantCache.sessions.map((s) => s.name).join(", ")}].`,
            });
          } else {
            resolvedSessionId = session.id;
          }

          // Verify Class
          const cls = tenantCache.classes.find(
            (c) => c.name.toLowerCase() === placement.className.trim().toLowerCase()
          );
          if (!cls) {
            errors.push({
              sheet: "Academic_Placement",
              rowNumber: placement.sourceRowNumber,
              field: "Admission_Class",
              fieldLabel: "Admission Class",
              value: placement.className,
              code: "INVALID_ADMISSION_CLASS",
              message: `Class '${placement.className}' is not configured in this institution.`,
              suggestedCorrection: `Valid configured classes: [${tenantCache.classes.map((c) => c.name).join(", ")}].`,
            });
          } else {
            resolvedClassId = cls.id;

            // Verify Section if specified
            if (placement.sectionName) {
              const sec = cls.sections.find(
                (s) => s.name.toLowerCase() === placement.sectionName?.trim().toLowerCase()
              );
              if (!sec) {
                errors.push({
                  sheet: "Academic_Placement",
                  rowNumber: placement.sourceRowNumber,
                  field: "Section",
                  fieldLabel: "Section",
                  value: placement.sectionName,
                  code: "INVALID_SECTION",
                  message: `Section '${placement.sectionName}' does not exist in Class '${cls.name}'.`,
                  suggestedCorrection: `Available sections for ${cls.name}: [${cls.sections.map((s) => s.name).join(", ")}].`,
                });
              } else {
                resolvedSectionId = sec.id;
              }
            }
          }
        }

        // 4.5 Type-Specific Verification & Duplicate Identity Detection
        let resolvedStudentId: string | undefined;

        if (parsed.templateType === "READMISSION") {
          // Re-admission requires existing SSVM Admission Number
          const existingAdmNo = student.existingAdmissionNo?.trim();
          if (!existingAdmNo) {
            errors.push({
              sheet: "ReAdmissions",
              rowNumber: student.sourceRowNumber,
              field: "Existing_SSVM_Admission_No",
              fieldLabel: "Existing SSVM Admission Number",
              value: null,
              code: "MISSING_EXISTING_ADMISSION_NO",
              message: "Existing SSVM Admission Number is MANDATORY for Re-Admission.",
              suggestedCorrection: "Enter the student's existing permanent Admission/Registration Number.",
            });
          } else {
            const existingStudent = existingStudentCache.byAdmissionNo.get(existingAdmNo.toUpperCase());
            if (!existingStudent) {
              errors.push({
                sheet: "ReAdmissions",
                rowNumber: student.sourceRowNumber,
                field: "Existing_SSVM_Admission_No",
                fieldLabel: "Existing SSVM Admission Number",
                value: existingAdmNo,
                code: "STUDENT_NOT_FOUND",
                message: `No active or past student found with Admission Number '${existingAdmNo}' in this school.`,
                suggestedCorrection: "Verify the Admission Number in the Student Directory.",
              });
            } else {
              resolvedStudentId = existingStudent.id;
              // Check name similarity
              if (
                student.name &&
                !existingStudent.name.toLowerCase().includes(student.name.toLowerCase().split(" ")[0])
              ) {
                warnings.push({
                  sheet: "ReAdmissions",
                  rowNumber: student.sourceRowNumber,
                  field: "Student_Name",
                  fieldLabel: "Student Name",
                  value: student.name,
                  code: "NAME_MISMATCH_WARNING",
                  message: `Provided name '${student.name}' differs from recorded database name '${existingStudent.name}'.`,
                  isWarning: true,
                });
              }

              // Check duplicate enrollment for current target session
              if (
                resolvedSessionId &&
                existingStudent.sectionRef?.class?.sessionId === resolvedSessionId
              ) {
                errors.push({
                  sheet: "Academic_Placement",
                  rowNumber: placement?.sourceRowNumber || student.sourceRowNumber,
                  field: "Academic_Session",
                  fieldLabel: "Academic Session",
                  value: placement?.sessionName,
                  code: "DUPLICATE_SESSION_ENROLLMENT",
                  message: `Student '${existingStudent.name}' (${existingAdmNo}) is ALREADY enrolled in session '${placement?.sessionName}'.`,
                  suggestedCorrection: "Re-admission cannot duplicate an active session enrollment.",
                });
              }
            }
          }
        } else {
          // New Admission / Transfer: check potential duplicate identities
          const sName = (student.name || student.fullName || "").trim();
          const normNameDob = `${sName.toLowerCase()}_${student.dob || ""}`;
          const existingByNameDob = existingStudentCache.byNameDob.get(normNameDob);

          if (existingByNameDob) {
            warnings.push({
              sheet: "Students",
              rowNumber: student.sourceRowNumber,
              field: "Student_Name",
              fieldLabel: "Student Name & DOB",
              value: `${sName} (${student.dob})`,
              code: "POSSIBLE_DUPLICATE_STUDENT",
              message: `A student with the exact same name and DOB already exists (${existingByNameDob.admissionNo || "ID: " + existingByNameDob.id}).`,
              isWarning: true,
              suggestedCorrection: "Confirm if this is a twin, re-admission, or new student before committing.",
            });
          }

          if (student.pen) {
            const existingByPen = existingStudentCache.byPen.get(student.pen.toUpperCase());
            if (existingByPen) {
              errors.push({
                sheet: "Students",
                rowNumber: student.sourceRowNumber,
                field: "PEN",
                fieldLabel: "Permanent Education Number",
                value: student.pen,
                code: "DUPLICATE_PEN_NUMBER",
                message: `PEN '${student.pen}' is already registered to student '${existingByPen.name}'.`,
              });
            }
          }
        }

        // 4.6 Transfer Admission Specific Requirements
        const previousSchool = previousSchoolMap.get(student.importKey);
        if (parsed.templateType === "TRANSFER") {
          if (!previousSchool || !previousSchool.previousSchoolName) {
            errors.push({
              sheet: "Previous_School",
              rowNumber: student.sourceRowNumber,
              field: "Previous_School_Name",
              fieldLabel: "Previous School Name",
              value: null,
              code: "MISSING_TRANSFER_SCHOOL",
              message: "Transfer Admission requires 'Previous_School_Name' in 'Previous_School' sheet.",
            });
          }
          if (!previousSchool || !previousSchool.tcNumber) {
            errors.push({
              sheet: "Previous_School",
              rowNumber: student.sourceRowNumber,
              field: "TC_Number",
              fieldLabel: "Transfer Certificate Number",
              value: null,
              code: "MISSING_TC_NUMBER",
              message: "Transfer Admission requires 'TC_Number' in 'Previous_School' sheet.",
            });
          }
        }

        // Determine Entry Status
        let status: any = "VALID";
        if (errors.length > 0) {
          status = "INVALID";
        } else if (warnings.some((w) => w.code === "POSSIBLE_DUPLICATE_STUDENT")) {
          status = "DUPLICATE_REVIEW";
        } else if (warnings.length > 0) {
          status = "WARNING";
        }

        entries.push({
          importKey: student.importKey,
          sourceRowNumber: student.sourceRowNumber,
          status,
          student,
          placement,
          guardians: resolvedGuardians,
          previousSchool,
          facilities: facilitiesGroup.get(student.importKey) || [],
          documents: docsGroup.get(student.importKey) || [],
          errors,
          warnings,
          resolvedClassId,
          resolvedSectionId,
          resolvedSessionId,
          resolvedStudentId,
        });
      }

      // 5. Calculate Summary Metrics
      const totalRows = entries.length;
      const validRows = entries.filter((e) => e.status === "VALID").length;
      const invalidRows = entries.filter((e) => e.status === "INVALID").length;
      const warningRows = entries.filter((e) => e.status === "WARNING").length;
      const duplicateReviewRows = entries.filter((e) => e.status === "DUPLICATE_REVIEW").length;
      const readyToRegisterCount = entries.filter((e) => e.status !== "INVALID").length;

      const allErrors = entries.flatMap((e) => e.errors).concat(summaryErrors);
      const allWarnings = entries.flatMap((e) => e.warnings);
      const isValid = invalidRows === 0 && summaryErrors.length === 0;

      return {
        batchId,
        admissionType: parsed.templateType,
        templateVersion: parsed.templateVersion,
        totalRows,
        validRows,
        invalidRows,
        warningRows,
        duplicateReviewRows,
        readyToRegisterCount,
        isValid,
        errors: allErrors,
        warnings: allWarnings,
        entries,
        summaryErrors,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ATTRIBUTE VALIDATOR
  // ─────────────────────────────────────────────────────────────

  private static validateStudentAttributes(
    student: StudentSheetRow,
    type: AdmissionType,
    errors: CellError[],
    warnings: CellError[]
  ): void {
    const sheet = type === "READMISSION" ? "ReAdmissions" : "Students";

    // Name
    const sName = (student.name || student.fullName || "").trim();
    if (!sName || sName.length < 2) {
      errors.push({
        sheet,
        rowNumber: student.sourceRowNumber,
        field: "Student_Name",
        fieldLabel: "Student Name",
        value: sName,
        code: "INVALID_STUDENT_NAME",
        message: "Student name is mandatory and must contain at least 2 characters.",
      });
    }

    // DOB
    if (!student.dob) {
      errors.push({
        sheet,
        rowNumber: student.sourceRowNumber,
        field: "DOB",
        fieldLabel: "Date of Birth",
        value: null,
        code: "MISSING_DOB",
        message: "Date of Birth is mandatory (YYYY-MM-DD).",
      });
    } else {
      const parts = String(student.dob).trim().split("-");
      const d = new Date(student.dob);
      const isCalendarValid =
        parts.length === 3 &&
        !isNaN(d.getTime()) &&
        d.getUTCFullYear() === parseInt(parts[0], 10) &&
        d.getUTCMonth() + 1 === parseInt(parts[1], 10) &&
        d.getUTCDate() === parseInt(parts[2], 10);

      if (!isCalendarValid || isNaN(d.getTime())) {
        errors.push({
          sheet,
          rowNumber: student.sourceRowNumber,
          field: "DOB",
          fieldLabel: "Date of Birth",
          value: student.dob,
          code: "INVALID_DOB_FORMAT",
          message: `Invalid calendar Date of Birth '${student.dob}'. Expected valid YYYY-MM-DD date.`,
        });
      } else if (d.getTime() > Date.now()) {
        errors.push({
          sheet,
          rowNumber: student.sourceRowNumber,
          field: "DOB",
          fieldLabel: "Date of Birth",
          value: student.dob,
          code: "FUTURE_DOB",
          message: "Date of Birth cannot be in the future.",
        });
      }
    }

    // Gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    if (!student.gender || !allowedGenders.includes(student.gender)) {
      errors.push({
        sheet,
        rowNumber: student.sourceRowNumber,
        field: "Gender",
        fieldLabel: "Gender",
        value: student.gender,
        code: "INVALID_GENDER",
        message: `Gender '${student.gender}' is invalid. Allowed: [${allowedGenders.join(", ")}].`,
      });
    }

    // Blood Group
    if (student.bloodGroup) {
      const allowedBg = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "NOT_KNOWN"];
      if (!allowedBg.includes(student.bloodGroup.toUpperCase())) {
        errors.push({
          sheet,
          rowNumber: student.sourceRowNumber,
          field: "Blood_Group",
          fieldLabel: "Blood Group",
          value: student.bloodGroup,
          code: "INVALID_BLOOD_GROUP",
          message: `Blood Group '${student.bloodGroup}' is invalid. Allowed: [${allowedBg.join(", ")}].`,
        });
      }
    }

    // Email
    if (student.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(student.email)) {
        errors.push({
          sheet,
          rowNumber: student.sourceRowNumber,
          field: "Student_Email",
          fieldLabel: "Student Email",
          value: student.email,
          code: "INVALID_EMAIL_FORMAT",
          message: `Invalid email address format '${student.email}'.`,
        });
      }
    }

    // Phone
    if (student.phone) {
      const phoneDigits = student.phone.replace(/[^0-9]/g, "");
      if (phoneDigits.length < 10) {
        errors.push({
          sheet,
          rowNumber: student.sourceRowNumber,
          field: "Student_Phone",
          fieldLabel: "Student Phone",
          value: student.phone,
          code: "INVALID_PHONE_FORMAT",
          message: `Contact phone must contain at least 10 digits (got '${student.phone}').`,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CACHE PRELOADERS (Zero N+1 DB Queries)
  // ─────────────────────────────────────────────────────────────

  private static async preloadTenantConfiguration(schoolId: string) {
    const [sessions, classes] = await Promise.all([
      prisma.academicSession.findMany({
        where: { schoolId },
        select: { id: true, name: true, isCurrent: true },
      }),
      prisma.class.findMany({
        where: { schoolId },
        include: { sections: true },
      }),
    ]);

    return { sessions, classes };
  }

  private static async preloadExistingStudentCache(
    schoolId: string,
    parsed: ParsedAdmissionWorkbook
  ) {
    // 1. Gather all existing admission numbers from ReAdmissions
    const admNosToCheck = parsed.students
      .map((s) => s.existingAdmissionNo?.trim().toUpperCase())
      .filter(Boolean) as string[];

    // 2. Query students by admission number
    const byAdmissionNo = new Map<string, any>();
    if (admNosToCheck.length > 0) {
      const existing = await prisma.student.findMany({
        where: { schoolId, admissionNo: { in: admNosToCheck, mode: "insensitive" } },
        include: {
          sectionRef: { include: { class: true } },
          guardian: true,
        },
      });
      existing.forEach((e) => {
        if (e.admissionNo) byAdmissionNo.set(e.admissionNo.toUpperCase(), e);
      });
    }

    // 3. Query students for potential name+dob duplicate check
    const names = parsed.students
      .map((s) => (s.fullName || (s as any).name || "").trim())
      .filter(Boolean);
    const byNameDob = new Map<string, any>();
    if (names.length > 0) {
      const existing = await prisma.student.findMany({
        where: {
          schoolId,
          name: { in: names, mode: "insensitive" },
        },
        select: { id: true, name: true, dob: true, admissionNo: true },
      });
      existing.forEach((e) => {
        const dobStr = e.dob ? e.dob.toISOString().split("T")[0] : "";
        byNameDob.set(`${e.name.toLowerCase()}_${dobStr}`, e);
      });
    }

    // 4. Query students by PEN if PEN exists in any model
    const byPen = new Map<string, any>();

    return { byAdmissionNo, byNameDob, byPen };
  }
}
