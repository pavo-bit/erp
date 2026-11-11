/**
 * ssvm-backend/src/services/admissions-bulk/admission-fee-config.service.ts
 *
 * Manages institutional application fee configuration, audit history,
 * and immutable form issuance fee snapshots.
 */

import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import logger from "../../lib/logger";

export interface FeeChangeAuditRecord {
  id: string;
  previousFee: number;
  newFee: number;
  changedById: string;
  changedByName?: string;
  changedAt: Date;
  reason: string;
}

export interface IssuedFormSnapshot {
  formNumber: string;
  formType: "NEW" | "READMISSION" | "TRANSFER";
  feeAmount: number;
  applicantName?: string;
  academicSession?: string;
  issuedById: string;
  issuedByName?: string;
  issuedAt: Date;
  schoolId: string;
}

export class AdmissionFeeConfigService {
  public static readonly DEFAULT_FEE = 200;
  private static readonly CONFIG_KEY_PREFIX = "ADMISSION_APPLICATION_FEE:";

  private static getConfigKey(schoolId: string): string {
    return `${this.CONFIG_KEY_PREFIX}${schoolId}`;
  }

  /**
   * Get the currently active admission application fee for a tenant.
   * Defaults to ₹200 if not explicitly configured.
   */
  public static async getApplicationFee(schoolId: string): Promise<number> {
    try {
      const key = this.getConfigKey(schoolId);
      const config = await prisma.appConfiguration.findUnique({
        where: { key },
      });

      if (!config) {
        return this.DEFAULT_FEE;
      }

      const parsed = parseInt(config.value, 10);
      return isNaN(parsed) || parsed < 0 ? this.DEFAULT_FEE : parsed;
    } catch (err) {
      logger.warn({ err, schoolId }, "Failed to load application fee from appConfiguration, falling back to default");
      return this.DEFAULT_FEE;
    }
  }

