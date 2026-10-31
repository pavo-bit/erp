import { createAuditLog } from "../lib/audit";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

const BATCH_SIZE = 250;
const MAX_RETENTION_DAYS = 3650;
const ALLOWED_ENTITIES = new Set(["VisitorLog", "AuditLog"]);

export interface RetentionExecutionOptions {
  schoolId?: string;
  dryRun: boolean;
  operatorId: string;
}

export interface RetentionExecutionResult {
  policyId: string;
  schoolId: string;
  entityName: string;
  action: string;
  thresholdDate: string;
  matchedCount: number;
  deletedCount: number;
  dryRun: boolean;
  status: "PREVIEWED" | "COMPLETED" | "UNSUPPORTED" | "FAILED";
}

type Policy = {
  id: string;
  schoolId: string;
  entityName: string;
  retentionDays: number;
  action: string;
};

export class DataRetentionService {
  /**
   * Preview or execute active policies. A caller must explicitly provide the
   * operator and may scope the run to one school. Every delete is constrained
   * to one school and performed in batches of at most BATCH_SIZE rows.
   */
  static async executePolicies(options: RetentionExecutionOptions): Promise<RetentionExecutionResult[]> {
    if (!options.operatorId) throw new Error("Retention execution requires an operator identity");
    if (options.schoolId !== undefined && !options.schoolId.trim()) throw new Error("Invalid school scope");

    const policies = await prisma.dataRetentionPolicy.findMany({
      where: { isActive: true, ...(options.schoolId ? { schoolId: options.schoolId } : {}) },
      orderBy: [{ schoolId: "asc" }, { id: "asc" }],
    });

    const results: RetentionExecutionResult[] = [];
    for (const policy of policies) {
      results.push(await this.processPolicy(policy, options));
    }
    return results;
  }

  private static async processPolicy(policy: Policy, options: RetentionExecutionOptions): Promise<RetentionExecutionResult> {
    const threshold = new Date();
    threshold.setUTCDate(threshold.getUTCDate() - policy.retentionDays);
    const result: RetentionExecutionResult = {
      policyId: policy.id,
      schoolId: policy.schoolId,
      entityName: policy.entityName,
      action: policy.action,
      thresholdDate: threshold.toISOString(),
      matchedCount: 0,
      deletedCount: 0,
      dryRun: options.dryRun,
      status: "PREVIEWED",
    };

    if (!ALLOWED_ENTITIES.has(policy.entityName) || !Number.isInteger(policy.retentionDays) || policy.retentionDays < 1 || policy.retentionDays > MAX_RETENTION_DAYS) {
      result.status = "FAILED";
      await this.audit(options, result, "Retention policy validation failed");
      return result;
    }

    if (policy.action === "ARCHIVE") {
      result.status = "UNSUPPORTED";
      await this.audit(options, result, "Archive storage is not configured; no records were modified");
      return result;
    }
    if (policy.action !== "PURGE") {
      result.status = "FAILED";
      await this.audit(options, result, "Unsupported retention action");
      return result;
    }

    const where = this.entityWhere(policy, threshold);
    try {
      const initialCount = policy.entityName === "VisitorLog"
        ? await prisma.visitorLog.count({ where })
        : await prisma.auditLog.count({ where });
      result.matchedCount = initialCount;

      if (options.dryRun) {
        await this.audit(options, result, "Dry-run preview; no records were modified");
        return result;
      }

      let remaining = initialCount;
      while (remaining > 0) {
        const records = policy.entityName === "VisitorLog"
          ? await prisma.visitorLog.findMany({ where, select: { id: true }, take: BATCH_SIZE, orderBy: { id: "asc" } })
          : await prisma.auditLog.findMany({ where, select: { id: true }, take: BATCH_SIZE, orderBy: { id: "asc" } });
        if (records.length === 0) break;
        const ids = records.map(record => record.id);
        const deleted = policy.entityName === "VisitorLog"
          ? await prisma.visitorLog.deleteMany({ where: { schoolId: policy.schoolId, id: { in: ids } } })
          : await prisma.auditLog.deleteMany({ where: { schoolId: policy.schoolId, id: { in: ids }, createdAt: { lt: threshold } } });
        if (deleted.count === 0) break;
        result.deletedCount += deleted.count;
        remaining -= deleted.count;
      }
      result.status = "COMPLETED";
      await this.audit(options, result, "Retention purge completed");
      return result;
    } catch (error) {
      result.status = "FAILED";
      logger.error({ err: error, policyId: policy.id, schoolId: policy.schoolId }, "Retention policy execution failed");
      await this.audit(options, result, "Retention purge failed or was interrupted");
      return result;
    }
  }

  private static entityWhere(policy: Policy, threshold: Date) {
    if (policy.entityName === "VisitorLog") return { schoolId: policy.schoolId, checkIn: { lt: threshold } };
    return { schoolId: policy.schoolId, createdAt: { lt: threshold } };
  }

  private static async audit(options: RetentionExecutionOptions, result: RetentionExecutionResult, reason: string) {
    await createAuditLog({
      data: {
        schoolId: result.schoolId,
        userId: options.operatorId,
        action: result.dryRun ? "DATA_RETENTION_PREVIEW" : "DATA_RETENTION_EXECUTION",
        entity: result.entityName,
        entityId: result.policyId,
        reason,
        details: JSON.stringify({
          status: result.status,
          action: result.action,
          thresholdDate: result.thresholdDate,
          matchedCount: result.matchedCount,
          deletedCount: result.deletedCount,
          batchSize: BATCH_SIZE,
        }),
      },
    });
  }
}
