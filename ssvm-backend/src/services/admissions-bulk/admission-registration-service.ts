/**
 * ssvm-backend/src/services/admissions-bulk/admission-registration-service.ts
 *
 * Transactional commit engine for SSVM ERP Bulk Student Admission Registration.
 * Handles New Admission, Re-admission, and Transfer Admission using canonical
 * Student Management models inside fail-closed tenant database transactions.
 */

import crypto from "crypto";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { hashPassword } from "../../middleware/auth";
import logger from "../../lib/logger";
import {
  AdmissionType,
  OfflineApprovalAttestation,
  ValidatedStudentEntry,
  AdmissionBatchCommitOptions,
  AdmissionBatchCommitResult,
  AdmissionCommitResultItem,
} from "./admission-types";

export class AdmissionRegistrationService {
  /**
   * Commit a batch of validated student entries to the tenant database
   */
  public static async commitBatch(
    schoolId: string,
    batchId: string,
    admissionType: AdmissionType,
    attestation: OfflineApprovalAttestation,
    entries: ValidatedStudentEntry[],
    options: AdmissionBatchCommitOptions = { clearEmptyFields: false, skipInvalidRows: true }
  ): Promise<AdmissionBatchCommitResult> {
    // 1. Mandatory Offline Approval Attestation Verification
    if (!attestation || !attestation.attested) {
      throw new Error(
        "OFFLINE_APPROVAL_ATTESTATION_REQUIRED: You must explicitly attest that these students have received authorized offline admission approval."
      );
    }
    if (!attestation.approvalDate || !attestation.approvingAuthority) {
      throw new Error("Missing approval date or approving authority in offline approval attestation.");
    }

    // 2. Filter Processable Entries
    const rowsToProcess = options.skipInvalidRows
      ? entries.filter((e) => e.status !== "INVALID")
      : entries;

    if (rowsToProcess.length === 0) {
      throw new Error("No valid student records available to commit in this batch.");
    }

    const results: AdmissionCommitResultItem[] = [];
    const errorLog: Array<{ importKey: string; rowNumber: number; errors: string[] }> = [];
    let successCount = 0;
    let failedCount = 0;
    let finalStatus: "COMPLETED" | "PARTIALLY_COMPLETED" | "FAILED" = "COMPLETED";

    // 4. Execute Transactional Commit
    await runWithTenantDatabaseTransaction(schoolId, async (tx: any) => {
      // 3. Create BulkJob record inside tenant transaction
      const bulkJob = await tx.bulkJob.create({
        data: {
          schoolId,
          type: `ADMISSION_BULK_${admissionType}`,
          status: "COMMITTING",
          totalRows: rowsToProcess.length,
          progress: 0,
        },
      });
      // Monotonic Admission Number counter per school for this commit
      let nextSeqNumber = await this.getNextAdmissionSequenceNumber(tx, schoolId);

      for (let i = 0; i < rowsToProcess.length; i++) {
        const entry = rowsToProcess[i];

        try {
          if (admissionType === "NEW") {
            const resultItem = await this.commitNewAdmission(
              tx,
              schoolId,
              batchId,
              entry,
              attestation,
              nextSeqNumber++
            );
            results.push(resultItem);
            successCount++;
          } else if (admissionType === "READMISSION") {
            const resultItem = await this.commitReAdmission(
              tx,
              schoolId,
              batchId,
              entry,
              attestation,
              options
            );
            results.push(resultItem);
            successCount++;
          } else if (admissionType === "TRANSFER") {
            const resultItem = await this.commitTransferAdmission(
              tx,
              schoolId,
              batchId,
              entry,
              attestation,
              nextSeqNumber++
            );
            results.push(resultItem);
            successCount++;
          }
        } catch (rowErr: any) {
          logger.error({ err: rowErr, importKey: entry.importKey }, "Failed to commit admission entry - rolling back batch transaction");
          throw rowErr;
        }
      }

      // Record Audit Log for the batch
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: attestation.attestedByUserId,
          action: `BULK_ADMISSION_${admissionType}_COMMITTED`,
          entity: "Admission",
          entityId: batchId,
          details: `Committed ${successCount} ${admissionType} student admissions (Batch ${batchId}). Approved by: ${attestation.approvingAuthority}. Date: ${attestation.approvalDate}.`,
        },
      });
      finalStatus =
        failedCount === 0 ? "COMPLETED" : successCount > 0 ? "PARTIALLY_COMPLETED" : "FAILED";

