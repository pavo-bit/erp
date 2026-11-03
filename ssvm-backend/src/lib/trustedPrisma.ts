import { PrismaClient } from "@prisma/client";

let trustedPrismaClient: PrismaClient | null = null;

export type TrustedPurpose =
  | "PAYMENTS_WEBHOOK"
  | "SUPER_ADMIN_SEARCH"
  | "STUDENT_ENROLLMENT"
  | "ADMIN_AUDIT"
  | "AUDIT_LOGGING"
  | "SECURITY_EVENT_LOGGING"
  | "AUTH_EVENT_LOGGING"
  | "SESSION_MANAGEMENT"
  | "HEALTH_CHECK"
  | "TEST";

export function getTrustedPrisma(purpose: TrustedPurpose): PrismaClient {
  const url = process.env.DATABASE_URL_TRUSTED;
  if (!url) {
    throw new Error(
      `DATABASE_URL_TRUSTED environment variable is required for trusted operations (${purpose}).`
    );
  }

  if (!trustedPrismaClient || (trustedPrismaClient as any)._activeUrl !== url) {
    trustedPrismaClient = new PrismaClient({
      datasources: { db: { url } },
    });
    (trustedPrismaClient as any)._activeUrl = url;
  }
  return trustedPrismaClient;
}

export function resetTrustedPrisma(): void {
  trustedPrismaClient = null;
}
