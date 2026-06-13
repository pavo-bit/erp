import prisma from "./prisma";
import logger from "./logger";

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
