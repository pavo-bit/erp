import { PrismaClient, AuthEventType } from "@prisma/client";
import { Request } from "express";
import logger from "./logger";
import { runWithSchoolContext } from "../middleware/school-context.middleware";
import prisma from "./prisma";

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

    if (event.schoolId) {
      await runWithSchoolContext(event.schoolId, async () => {
        await prisma.auth_events.create({
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
      });
    } else {
      await prisma.$queryRawUnsafe(
        `SELECT log_pre_tenant_auth_event($1, $2, $3, $4, $5, $6, $7, $8)`,
        event.eventType,
        event.userId || null,
        null,
        ipAddress,
        userAgent,
        event.success,
        event.failReason || null,
        event.metadata ? JSON.stringify(event.metadata) : null
      );
    }
  } catch (error: any) {
    const sqlState = error?.code || error?.meta?.code || "UNKNOWN";
    logger.error({ err: error, sqlState, eventType: event.eventType }, "Failed to log auth event");
    // We intentionally don't throw here to avoid failing the authentication 
    // flow just because the audit log failed to write.
  }
}
