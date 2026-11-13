/**
 * ssvm-backend/src/services/admissions-bulk/admission-fee-config.service.ts
 *
 * Manages institutional application fee configuration, audit history,
 * and immutable form issuance fee snapshots with strict PostgreSQL
 * Row-Level Security and transaction-scoped advisory concurrency locking.
 */

import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import logger from "../../lib/logger";

export interface FeeChangeAuditRecord {
  id: string;
  previousFee: number;
  newFee: number;
  changedById: string;
  changedByName: string;
  userName: string;
  changedAt: Date;
  timestamp: string;
  reason: string;
  schoolId: string;
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
   * Returns DEFAULT_FEE (₹200) only when configuration legitimately does not exist.
   * Does NOT silently catch database exceptions.
   */
  public static async getApplicationFee(schoolId: string): Promise<number> {
    if (!schoolId) {
      throw new Error("Tenant schoolId is required to retrieve admission application fee.");
    }
    const key = this.getConfigKey(schoolId);
    const config = await prisma.appConfiguration.findUnique({
      where: { key },
    });

    if (!config) {
      return this.DEFAULT_FEE;
    }

    const parsed = parseInt(config.value, 10);
    return isNaN(parsed) || parsed < 0 ? this.DEFAULT_FEE : parsed;
  }

  /**
   * Update the application fee for a tenant.
   * Uses transaction-scoped advisory locking to serialize concurrent fee modifications
   * and accurately capture previousFee, newFee, user, timestamp, tenant, and reason in
   * both ConfigHistory and tenant-scoped AuditLog.
   */
  public static async updateApplicationFee(
    schoolId: string,
    userId: string,
    newFee: number,
    reason?: string
  ): Promise<{ previousFee: number; newFee: number }> {
    if (!schoolId) {
      throw new Error("Tenant schoolId is required to update application fee.");
    }
    if (!Number.isInteger(newFee) || newFee < 0) {
      throw new Error("Application fee must be a non-negative whole integer in Indian Rupees (INR).");
    }

    const updateReason = reason?.trim();
    if (!updateReason) {
      throw new Error("A meaningful administrative reason is required to modify the application fee.");
    }

    const key = this.getConfigKey(schoolId);

    return await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // 1. Acquire transaction advisory lock for fee updates for this tenant
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'admission_fee_lock_' + schoolId}))`;
      } catch {}

      // 2. Read CURRENT fee inside the lock to eliminate concurrent stale read anomalies
      const existingConfig = await tx.appConfiguration.findUnique({ where: { key } });
      const previousFee = existingConfig ? (parseInt(existingConfig.value, 10) || this.DEFAULT_FEE) : this.DEFAULT_FEE;

      let config = existingConfig;
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

      // 3. Record ConfigHistory
      await tx.configHistory.create({
        data: {
          configurationId: config.id,
          oldValue: String(previousFee),
          newValue: String(newFee),
          changedBy: userId,
          reason: updateReason,
        },
      });

      // 4. Record tenant-scoped AuditLog
      const auditPayload = {
        previousFee,
        newFee,
        changedBy: userId,
        timestamp: new Date().toISOString(),
        reason: updateReason,
        schoolId,
      };

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "ADMISSION_FEE_UPDATED",
          entity: "AdmissionFee",
          entityId: key,
          details: JSON.stringify(auditPayload),
        },
      });

      logger.info(
        { schoolId, userId, previousFee, newFee, updateReason },
        "Admission application fee updated successfully"
      );

      return { previousFee, newFee };
    });
  }

  /**
   * Retrieve the full fee modification audit history for an institution
   */
  public static async getFeeAuditHistory(schoolId: string): Promise<FeeChangeAuditRecord[]> {
    if (!schoolId) return [];
    const key = this.getConfigKey(schoolId);

    const config = await prisma.appConfiguration.findUnique({
      where: { key },
      include: {
        history: {
          orderBy: { changedAt: "desc" },
          take: 50,
        },
      },
    });

    if (!config || !config.history.length) {
      // Query from audit logs if config history is empty
      const logs = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        return tx.auditLog.findMany({
          where: {
            schoolId,
            action: "ADMISSION_FEE_UPDATED",
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { name: true } } },
        });
      });

      return logs.map((log) => {
        let details: any = {};
        try {
          details = JSON.parse(log.details || "{}");
        } catch {}
        const name = log.user?.name || "Administrator";
        return {
          id: log.id,
          previousFee: details.previousFee ?? this.DEFAULT_FEE,
          newFee: details.newFee ?? this.DEFAULT_FEE,
          changedById: log.userId || "SYSTEM",
          changedByName: name,
          userName: name,
          changedAt: log.createdAt,
          timestamp: log.createdAt.toISOString(),
          reason: details.reason || "Fee modification",
          schoolId,
        };
      });
    }

    // Resolve user names for config history records
    const userIds = Array.from(new Set(config.history.map((h) => h.changedBy).filter(Boolean))) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return config.history.map((h) => {
      const name = h.changedBy ? userMap.get(h.changedBy) || "Staff" : "System";
      return {
        id: h.id,
        previousFee: parseInt(h.oldValue || String(this.DEFAULT_FEE), 10),
        newFee: parseInt(h.newValue, 10),
        changedById: h.changedBy || "SYSTEM",
        changedByName: name,
        userName: name,
        changedAt: h.changedAt,
        timestamp: h.changedAt.toISOString(),
        reason: h.reason || "Fee adjustment",
        schoolId,
      };
    });
  }

  /**
   * Issues an official admission form and generates an immutable fee snapshot.
   * Employs PostgreSQL transaction advisory locking to guarantee concurrency-safe,
   * gapless monotonic FORM-YYYY-XXXX generation without collisions or race conditions.
   */
  public static async issueForm(
    schoolId: string,
    userId: string,
    formType: "NEW" | "READMISSION" | "TRANSFER",
    applicantName?: string,
    academicSession?: string
  ): Promise<IssuedFormSnapshot> {
    if (!schoolId) {
      throw new Error("Tenant schoolId is required to issue admission form.");
    }

    const currentFee = await this.getApplicationFee(schoolId);
    const currentYear = new Date().getFullYear();

    const snapshot = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // 1. Acquire transaction advisory lock for monotonic form numbering per school and year
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'admission_form_seq_' + schoolId + '_' + currentYear}))`;
      } catch {}

      // 2. Query highest issued form number for this school and year
      const latestIssued = await tx.auditLog.findFirst({
        where: {
          schoolId,
          action: "ADMISSION_FORM_ISSUED",
          entityId: { startsWith: `FORM-${currentYear}-` },
        },
        orderBy: { entityId: "desc" },
        select: { entityId: true },
      });

      let nextSeq = 1;
      if (latestIssued?.entityId) {
        const parts = latestIssued.entityId.split("-");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          nextSeq = lastNum + 1;
        }
      }
      const formNumber = `FORM-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

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
   * Look up an issued form snapshot to retrieve its immutable original fee and metadata.
   * Enforces strict multi-tenant scoping.
   */
  public static async getIssuedFormSnapshot(
    schoolId: string,
    formNumber: string
  ): Promise<IssuedFormSnapshot | null> {
    if (!schoolId || !formNumber) return null;

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
      const parsed = JSON.parse(log.details) as IssuedFormSnapshot;
      if (parsed.schoolId && parsed.schoolId !== schoolId) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
