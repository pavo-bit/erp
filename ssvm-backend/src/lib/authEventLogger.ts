import { PrismaClient, AuthEventType } from "@prisma/client";
import { Request } from "express";
import { getTrustedPrisma } from "./trustedPrisma";
import logger from "./logger";

export interface AuthEventPayload {
  userId?: string;
  schoolId?: string;
  eventType: AuthEventType;
  req: Request;
  success: boolean;
  failReason?: string;
  metadata?: any;
}

export async function logAuthEvent(_prisma: PrismaClient, event: AuthEventPayload) {
  try {
    const ipAddress = 
      (event.req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
      event.req.ip || 
      "unknown";
      
    const userAgent = event.req.headers['user-agent'] || "unknown";

    const db = getTrustedPrisma("AUTH_EVENT_LOGGING"); // TEMP: replaced by tenant wrapper in lane A
    await db.auth_events.create({
      data: {
        userId: event.userId,
        schoolId: event.schoolId,
        eventType: event.eventType,
        ipAddress,
        userAgent,
        success: event.success,
        failReason: event.failReason,
        metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
      }
    });
  } catch (error: any) {
    const sqlState = error?.code || error?.meta?.code || "UNKNOWN";
    logger.error({ err: error, sqlState, eventType: event.eventType }, "Failed to log auth event");
    // We intentionally don't throw here to avoid failing the authentication 
    // flow just because the audit log failed to write.
  }
}
