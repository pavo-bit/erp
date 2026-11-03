import prisma from "./prisma";
import logger from "./logger";
import crypto from "crypto";
import { runWithSchoolContext } from "../middleware/school-context.middleware";

export async function createAuditLog({ data }: { data: {
  schoolId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  reason?: string | null;
  impersonatedBy?: string | null;
  ipAddress?: string | null;
  device?: string | null;
}}) {
  try {
    if (data.schoolId) {
      return await runWithSchoolContext(data.schoolId, async () => {
        const lastLog = await prisma.auditLog.findFirst({
          where: { schoolId: data.schoolId! },
          orderBy: { id: "desc" },
          select: { hash: true }
        });

        const previousHash = lastLog?.hash || null;
        const logContent = JSON.stringify({
          schoolId: data.schoolId || null,
          userId: data.userId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          details: data.details || null,
          reason: data.reason || null,
          ipAddress: data.ipAddress || null,
          previousHash
        });

        const hash = crypto.createHash("sha256").update(logContent).digest("hex");

        return await prisma.auditLog.create({
          data: {
            ...data,
            previousHash,
            hash
          }
        });
      });
    }

    // Pre-tenant / global audit log: use SECURITY DEFINER function
    const logContent = JSON.stringify({
      schoolId: null,
      userId: data.userId || null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId || null,
      details: data.details || null,
      reason: data.reason || null,
      ipAddress: data.ipAddress || null,
      previousHash: null
    });
    const hash = crypto.createHash("sha256").update(logContent).digest("hex");

    const rows = await prisma.$queryRawUnsafe<Array<{ log_pre_tenant_audit_log: string }>>(
      `SELECT log_pre_tenant_audit_log($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) AS log_pre_tenant_audit_log`,
      data.action,
      data.entity,
      null,
      data.userId || null,
      data.entityId || null,
      data.details || null,
      data.reason || null,
      data.ipAddress || null,
      data.device || null,
      data.impersonatedBy || null,
      null,
      hash
    );

    return {
      id: rows[0]?.log_pre_tenant_audit_log,
      ...data,
      previousHash: null,
      hash,
    };
  } catch (error: any) {
    const sqlState = error?.code || error?.meta?.code || "UNKNOWN";
    logger.error({ err: error, sqlState, action: data.action }, "Failed to create AuditLog with hash chain");
    return null;
  }
}

export async function verifyAuditChain(schoolId?: string): Promise<{ valid: boolean; brokenAtId?: string }> {
  const runner = async () => {
    const logs = await prisma.auditLog.findMany({
      where: schoolId ? { schoolId } : undefined,
      orderBy: { id: "asc" }
    });

    let expectedPreviousHash: string | null = null;

    for (const log of logs) {
      if (log.previousHash !== expectedPreviousHash) {
        return { valid: false, brokenAtId: log.id };
      }

      const logContent: string = JSON.stringify({
        schoolId: log.schoolId || null,
        userId: log.userId || null,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId || null,
        details: log.details || null,
        reason: log.reason || null,
        ipAddress: log.ipAddress || null,
        previousHash: log.previousHash
      });

      const calculatedHash: string = crypto.createHash("sha256").update(logContent).digest("hex");

      if (calculatedHash !== log.hash) {
        return { valid: false, brokenAtId: log.id };
      }

      expectedPreviousHash = log.hash;
    }

    return { valid: true };
  };

  if (schoolId) {
    return runWithSchoolContext(schoolId, runner);
  }
  return runner();
}

export async function logSecurityEvent(data: {
  userId?: string;
  schoolId?: string;
  eventType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ipAddress?: string;
  metadata?: any;
}) {
  try {
    const level = data.severity === "CRITICAL" ? "FATAL" : data.severity === "HIGH" ? "ERROR" : data.severity === "MEDIUM" ? "WARN" : "INFO";

    let log: any;
    if (data.schoolId) {
      log = await runWithSchoolContext(data.schoolId, async () => {
        return await prisma.systemLog.create({
          data: {
            level,
            module: "SECURITY",
            message: data.eventType,
            metadata: JSON.stringify({ ip: data.ipAddress, ...data.metadata }),
            schoolId: data.schoolId,
            userId: data.userId && data.userId !== "SYSTEM" ? data.userId : undefined
          },
        });
      });
    } else {
      const rows = await prisma.$queryRawUnsafe<Array<{ log_pre_tenant_system_log: string }>>(
        `SELECT log_pre_tenant_system_log($1, $2, $3, $4, $5, $6) AS log_pre_tenant_system_log`,
        level,
        "SECURITY",
        data.eventType,
        JSON.stringify({ ip: data.ipAddress, ...data.metadata }),
        null,
        data.userId && data.userId !== "SYSTEM" ? data.userId : null
      );
      log = {
        id: rows[0]?.log_pre_tenant_system_log,
        level,
        module: "SECURITY",
        message: data.eventType,
        metadata: JSON.stringify({ ip: data.ipAddress, ...data.metadata }),
        schoolId: null,
        userId: data.userId && data.userId !== "SYSTEM" ? data.userId : null,
      };
    }

    if (data.severity === "CRITICAL") {
      logger.fatal({ eventType: data.eventType, metadata: data.metadata, userId: data.userId }, "CRITICAL SECURITY EVENT DETECTED - Dispatched Alert");
    }

    return log;
  } catch (error: any) {
    const sqlState = error?.code || error?.meta?.code || "UNKNOWN";
    logger.error({ err: error, sqlState, data }, "Failed to create SecurityAuditLog");
    return null;
  }
}
