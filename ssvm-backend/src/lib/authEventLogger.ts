import { PrismaClient, AuthEventType } from "@prisma/client";
import { Request } from "express";

export interface AuthEventPayload {
  userId?: string;
  schoolId?: string;
  eventType: AuthEventType;
  req: Request;
  success: boolean;
  failReason?: string;
  metadata?: any;
}

export async function logAuthEvent(prisma: PrismaClient, event: AuthEventPayload) {
  try {
    const ipAddress = 
      (event.req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
      event.req.ip || 
      "unknown";
      
    const userAgent = event.req.headers['user-agent'] || "unknown";

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
  } catch (error) {
    console.error("Failed to log auth event:", error);
    // We intentionally don't throw here to avoid failing the authentication 
    // flow just because the audit log failed to write.
  }
}
