import { PrismaClient } from "@prisma/client";

let authPrismaClient: PrismaClient | null = null;

export function getAuthPrisma(): PrismaClient {
  const url =
    process.env.DATABASE_URL_AUTH ||
    process.env.DATABASE_URL_TEST_FIXTURE ||
    process.env.DATABASE_URL_TEST ||
    process.env.DATABASE_URL;

  if (!authPrismaClient || (authPrismaClient as any)._activeUrl !== url) {
    authPrismaClient = new PrismaClient({
      datasources: { db: { url } },
    });
    (authPrismaClient as any)._activeUrl = url;
  }
  return authPrismaClient;
}
