/**
 * ssvm-backend/src/services/import-framework/import-processor.ts
 *
 * Transactional executor for bulk data import.
 * Respects clearEmptyFields policy, enforces tenant isolation,
 * and writes through canonical database models.
 */

import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import logger from "../../lib/logger";
import { ClassifiedRow } from "./duplicate-detector";
import { ModuleTemplateDefinition } from "./template-registry";
import crypto from "crypto";
import { Role } from "@prisma/client";

export interface ImportOptions {
  clearEmptyFields: boolean; // default false
  skipInvalidRows: boolean;  // default true
}

export interface ImportExecutionResult {
  jobId: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdCount: number;
  updatedCount: number;
  errorLog: Array<{ rowNumber: number; errors: string[] }>;
}

export class ImportProcessorService {
  public static async executeImport(
    schoolId: string,
    userId: string,
    template: ModuleTemplateDefinition,
    rows: ClassifiedRow[],
    options: ImportOptions = { clearEmptyFields: false, skipInvalidRows: true }
  ): Promise<ImportExecutionResult> {
    const errorLog: Array<{ rowNumber: number; errors: string[] }> = [];
    let createdCount = 0;
    let updatedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    // Filter valid actionable rows
    const processableRows = rows.filter((r) => r.isValid && (r.action === "CREATE" || r.action === "UPDATE"));

    // Record invalid rows in error log immediately
    rows.forEach((r) => {
      if (!r.isValid) {
        failedCount++;
        errorLog.push({
          rowNumber: r.rowNumber,
          errors: r.errors.map((e) => e.message),
        });
      }
    });

    let bulkJobId = "";

    // Execute in tenant transaction
    await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // Create BulkJob tracking record inside tenant context
      const bulkJob = await tx.bulkJob.create({
        data: {
          schoolId,
          type: `${template.moduleId.toUpperCase()}_IMPORT`,
          status: "PROCESSING",
          totalRows: rows.length,
          progress: 0,
        },
      });
      bulkJobId = bulkJob.id;

      for (const row of processableRows) {
        try {
          if (template.moduleId === "students") {
            const res = await this.processStudentRow(tx, schoolId, row, options);
            if (res === "CREATE") createdCount++;
            else updatedCount++;
            successCount++;
          } else if (template.moduleId === "guardians") {
            const res = await this.processGuardianRow(tx, schoolId, row, options);
            if (res === "CREATE") createdCount++;
            else updatedCount++;
            successCount++;
          } else if (template.moduleId === "staff") {
            const res = await this.processStaffRow(tx, schoolId, row, options);
            if (res === "CREATE") createdCount++;
            else updatedCount++;
            successCount++;
          } else if (template.moduleId === "classes") {
            const res = await this.processClassRow(tx, schoolId, row, options);
            if (res === "CREATE") createdCount++;
            else updatedCount++;
            successCount++;
          } else if (template.moduleId === "subjects") {
            const res = await this.processSubjectRow(tx, schoolId, row, options);
            if (res === "CREATE") createdCount++;
            else updatedCount++;
            successCount++;
          } else if (template.moduleId === "attendance") {
            await this.processAttendanceRow(tx, schoolId, row);
            createdCount++;
            successCount++;
          } else if (template.moduleId === "fees") {
            const res = await this.processFeeRow(tx, schoolId, row, options);
            if (res === "CREATE") createdCount++;
            else updatedCount++;
            successCount++;
          } else {
            throw new Error(`Unsupported module write processor for "${template.moduleId}".`);
          }
        } catch (err: any) {
          failedCount++;
          errorLog.push({
            rowNumber: row.rowNumber,
            errors: [err.message || "Write transaction failed"],
          });
        }
      }

      // Update BulkJob completion status inside tenant context
      await tx.bulkJob.update({
        where: { id: bulkJob.id },
        data: {
          status: failedCount === 0 ? "COMPLETED" : successCount > 0 ? "PARTIALLY_COMPLETED" : "FAILED",
          progress: 100,
          successRows: successCount,
          failedRows: failedCount,
          errorFile: errorLog.length > 0 ? JSON.stringify(errorLog) : null,
        },
      });
    });

    return {
      jobId: bulkJobId,
      totalRows: rows.length,
      successCount,
      failedCount,
      createdCount,
      updatedCount,
      errorLog,
    };
  }

  // ─────────────────────────────────────────────────────────
  // MODULE WRITERS
  // ─────────────────────────────────────────────────────────

  private static async processStudentRow(
    tx: any,
    schoolId: string,
    row: ClassifiedRow,
    options: ImportOptions
  ): Promise<"CREATE" | "UPDATE"> {
    const vals = row.sanitizedValues;

    if (row.action === "UPDATE" && row.existingRecordId) {
      const updateData: any = {};
      if (vals.name) updateData.name = vals.name;
      if (vals.admissionNo) updateData.admissionNo = vals.admissionNo;
      if (vals.gender) updateData.gender = vals.gender;
      if (vals._resolvedSectionId) updateData.sectionId = vals._resolvedSectionId;

      if (options.clearEmptyFields) {
        if (vals.dob === null) updateData.dob = null;
        if (vals.admissionNo === null) updateData.admissionNo = null;
      } else if (vals.dob) {
        updateData.dob = new Date(vals.dob);
      }

      await tx.student.update({
        where: { id: row.existingRecordId },
        data: updateData,
      });
      return "UPDATE";
    } else {
      await tx.student.create({
        data: {
          schoolId,
          name: vals.name,
          rollNo: vals.rollNo,
          admissionNo: vals.admissionNo || null,
          gender: vals.gender || null,
          sectionId: vals._resolvedSectionId || null,
          dob: vals.dob ? new Date(vals.dob) : null,
          isActive: true,
        },
      });
      return "CREATE";
    }
  }

  private static async processGuardianRow(
    tx: any,
    schoolId: string,
    row: ClassifiedRow,
    options: ImportOptions
  ): Promise<"CREATE" | "UPDATE"> {
    const vals = row.sanitizedValues;
    const studentId = vals._resolvedStudentId;

    let guardian = await tx.guardian.findFirst({
      where: { schoolId, primaryPhone: vals.primaryPhone },
    });

    let action: "CREATE" | "UPDATE" = "CREATE";

    if (!guardian) {
      guardian = await tx.guardian.create({
        data: {
          schoolId,
          primaryName: vals.name,
          primaryRelation: vals.relationship || "Father",
          primaryPhone: vals.primaryPhone,
          primaryEmail: vals.primaryEmail || null,
          address: vals.address || null,
        },
      });
    } else {
      action = "UPDATE";
      const updateData: any = { primaryName: vals.name, primaryRelation: vals.relationship || "Father" };
      if (vals.primaryEmail) updateData.primaryEmail = vals.primaryEmail;
      if (vals.address) updateData.address = vals.address;
      await tx.guardian.update({
        where: { id: guardian.id },
        data: updateData,
      });
    }

    // Link guardian to student if studentId resolved
    if (studentId) {
      await tx.student.update({
        where: { id: studentId },
        data: { guardianId: guardian.id },
      });
    }

    return action;
  }

  private static async processStaffRow(
    tx: any,
    schoolId: string,
    row: ClassifiedRow,
    options: ImportOptions
  ): Promise<"CREATE" | "UPDATE"> {
    const vals = row.sanitizedValues;

    if (row.action === "UPDATE" && row.existingRecordId) {
      const updateData: any = { name: vals.name };
      if (vals.department) updateData.department = vals.department;
      if (vals.phone) updateData.phone = vals.phone;
      if (vals.role) updateData.role = vals.role as Role;
      await tx.user.update({
        where: { id: row.existingRecordId },
        data: updateData,
      });
      return "UPDATE";
    } else {
      await tx.user.create({
        data: {
          schoolId,
          name: vals.name,
          email: vals.email,
          employeeId: vals.employeeId,
          role: (vals.role as Role) || Role.TEACHER,
          department: vals.department || null,
          phone: vals.phone || null,
          passwordHash: crypto.randomBytes(16).toString("hex"),
          isActive: true,
        },
      });
      return "CREATE";
    }
  }

  private static async processClassRow(
    tx: any,
    schoolId: string,
    row: ClassifiedRow,
    options: ImportOptions
  ): Promise<"CREATE" | "UPDATE"> {
    const vals = row.sanitizedValues;

    let classRecord = await tx.class.findFirst({
      where: { schoolId, name: vals.className },
    });

    let action: "CREATE" | "UPDATE" = "CREATE";

    if (!classRecord) {
      let session = await tx.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (!session) {
        session = await tx.academicSession.findFirst({
          where: { schoolId },
          orderBy: { startDate: "desc" },
        });
      }
      if (!session) {
        session = await tx.academicSession.create({
          data: {
            schoolId,
            name: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
            isCurrent: true,
          },
        });
      }
      classRecord = await tx.class.create({
        data: {
          schoolId,
          sessionId: session.id,
          name: vals.className,
        },
      });
    } else {
      action = "UPDATE";
    }

    // Add or update section if specified
    if (vals.sectionName) {
      const existingSec = await tx.section.findFirst({
        where: { classId: classRecord.id, name: vals.sectionName },
      });
      if (!existingSec) {
        await tx.section.create({
          data: {
            classId: classRecord.id,
            name: vals.sectionName,
            capacity: vals.capacity ? Number(vals.capacity) : 40,
            room: vals.room || null,
          },
        });
      } else if (vals.capacity || vals.room) {
        await tx.section.update({
          where: { id: existingSec.id },
          data: {
            ...(vals.capacity && { capacity: Number(vals.capacity) }),
            ...(vals.room && { room: vals.room }),
          },
        });
      }
    }

    return action;
  }

  private static async processSubjectRow(
    tx: any,
    schoolId: string,
    row: ClassifiedRow,
    options: ImportOptions
  ): Promise<"CREATE" | "UPDATE"> {
    const vals = row.sanitizedValues;

    if (row.action === "UPDATE" && row.existingRecordId) {
      await tx.subject.update({
        where: { id: row.existingRecordId },
        data: {
          name: vals.name,
          type: vals.type || "THEORY",
          credits: vals.credits ? Number(vals.credits) : null,
        },
      });
      return "UPDATE";
    } else {
      await tx.subject.create({
        data: {
          schoolId,
          code: vals.code,
          name: vals.name,
          type: vals.type || "THEORY",
          credits: vals.credits ? Number(vals.credits) : null,
        },
      });
      return "CREATE";
    }
  }

  private static async processAttendanceRow(tx: any, schoolId: string, row: ClassifiedRow): Promise<void> {
    const vals = row.sanitizedValues;
    const studentId = vals._resolvedStudentId;
    if (!studentId) throw new Error("Student ID unresolved");

    const date = new Date(vals.date);

    // Upsert student attendance record for the date
    const existing = await tx.attendance.findFirst({
      where: { schoolId, studentId, date },
    });

    if (existing) {
      await tx.attendance.update({
        where: { id: existing.id },
        data: {
          status: vals.status,
          remarks: vals.remarks || null,
        },
      });
    } else {
      await tx.attendance.create({
        data: {
          schoolId,
          studentId,
          date,
          status: vals.status,
          remarks: vals.remarks || null,
        },
      });
    }
  }

  private static async processFeeRow(
    tx: any,
    schoolId: string,
    row: ClassifiedRow,
    options: ImportOptions
  ): Promise<"CREATE" | "UPDATE"> {
    const vals = row.sanitizedValues;

    let category = await tx.feeCategory.findFirst({
      where: { schoolId, name: vals.name },
    });
    if (!category) {
      category = await tx.feeCategory.create({
        data: {
          schoolId,
          name: vals.name,
        },
      });
    }

    let feeStructure = await tx.feeStructure.findFirst({
      where: { schoolId, categoryId: category.id },
    });

    if (feeStructure) {
      await tx.feeStructure.update({
        where: { id: feeStructure.id },
        data: {
          amount: Number(vals.amount),
        },
      });
      return "UPDATE";
    } else {
      await tx.feeStructure.create({
        data: {
          schoolId,
          categoryId: category.id,
          amount: Number(vals.amount),
        },
      });
      return "CREATE";
    }
  }
}

