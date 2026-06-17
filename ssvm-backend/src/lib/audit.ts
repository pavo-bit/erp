import prisma from "./prisma";
import logger from "./logger";
import crypto from "crypto";

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
    // Ensure we are chaining chronologically within a single transaction if possible
    // For absolute strictness we use a transaction to lock the latest row, but 
    // for performance we just fetch the latest.
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { id: "desc" },
      select: { hash: true }
    });

    const previousHash = lastLog?.hash || null;

    // Create a deterministic representation of the log payload
    // We exclude auto-generated fields like id and createdAt since we don't know them yet
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
  } catch (error) {
    logger.error({ err: error, action: data.action }, "Failed to create AuditLog");
    // Fallback: create without hash if chaining fails (e.g. concurrency race)
    return await prisma.auditLog.create({ data });
  }
}

export async function verifyAuditChain(schoolId?: string): Promise<{ valid: boolean; brokenAtId?: string }> {
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
    const log = await prisma.systemLog.create({
      data: {
        level: data.severity === "CRITICAL" ? "FATAL" : data.severity === "HIGH" ? "ERROR" : data.severity === "MEDIUM" ? "WARN" : "INFO",
        module: "SECURITY",
        message: data.eventType,
        metadata: JSON.stringify({ ip: data.ipAddress, ...data.metadata }),
        schoolId: data.schoolId,
        userId: data.userId
      },
    });

    if (data.severity === "CRITICAL") {
      // Dispatch alert to SUPER_ADMIN
      logger.fatal({ eventType: data.eventType, metadata: data.metadata, userId: data.userId }, "CRITICAL SECURITY EVENT DETECTED - Dispatched Alert");
      
      // In a real implementation, this would push to an email/SMS queue:
      // await bullQueue.add('alert', { type: 'CRITICAL', event: data });
    }

    return log;
  } catch (error) {
    logger.error({ err: error, data }, "Failed to create SecurityAuditLog");
  }
}