  /**
   * Update the application fee for a tenant.
   * Records previous fee, new fee, user, timestamp, tenant, and reason in
   * both ConfigHistory and AuditLog.
   */
  public static async updateApplicationFee(
    schoolId: string,
    userId: string,
    newFee: number,
    reason?: string
  ): Promise<{ previousFee: number; newFee: number }> {
    if (!Number.isInteger(newFee) || newFee < 0) {
      throw new Error("Application fee must be a non-negative whole integer in Indian Rupees (INR).");
    }

    const previousFee = await this.getApplicationFee(schoolId);
    const key = this.getConfigKey(schoolId);
    const updateReason = reason?.trim() || "Institutional application fee adjustment by Admission Incharge";

    // Upsert AppConfiguration & create ConfigHistory and AuditLog inside tenant transaction (RLS enforced)
    await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      let config = await tx.appConfiguration.findUnique({ where: { key } });

      if (config) {
        config = await tx.appConfiguration.update({
          where: { key },
          data: {
            value: String(newFee),
            updatedBy: userId,
          },
        });
      } else {
        config = await tx.appConfiguration.create({
          data: {
            key,
            value: String(newFee),
            type: "NUMBER",
            description: `Admission Application Fee for School ${schoolId}`,
            updatedBy: userId,
          },
        });
      }

      // Record ConfigHistory
      await tx.configHistory.create({
        data: {
          configurationId: config.id,
          oldValue: String(previousFee),
          newValue: String(newFee),
          changedBy: userId,
          reason: updateReason,
        },
      });

      // Record formal tenant AuditLog
      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "ADMISSION_FEE_UPDATED",
          entity: "AdmissionFee",
          entityId: key,
          details: JSON.stringify({
            previousFee,
            newFee,
            changedBy: userId,
            timestamp: new Date().toISOString(),
            reason: updateReason,
          }),
        },
      });
    });

    logger.info(
      { schoolId, userId, previousFee, newFee, updateReason },
      "Admission application fee updated successfully"
    );

    return { previousFee, newFee };
  }

  /**
   * Retrieve the full fee modification audit history for an institution
   */
  public static async getFeeAuditHistory(schoolId: string): Promise<FeeChangeAuditRecord[]> {
    const key = this.getConfigKey(schoolId);
    const config = await prisma.appConfiguration.findUnique({
      where: { key },
      include: {
        history: {
          orderBy: { changedAt: "desc" },
          take: 25,
        },
      },
    });

    if (!config || !config.history.length) {
      // Query from audit logs if config history is empty inside tenant context
      const logs = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        return tx.auditLog.findMany({
          where: {
            schoolId,
            action: "ADMISSION_FEE_UPDATED",
          },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: { user: { select: { name: true } } },
        });
      });

      return logs.map((log) => {
        let details: any = {};
        try {
          details = JSON.parse(log.details || "{}");
        } catch {}
        return {
          id: log.id,
          previousFee: details.previousFee ?? this.DEFAULT_FEE,
          newFee: details.newFee ?? this.DEFAULT_FEE,
          changedById: log.userId || "SYSTEM",
          changedByName: log.user?.name || "Administrator",
          changedAt: log.createdAt,
          reason: details.reason || log.reason || "Fee modification",
        };
      });
    }

    // Resolve user names
    const userIds = Array.from(new Set(config.history.map((h) => h.changedBy).filter(Boolean))) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return config.history.map((h) => ({
      id: h.id,
      previousFee: parseInt(h.oldValue || String(this.DEFAULT_FEE), 10),
      newFee: parseInt(h.newValue, 10),
      changedById: h.changedBy || "SYSTEM",
      changedByName: h.changedBy ? userMap.get(h.changedBy) || "Staff" : "System",
      changedAt: h.changedAt,
      reason: h.reason || "Fee adjustment",
    }));
  }

  /**
   * Issues an official admission form and generates an immutable fee snapshot.
   * Previously issued forms retain the fee that was applicable when they were issued.
   */
  public static async issueForm(
    schoolId: string,
    userId: string,
    formType: "NEW" | "READMISSION" | "TRANSFER",
    applicantName?: string,
    academicSession?: string
  ): Promise<IssuedFormSnapshot> {
    const currentFee = await this.getApplicationFee(schoolId);
    const currentYear = new Date().getFullYear();

    // Generate unique issuance number and store immutable snapshot inside tenant transaction (RLS enforced)
    const snapshot = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const count = await tx.auditLog.count({
        where: {
          schoolId,
          action: "ADMISSION_FORM_ISSUED",
        },
      });
      const formNumber = `FORM-${currentYear}-${String(count + 1).padStart(4, "0")}`;

      const item: IssuedFormSnapshot = {
        formNumber,
        formType,
        feeAmount: currentFee,
        applicantName: applicantName?.trim() || undefined,
        academicSession: academicSession || `${currentYear}-${currentYear + 1}`,
        issuedById: userId,
        issuedAt: new Date(),
        schoolId,
      };

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "ADMISSION_FORM_ISSUED",
          entity: "AdmissionForm",
          entityId: formNumber,
          details: JSON.stringify(item),
        },
      });

      return item;
    });

    logger.info({ formNumber: snapshot.formNumber, formType, feeAmount: currentFee, schoolId }, "Official admission form issued");

    return snapshot;
  }

  /**
   * Look up an issued form snapshot to retrieve its immutable original fee
   */
  public static async getIssuedFormSnapshot(
    schoolId: string,
    formNumber: string
  ): Promise<IssuedFormSnapshot | null> {
    const log = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      return tx.auditLog.findFirst({
        where: {
          schoolId,
          action: "ADMISSION_FORM_ISSUED",
          entityId: formNumber,
        },
      });
    });

    if (!log || !log.details) {
      return null;
    }

    try {
      return JSON.parse(log.details) as IssuedFormSnapshot;
    } catch {
      return null;
    }
  }
}

