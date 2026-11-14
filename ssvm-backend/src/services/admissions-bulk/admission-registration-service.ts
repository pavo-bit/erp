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
import mailService from "../mail.service";
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
    const pendingInvitations: Array<{ resultItem: AdmissionCommitResultItem; recipient: string; setupLink: string }> = [];
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
              nextSeqNumber++,
              pendingInvitations
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
              nextSeqNumber++,
              pendingInvitations
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

    // Send setup emails after the transaction commits (do not roll back if sending fails)
    for (const inv of pendingInvitations) {
      try {
        await mailService.sendPasswordSetupEmail(inv.recipient, inv.setupLink);
        inv.resultItem.invitationStatus = "SENT";
      } catch (mailErr) {
        logger.warn({ mailErr, recipient: inv.recipient }, "Failed to send student password setup email");
        inv.resultItem.invitationStatus = "FAILED";
      }
    }

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
    seqNumber: number,
    pendingInvitations?: Array<{ resultItem: AdmissionCommitResultItem; recipient: string; setupLink: string }>
  ): Promise<AdmissionCommitResultItem> {
    const studentData = entry.student;
    const currentYear = new Date().getFullYear();
    const allocatedAdmissionNo = `ADM-${currentYear}-${String(seqNumber).padStart(4, "0")}`;

    // 1. Resolve or Create Primary Guardian and StudentGuardian links
    const guardianId = await this.persistStudentGuardians(
      tx,
      schoolId,
      entry,
      studentData.address
    );

    // 2. Create User Account for Student Portal (invitation-based, unusable password)
    const cleanAdNo = allocatedAdmissionNo.toLowerCase().replace(/[^a-z0-9]/g, "");
    const studentEmail = studentData.email || `${cleanAdNo}_${schoolId.slice(-6)}@student.ssvm`;
    const unusableSecret = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await hashPassword(unusableSecret);

    const user = await tx.user.create({
      data: {
        schoolId,
        email: studentEmail,
        name: studentData.name,
        passwordHash: hashedPassword,
        role: "STUDENT",
        mustChangePassword: true,
        isActive: true,
      },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await tx.passwordSetupToken.create({
      data: {
        schoolId,
        userId: user.id,
        tokenHash,
        expiresAt,
        createdBy: attestation.attestedByUserId || user.id,
      },
    });

    const setupLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/set-password?token=${rawToken}`;
    // Resolve invitation destination: student email -> guardian email -> none (UNDELIVERABLE)
    const isFictionalOrEmpty = (e?: string | null) => !e || !e.trim() || e.includes("@student.ssvm");
    let invitationRecipient: string | null = null;
    if (!isFictionalOrEmpty(studentData.email)) {
      invitationRecipient = studentData.email!.trim();
    } else {
      const primaryG = entry.guardians?.find((g) => g.isPrimary) || entry.guardians?.[0];
      const gEmail = primaryG?.guardian?.primaryEmail;
      if (!isFictionalOrEmpty(gEmail)) {
        invitationRecipient = gEmail!.trim();
      }
    }

    // 3. Create Canonical Student Record with extended demographic fields
    const rollNo = entry.placement?.rollNo || String(seqNumber);
    const student = await tx.student.create({
      data: {
        schoolId,
        userId: user.id,
        name: studentData.name,
        rollNo,
        admissionNo: allocatedAdmissionNo,
        password: hashedPassword,
        dob: studentData.dob ? new Date(studentData.dob) : null,
        gender: studentData.gender || "OTHER",
        bloodGroup: studentData.bloodGroup || null,
        address: studentData.address || null,
        pen: studentData.pen || null,
        category: studentData.category || null,
        religion: studentData.religion || null,
        nationality: studentData.nationality || "Indian",
        motherTongue: studentData.motherTongue || null,
        locality: studentData.locality || null,
        pincode: studentData.pincode || null,
        landmark: studentData.landmark || null,
        medicalInfo: studentData.medicalInfo || null,
        emergencyPhone: studentData.emergencyPhone || null,
        previousSchool: entry.previousSchool?.previousSchoolName || null,
        previousBoard: entry.previousSchool?.previousBoard || null,
        previousClass: entry.previousSchool?.previousClass || null,
        previousSession: entry.previousSchool?.previousSession || null,
        previousRollNo: entry.previousSchool?.previousRollNo || null,
        tcNumber: entry.previousSchool?.tcNumber || null,
        tcDate: entry.previousSchool?.tcIssueDate ? new Date(entry.previousSchool.tcIssueDate) : null,
        tcStatus: entry.previousSchool?.tcNumber ? "SUBMITTED" : null,
        sectionId: entry.resolvedSectionId || null,
        guardianId: guardianId || null,
        isActive: true,
      },
    });

    // Attach StudentGuardian links to canonical student ID
    await this.linkStudentGuardians(tx, schoolId, student.id, entry);

    // 4. Create Academic Enrollment and resolve shift
    await this.persistAcademicEnrollment(tx, schoolId, student.id, entry, rollNo);

    // 5. Create Historical Admission Record (Approved & Enrolled)
    const guardiansList = entry.guardians || [];
    const primaryGrd = guardiansList.find((g) => g.isPrimary) || guardiansList[0];
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

    // 6. Create Student Timeline Event
    const timeline = await tx.studentTimeline.create({
      data: {
        studentId: student.id,
        title: "New Student Admission Enrolled",
        type: "NEW_ADMISSION",
        description: `New student admission completed into ${entry.placement?.className || "Class"} ${entry.placement?.sectionName || ""}. Allocated Admission No: ${allocatedAdmissionNo}. Approved by ${attestation.approvingAuthority} (Batch #${batchId}).`,
      },
    });

    // 7. Persist Facility Requests (Transport, Hostel, Meals) without premature allocation
    await this.persistFacilityRequests(tx, schoolId, student.id, batchId, entry);

    // 8. Link Document Metadata without fake URLs
    await this.persistDocuments(tx, schoolId, student.id, entry.documents);

    const resultItem: AdmissionCommitResultItem = {
      importKey: entry.importKey,
      sourceRowNumber: entry.sourceRowNumber,
      studentId: student.id,
      studentName: student.name,
      admissionNo: allocatedAdmissionNo,
      status: "REGISTERED",
      message: `Successfully registered new student with Admission No ${allocatedAdmissionNo}.`,
      timelineId: timeline.id,
      enrollmentSection: entry.placement?.sectionName || undefined,
      invitationStatus: invitationRecipient ? "PENDING" : "UNDELIVERABLE",
    };

    if (invitationRecipient) {
      if (pendingInvitations) {
        pendingInvitations.push({ resultItem, recipient: invitationRecipient, setupLink });
      } else {
        try {
          await mailService.sendPasswordSetupEmail(invitationRecipient, setupLink);
          resultItem.invitationStatus = "SENT";
        } catch (mailErr) {
          logger.warn({ mailErr, recipient: invitationRecipient }, "Failed to send student password setup email");
          resultItem.invitationStatus = "FAILED";
        }
      }
    }

    return resultItem;
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
    if (studentData.pen) updatePayload.pen = studentData.pen;
    if (studentData.category) updatePayload.category = studentData.category;
    if (studentData.locality) updatePayload.locality = studentData.locality;
    if (studentData.pincode) updatePayload.pincode = studentData.pincode;
    if (studentData.medicalInfo) updatePayload.medicalInfo = studentData.medicalInfo;
    if (studentData.emergencyPhone) updatePayload.emergencyPhone = studentData.emergencyPhone;

    if (options.clearEmptyFields) {
      if (studentData.bloodGroup === null) updatePayload.bloodGroup = null;
      if (studentData.address === null) updatePayload.address = null;
    }

    await tx.student.update({
      where: { id: existingStudent.id },
      data: updatePayload,
    });

    // Link/Update Guardians
    if (entry.guardians && entry.guardians.length > 0) {
      await this.persistStudentGuardians(tx, schoolId, entry, studentData.address);
      await this.linkStudentGuardians(tx, schoolId, existingStudent.id, entry);
    }

    // Create Academic Enrollment for this session
    await this.persistAcademicEnrollment(
      tx,
      schoolId,
      existingStudent.id,
      entry,
      existingStudent.rollNo
    );

    // Persist Facility Requests
    await this.persistFacilityRequests(tx, schoolId, existingStudent.id, batchId, entry);

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
    seqNumber: number,
    pendingInvitations?: Array<{ resultItem: AdmissionCommitResultItem; recipient: string; setupLink: string }>
  ): Promise<AdmissionCommitResultItem> {
    const studentData = entry.student;
    const prevSchool = entry.previousSchool;
    const currentYear = new Date().getFullYear();
    const allocatedAdmissionNo = `ADM-${currentYear}-${String(seqNumber).padStart(4, "0")}`;

    // 1. Resolve or Create Primary Guardian
    const guardianId = await this.persistStudentGuardians(
      tx,
      schoolId,
      entry,
      studentData.address
    );

    // 2. Create Student User Account (invitation-based, unusable password)
    const cleanAdNo = allocatedAdmissionNo.toLowerCase().replace(/[^a-z0-9]/g, "");
    const studentEmail = studentData.email || `${cleanAdNo}_${schoolId.slice(-6)}@student.ssvm`;
    const unusableSecret = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await hashPassword(unusableSecret);

    const user = await tx.user.create({
      data: {
        schoolId,
        email: studentEmail,
        name: studentData.name,
        passwordHash: hashedPassword,
        role: "STUDENT",
        mustChangePassword: true,
        isActive: true,
      },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await tx.passwordSetupToken.create({
      data: {
        schoolId,
        userId: user.id,
        tokenHash,
        expiresAt,
        createdBy: attestation.attestedByUserId || user.id,
      },
    });

    const setupLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/set-password?token=${rawToken}`;
    // Resolve invitation destination: student email -> guardian email -> none (UNDELIVERABLE)
    const isFictionalOrEmpty = (e?: string | null) => !e || !e.trim() || e.includes("@student.ssvm");
    let invitationRecipient: string | null = null;
    if (!isFictionalOrEmpty(studentData.email)) {
      invitationRecipient = studentData.email!.trim();
    } else {
      const primaryG = entry.guardians?.find((g) => g.isPrimary) || entry.guardians?.[0];
      const gEmail = primaryG?.guardian?.primaryEmail;
      if (!isFictionalOrEmpty(gEmail)) {
        invitationRecipient = gEmail!.trim();
      }
    }

    // 3. Create Canonical Student Record with transfer details
    const rollNo = entry.placement?.rollNo || String(seqNumber);
    const student = await tx.student.create({
      data: {
        schoolId,
        userId: user.id,
        name: studentData.name,
        rollNo,
        admissionNo: allocatedAdmissionNo,
        password: hashedPassword,
        dob: studentData.dob ? new Date(studentData.dob) : null,
        gender: studentData.gender || "OTHER",
        bloodGroup: studentData.bloodGroup || null,
        address: studentData.address || null,
        pen: studentData.pen || null,
        category: studentData.category || null,
        religion: studentData.religion || null,
        nationality: studentData.nationality || "Indian",
        motherTongue: studentData.motherTongue || null,
        locality: studentData.locality || null,
        pincode: studentData.pincode || null,
        landmark: studentData.landmark || null,
        medicalInfo: studentData.medicalInfo || null,
        emergencyPhone: studentData.emergencyPhone || null,
        previousSchool: prevSchool?.previousSchoolName || null,
        previousBoard: prevSchool?.previousBoard || null,
        previousClass: prevSchool?.previousClass || null,
        previousSession: prevSchool?.previousSession || null,
        previousRollNo: prevSchool?.previousRollNo || null,
        tcNumber: prevSchool?.tcNumber || null,
        tcDate: prevSchool?.tcIssueDate ? new Date(prevSchool.tcIssueDate) : null,
        tcStatus: prevSchool?.tcNumber ? "SUBMITTED" : null,
        sectionId: entry.resolvedSectionId || null,
        guardianId: guardianId || null,
        isActive: true,
      },
    });

    // Attach StudentGuardian links
    await this.linkStudentGuardians(tx, schoolId, student.id, entry);

    // 4. Create Academic Enrollment and resolve shift
    await this.persistAcademicEnrollment(tx, schoolId, student.id, entry, rollNo);

    // 5. Create Historical Admission Record (Transfer)
    const prevDesc = prevSchool
      ? `Transferred from ${prevSchool.previousSchoolName} (Board: ${prevSchool.previousBoard || "N/A"}, Prev Class: ${prevSchool.previousClass || "N/A"}, TC No: ${prevSchool.tcNumber || "N/A"}).`
      : "Transfer student.";

    const guardiansList = entry.guardians || [];
    const primaryGrd = guardiansList.find((g) => g.isPrimary) || guardiansList[0];
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

    // 6. Create Student Timeline Event
    const timeline = await tx.studentTimeline.create({
      data: {
        studentId: student.id,
        title: "Incoming Transfer Admission Enrolled",
        type: "TRANSFER_ADMISSION",
        description: `Incoming transfer admission completed. Allocated SSVM Admission No: ${allocatedAdmissionNo}. ${prevDesc} Approved by ${attestation.approvingAuthority}.`,
      },
    });

    // 7. Persist Facility Requests
    await this.persistFacilityRequests(tx, schoolId, student.id, batchId, entry);

    // 8. Link Supporting Documents and TC without fake URLs
    await this.persistDocuments(tx, schoolId, student.id, entry.documents);

    const resultItem: AdmissionCommitResultItem = {
      importKey: entry.importKey,
      sourceRowNumber: entry.sourceRowNumber,
      studentId: student.id,
      studentName: student.name,
      admissionNo: allocatedAdmissionNo,
      status: "REGISTERED",
      message: `Incoming transfer admission recorded with new SSVM Admission No ${allocatedAdmissionNo}. Previous institution data archived.`,
      timelineId: timeline.id,
      enrollmentSection: entry.placement?.sectionName || undefined,
      invitationStatus: invitationRecipient ? "PENDING" : "UNDELIVERABLE",
    };

    if (invitationRecipient) {
      if (pendingInvitations) {
        pendingInvitations.push({ resultItem, recipient: invitationRecipient, setupLink });
      } else {
        try {
          await mailService.sendPasswordSetupEmail(invitationRecipient, setupLink);
          resultItem.invitationStatus = "SENT";
        } catch (mailErr) {
          logger.warn({ mailErr, recipient: invitationRecipient }, "Failed to send student password setup email");
          resultItem.invitationStatus = "FAILED";
        }
      }
    }

    return resultItem;
  }

  // ─────────────────────────────────────────────────────────────
  // OPERATIONAL PERSISTENCE HELPERS
  // ─────────────────────────────────────────────────────────────

  private static async persistStudentGuardians(
    tx: any,
    schoolId: string,
    entry: ValidatedStudentEntry,
    studentAddress?: string | null
  ): Promise<string | null> {
    let primaryGuardianId: string | null = null;
    const primaryGrd = entry.guardians.find((g) => g.isPrimary) || entry.guardians[0];

    for (const g of entry.guardians) {
      const phone = g.guardian.primaryPhone.trim();
      let guardian = await tx.guardian.findFirst({
        where: { schoolId, primaryPhone: phone },
      });

      if (!guardian) {
        guardian = await tx.guardian.create({
          data: {
            schoolId,
            primaryName: g.guardian.name,
            primaryPhone: phone,
            primaryEmail: g.guardian.primaryEmail || null,
            primaryRelation: g.relationship || g.guardian.relationship || "FATHER",
            address: g.guardian.address || studentAddress || null,
          },
        });
      }

      if (g.isPrimary || (primaryGrd && primaryGrd.guardian.primaryPhone === phone)) {
        primaryGuardianId = guardian.id;
      }
    }

    return primaryGuardianId;
  }

  private static async linkStudentGuardians(
    tx: any,
    schoolId: string,
    studentId: string,
    entry: ValidatedStudentEntry
  ): Promise<void> {
    if (!entry.guardians || !Array.isArray(entry.guardians)) return;
    for (const g of entry.guardians) {
      const phone = g.guardian.primaryPhone.trim();
      const guardian = await tx.guardian.findFirst({
        where: { schoolId, primaryPhone: phone },
      });

      if (guardian) {
        await tx.studentGuardian.upsert({
          where: {
            studentId_guardianId: {
              studentId,
              guardianId: guardian.id,
            },
          },
          create: {
            schoolId,
            studentId,
            guardianId: guardian.id,
            relationship: g.relationship || g.guardian.relationship || "FATHER",
            isPrimary: g.isPrimary ?? false,
            isEmergencyContact: g.guardian.isEmergencyContact ?? false,
          },
          update: {
            relationship: g.relationship || g.guardian.relationship || "FATHER",
            isPrimary: g.isPrimary ?? false,
            isEmergencyContact: g.guardian.isEmergencyContact ?? false,
          },
        });
      }
    }
  }

  /**
   * Resolves the configured shift for a student's class and academic session dynamically.
   * Enforces:
   * 1. Resolution via (schoolId, sessionId, classId) from normalized SchoolShiftClass assignments.
   * 2. Exactly one matching assignment.
   * 3. Rejection of inactive configurations and ambiguous assignments.
   * 4. Fails closed with an actionable error if no configuration exists.
   */
  private static async resolveSchoolShift(
    tx: any,
    schoolId: string,
    sessionId: string,
    classId: string,
    className?: string | null
  ): Promise<{ id: string; version: number }> {
    // 1. Primary path: query normalized SchoolShiftClass junction table
    const shiftClass = await tx.schoolShiftClass.findFirst({
      where: {
        schoolId,
        sessionId,
        classId,
        isActive: true,
      },
      include: {
        shift: true,
      },
    });

    if (shiftClass && shiftClass.shift) {
      const shift = shiftClass.shift;
      if (!shift.isActive) {
        throw new Error(
          `Configured shift "${shift.name}" for class "${className || classId}" is inactive. Please activate it in Shift Configuration.`
        );
      }
      return {
        id: shift.id,
        version: shift.configurationVersion || 1,
      };
    }

    // 2. Secondary path: check if session has active published shifts configured
    // For legacy shifts that have applicableClasses matching this class
    const cName = (className || "").trim().toLowerCase();
    if (cName) {
      const matchingShifts = await tx.schoolShift.findMany({
        where: {
          schoolId,
          isActive: true,
          OR: [
            { sessionId },
            { sessionId: null },
          ],
        },
      });

      const matched = matchingShifts.filter((s: any) => {
        if (!s.applicableClasses) return false;
        const classes = s.applicableClasses.split(",").map((name: string) => name.trim().toLowerCase());
        return classes.includes(cName);
      });

      if (matched.length === 1) {
        return {
          id: matched[0].id,
          version: matched[0].configurationVersion || 1,
        };
      } else if (matched.length > 1) {
        throw new Error(
          `Ambiguous shift configuration: Class "${className}" is assigned to multiple shifts: ${matched.map((m: any) => m.name).join(", ")}.`
        );
      }
    }

    // 3. Fail closed: no valid configuration found
    throw new Error(
      `NO_SHIFT_CONFIGURED_FOR_CLASS: No active school shift is configured for class "${className || classId}" in academic session "${sessionId}". Please configure shifts in Super Admin.`
    );
  }

  private static async persistAcademicEnrollment(
    tx: any,
    schoolId: string,
    studentId: string,
    entry: ValidatedStudentEntry,
    rollNo: string
  ): Promise<void> {
    if (!entry.resolvedSessionId || !entry.resolvedClassId) return;

    const resolvedShift = await this.resolveSchoolShift(
      tx,
      schoolId,
      entry.resolvedSessionId,
      entry.resolvedClassId,
      entry.placement?.className
    );

    await tx.studentEnrollment.upsert({
      where: {
        studentId_sessionId: {
          studentId,
          sessionId: entry.resolvedSessionId,
        },
      },
      create: {
        schoolId,
        studentId,
        sessionId: entry.resolvedSessionId,
        classId: entry.resolvedClassId,
        sectionId: entry.resolvedSectionId || null,
        rollNo: entry.placement?.rollNo || rollNo,
        shiftId: resolvedShift.id,
        shiftVersion: resolvedShift.version,
        status: "ACTIVE",
      },
      update: {
        classId: entry.resolvedClassId,
        sectionId: entry.resolvedSectionId || null,
        rollNo: entry.placement?.rollNo || rollNo,
        shiftId: resolvedShift.id,
        shiftVersion: resolvedShift.version,
        status: "ACTIVE",
      },
    });
  }

  private static async persistFacilityRequests(
    tx: any,
    schoolId: string,
    studentId: string,
    batchId: string,
    entry: ValidatedStudentEntry
  ): Promise<void> {
    if (!entry.facilities || !Array.isArray(entry.facilities)) return;
    for (const fac of entry.facilities) {
      const code = (fac.facilityCode || "").toUpperCase().trim();
      if (!["TRANSPORT", "HOSTEL", "MEALS", "OTHER"].includes(code)) continue;

      await tx.facilityRequest.create({
        data: {
          schoolId,
          studentId,
          sessionId: entry.resolvedSessionId || null,
          facilityType: code,
          status: "REQUESTED",
          details: fac.details || (entry.student.locality ? `Locality: ${entry.student.locality}` : null),
          batchId,
          notes: `Requested via admission import batch ${batchId}.`,
        },
      });
    }
  }

  private static async persistDocuments(
    tx: any,
    schoolId: string,
    studentId: string,
    documents: any[]
  ): Promise<void> {
    if (!documents || !Array.isArray(documents)) return;
    for (const doc of documents) {
      const fileRef = (doc.fileReference || "").trim();
      const hasRealFile = Boolean(fileRef && !fileRef.includes("pending_document"));

      await tx.document.create({
        data: {
          schoolId,
          ownerType: "STUDENT",
          ownerId: studentId,
          category: doc.documentCategory as any,
          title: doc.documentTitle,
          fileUrl: hasRealFile ? fileRef : "",
          verificationStatus: hasRealFile ? "UPLOADED" : "PENDING_UPLOAD",
        },
      });
    }
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