      await tx.bulkJob.update({
        where: { id: bulkJob.id },
        data: {
          status: finalStatus,
          progress: 100,
          successRows: successCount,
          failedRows: failedCount,
          errorFile: errorLog.length > 0 ? JSON.stringify(errorLog) : null,
        },
      });
    });

    return {
      batchId,
      admissionType,
      totalRows: rowsToProcess.length,
      successCount,
      successfulRows: successCount,
      failedCount,
      failedRows: failedCount,
      status: finalStatus,
      results,
      records: results,
      errorLog,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 1. NEW ADMISSION COMMIT
  // ─────────────────────────────────────────────────────────────

  private static async commitNewAdmission(
    tx: any,
    schoolId: string,
    batchId: string,
    entry: ValidatedStudentEntry,
    attestation: OfflineApprovalAttestation,
    seqNumber: number
  ): Promise<AdmissionCommitResultItem> {
    const studentData = entry.student;
    const currentYear = new Date().getFullYear();
    const allocatedAdmissionNo = `ADM-${currentYear}-${String(seqNumber).padStart(4, "0")}`;

    // 1. Resolve or Create Primary Guardian
    let guardianId: string | null = null;
    const primaryGrd = entry.guardians.find((g) => g.isPrimary) || entry.guardians[0];

    if (primaryGrd) {
      let existingGrd = await tx.guardian.findFirst({
        where: { schoolId, primaryPhone: primaryGrd.guardian.primaryPhone },
      });

      if (!existingGrd) {
        existingGrd = await tx.guardian.create({
          data: {
            schoolId,
            primaryName: primaryGrd.guardian.name,
            primaryPhone: primaryGrd.guardian.primaryPhone,
            primaryEmail: primaryGrd.guardian.primaryEmail || null,
            primaryRelation: primaryGrd.relationship || primaryGrd.guardian.relationship || "FATHER",
            address: primaryGrd.guardian.address || studentData.address || null,
          },
        });
      }
      guardianId = existingGrd.id;
    }

    // 2. Create User Account for Student Portal
    const cleanAdNo = allocatedAdmissionNo.toLowerCase().replace(/[^a-z0-9]/g, "");
    const studentEmail = studentData.email || `${cleanAdNo}_${schoolId.slice(-6)}@student.ssvm`;
    const defaultPassword = `SSVM@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await hashPassword(defaultPassword);

    const user = await tx.user.create({
      data: {
        schoolId,
        email: studentEmail,
        name: studentData.name,
        passwordHash: hashedPassword,
        role: "STUDENT",
        isActive: true,
      },
    });

    // 3. Create Canonical Student Record
    const student = await tx.student.create({
      data: {
        schoolId,
        userId: user.id,
        name: studentData.name,
        rollNo: entry.placement?.rollNo || String(seqNumber),
        admissionNo: allocatedAdmissionNo,
        password: hashedPassword,
        dob: studentData.dob ? new Date(studentData.dob) : null,
        gender: studentData.gender || "OTHER",
        bloodGroup: studentData.bloodGroup || null,
        address: studentData.address || null,
        sectionId: entry.resolvedSectionId || null,
        guardianId: guardianId || null,
        isActive: true,
      },
    });

    // 4. Create Historical Admission Record (Approved & Enrolled)
    await tx.admission.create({
      data: {
        schoolId,
        applicantName: studentData.name,
        applyingForClass: entry.placement?.className || "Class 1",
        dob: studentData.dob ? new Date(studentData.dob) : null,
        gender: studentData.gender,
        parentName: primaryGrd?.guardian.name || "Offline Approved Guardian",
        parentPhone: primaryGrd?.guardian.primaryPhone || "0000000000",
        parentEmail: primaryGrd?.guardian.primaryEmail || null,
        address: studentData.address || null,
        status: "ENROLLED",
        remarks: `Offline admission approved by ${attestation.approvingAuthority} on ${attestation.approvalDate}. Batch: ${batchId}. Ref: ${attestation.approvalRegisterNumber || "Direct"}`,
      },
    });

    // 5. Create Student Timeline Event
    const timeline = await tx.studentTimeline.create({
      data: {
        studentId: student.id,
        title: "New Student Admission Enrolled",
        type: "NEW_ADMISSION",
        description: `New student admission completed into ${entry.placement?.className || "Class"} ${entry.placement?.sectionName || ""}. Allocated Admission No: ${allocatedAdmissionNo}. Approved by ${attestation.approvingAuthority} (Batch #${batchId}).`,
      },
    });

    // 6. Link Document Metadata if present
    for (const doc of entry.documents) {
      await tx.document.create({
        data: {
          schoolId,
          ownerType: "STUDENT",
          ownerId: student.id,
          category: doc.documentCategory as any,
          title: doc.documentTitle,
          fileUrl: doc.fileReference || "/uploads/admissions/pending_document.pdf",
        },
      });
    }

    return {
      importKey: entry.importKey,
      sourceRowNumber: entry.sourceRowNumber,
      studentId: student.id,
      studentName: student.name,
      admissionNo: allocatedAdmissionNo,
      status: "REGISTERED",
      message: `Successfully registered new student with Admission No ${allocatedAdmissionNo}.`,
      timelineId: timeline.id,
      enrollmentSection: entry.placement?.sectionName || undefined,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. RE-ADMISSION COMMIT
  // ─────────────────────────────────────────────────────────────

  private static async commitReAdmission(
    tx: any,
    schoolId: string,
    batchId: string,
    entry: ValidatedStudentEntry,
    attestation: OfflineApprovalAttestation,
    options: AdmissionBatchCommitOptions
  ): Promise<AdmissionCommitResultItem> {
    const studentData = entry.student;
    const existingAdmNo = studentData.existingAdmissionNo?.trim();

    if (!existingAdmNo || !entry.resolvedStudentId) {
      throw new Error(`Cannot commit re-admission: Missing existing student reference for ${entry.importKey}.`);
    }

    const existingStudent = await tx.student.findUnique({
      where: { id: entry.resolvedStudentId },
      include: { sectionRef: { include: { class: true } } },
    });

    if (!existingStudent) {
      throw new Error(`Student record not found in database for Admission No: ${existingAdmNo}`);
    }

    // Apply Profile Updates without overwriting existing data with NULL unless clearEmptyFields is enabled
    const updatePayload: any = {
      isActive: true,
      ...(entry.resolvedSectionId && { sectionId: entry.resolvedSectionId }),
    };

    if (studentData.phone) updatePayload.phone = studentData.phone;
    if (studentData.address) updatePayload.address = studentData.address;
    if (studentData.bloodGroup) updatePayload.bloodGroup = studentData.bloodGroup;

    if (options.clearEmptyFields) {
      if (studentData.bloodGroup === null) updatePayload.bloodGroup = null;
      if (studentData.address === null) updatePayload.address = null;
    }

    await tx.student.update({
      where: { id: existingStudent.id },
      data: updatePayload,
    });

    // Record Re-Admission Timeline Event
    const previousPlacement = existingStudent.sectionRef
      ? `${existingStudent.sectionRef.class?.name} - ${existingStudent.sectionRef.name}`
      : "Previous Placement";

    const newPlacement = entry.placement
      ? `${entry.placement.className} ${entry.placement.sectionName || ""}`
      : "Active Standard";

    const timeline = await tx.studentTimeline.create({
      data: {
        studentId: existingStudent.id,
        title: "Re-Admission Recorded",
        type: "READMISSION",
        description: `Student re-admitted to ${newPlacement} (previously in ${previousPlacement}). Existing Admission No ${existingStudent.admissionNo} preserved. Approved by ${attestation.approvingAuthority} (Batch #${batchId}).`,
      },
    });

    return {
      importKey: entry.importKey,
      sourceRowNumber: entry.sourceRowNumber,
      studentId: existingStudent.id,
      studentName: existingStudent.name,
      admissionNo: existingStudent.admissionNo || existingAdmNo,
      status: "READMISSION_RECORDED",
      message: `Re-admission successfully recorded. Preserved permanent Admission No ${existingStudent.admissionNo}.`,
      timelineId: timeline.id,
      enrollmentSection: entry.placement?.sectionName || undefined,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. INCOMING TRANSFER ADMISSION COMMIT
  // ─────────────────────────────────────────────────────────────

  private static async commitTransferAdmission(
    tx: any,
    schoolId: string,
    batchId: string,
    entry: ValidatedStudentEntry,
    attestation: OfflineApprovalAttestation,
    seqNumber: number
  ): Promise<AdmissionCommitResultItem> {
    const studentData = entry.student;
    const prevSchool = entry.previousSchool;
    const currentYear = new Date().getFullYear();
    const allocatedAdmissionNo = `ADM-${currentYear}-${String(seqNumber).padStart(4, "0")}`;

    // 1. Resolve or Create Primary Guardian
    let guardianId: string | null = null;
    const primaryGrd = entry.guardians.find((g) => g.isPrimary) || entry.guardians[0];

    if (primaryGrd) {
      let existingGrd = await tx.guardian.findFirst({
        where: { schoolId, primaryPhone: primaryGrd.guardian.primaryPhone },
      });

      if (!existingGrd) {
        existingGrd = await tx.guardian.create({
          data: {
            schoolId,
            primaryName: primaryGrd.guardian.name,
            primaryPhone: primaryGrd.guardian.primaryPhone,
            primaryEmail: primaryGrd.guardian.primaryEmail || null,
            primaryRelation: primaryGrd.relationship || primaryGrd.guardian.relationship || "FATHER",
            address: primaryGrd.guardian.address || studentData.address || null,
          },
        });
      }
      guardianId = existingGrd.id;
    }

    // 2. Create Student User Account
    const cleanAdNo = allocatedAdmissionNo.toLowerCase().replace(/[^a-z0-9]/g, "");
    const studentEmail = studentData.email || `${cleanAdNo}_${schoolId.slice(-6)}@student.ssvm`;
    const defaultPassword = `SSVM@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await hashPassword(defaultPassword);

    const user = await tx.user.create({
      data: {
        schoolId,
        email: studentEmail,
        name: studentData.name,
        passwordHash: hashedPassword,
        role: "STUDENT",
        isActive: true,
      },
    });

    // 3. Create Canonical Student Record
    const student = await tx.student.create({
      data: {
        schoolId,
        userId: user.id,
        name: studentData.name,
        rollNo: entry.placement?.rollNo || String(seqNumber),
        admissionNo: allocatedAdmissionNo,
        password: hashedPassword,
        dob: studentData.dob ? new Date(studentData.dob) : null,
        gender: studentData.gender || "OTHER",
        bloodGroup: studentData.bloodGroup || null,
        address: studentData.address || null,
        sectionId: entry.resolvedSectionId || null,
        guardianId: guardianId || null,
        isActive: true,
      },
    });

    // 4. Create Historical Admission Record (Transfer)
    const prevDesc = prevSchool
      ? `Transferred from ${prevSchool.previousSchoolName} (Board: ${prevSchool.previousBoard || "N/A"}, Prev Class: ${prevSchool.previousClass || "N/A"}, TC No: ${prevSchool.tcNumber || "N/A"}).`
      : "Transfer student.";

    await tx.admission.create({
      data: {
        schoolId,
        applicantName: studentData.name,
        applyingForClass: entry.placement?.className || "Class 1",
        dob: studentData.dob ? new Date(studentData.dob) : null,
        gender: studentData.gender,
        parentName: primaryGrd?.guardian.name || "Transfer Guardian",
        parentPhone: primaryGrd?.guardian.primaryPhone || "0000000000",
        parentEmail: primaryGrd?.guardian.primaryEmail || null,
        address: studentData.address || null,
        previousSchool: prevSchool ? prevSchool.previousSchoolName : null,
        status: "ENROLLED",
        remarks: `${prevDesc} Offline transfer approved by ${attestation.approvingAuthority} on ${attestation.approvalDate} (Batch #${batchId}).`,
      },
    });

    // 5. Create Student Timeline Event
    const timeline = await tx.studentTimeline.create({
      data: {
        studentId: student.id,
        title: "Incoming Transfer Admission Enrolled",
        type: "TRANSFER_ADMISSION",
        description: `Incoming transfer admission completed. Allocated SSVM Admission No: ${allocatedAdmissionNo}. ${prevDesc} Approved by ${attestation.approvingAuthority}.`,
      },
    });

    // 6. Link Transfer Certificate / Documents
    for (const doc of entry.documents) {
      await tx.document.create({
        data: {
          schoolId,
          ownerType: "STUDENT",
          ownerId: student.id,
          category: doc.documentCategory as any,
          title: doc.documentTitle,
          fileUrl: doc.fileReference || "/uploads/admissions/pending_transfer_tc.pdf",
        },
      });
    }

    return {
      importKey: entry.importKey,
      sourceRowNumber: entry.sourceRowNumber,
      studentId: student.id,
      studentName: student.name,
      admissionNo: allocatedAdmissionNo,
      status: "REGISTERED",
      message: `Incoming transfer admission recorded with new SSVM Admission No ${allocatedAdmissionNo}. Previous institution data archived.`,
      timelineId: timeline.id,
      enrollmentSection: entry.placement?.sectionName || undefined,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CONCURRENCY-SAFE MONOTONIC ADMISSION SEQUENCE
  // ─────────────────────────────────────────────────────────────

  private static async getNextAdmissionSequenceNumber(tx: any, schoolId: string): Promise<number> {
    // Acquire transaction-scoped advisory lock for this school's admission sequence to serialize concurrent commits
    try {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'admission_seq_' + schoolId}))`;
    } catch (lockErr) {
      // In non-Postgres test environments (e.g. SQLite if any), proceed gracefully
    }

    const currentYear = new Date().getFullYear();
    const prefix = `ADM-${currentYear}-`;

    const latest = await tx.student.findFirst({
      where: {
        schoolId,
        admissionNo: { startsWith: prefix },
      },
      orderBy: { admissionNo: "desc" },
      select: { admissionNo: true },
    });

    if (latest && latest.admissionNo) {
      const match = latest.admissionNo.match(/ADM-\d+-(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10) + 1;
      }
    }

    // Fallback based on total count
    const count = await tx.student.count({ where: { schoolId } });
    return count + 1;
  }
}

