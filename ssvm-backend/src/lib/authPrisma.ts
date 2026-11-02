import { PrismaClient } from "@prisma/client";

let authPrismaClient: PrismaClient | null = null;

export function getAuthPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL_AUTH;
  if (!url) {
    throw new Error(
      "DATABASE_URL_AUTH environment variable is required for auth database connection."
    );
  }

  if (!authPrismaClient || (authPrismaClient as any)._activeUrl !== url) {
    authPrismaClient = new PrismaClient({
      datasources: { db: { url } },
    });
    (authPrismaClient as any)._activeUrl = url;
  }
  return authPrismaClient;
}

export function resetAuthPrisma(): void {
  authPrismaClient = null;
}
