import prisma, { getTrustedPrisma } from '../../lib/prisma';

import { beforeAll } from "vitest";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is required for PostgreSQL RLS tests.");
}

const testDatabaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1));
if (!/(^|[_-])test($|[_-])/i.test(testDatabaseName)) {
  throw new Error("DATABASE_URL_TEST must point to a database whose name clearly identifies it as a test database.");
}

process.env.DATABASE_URL = testDatabaseUrl;

export const rlsTestPrisma = prisma;

beforeAll(async () => {
  const [role] = await rlsTestPrisma.$queryRaw<Array<{
    roleName: string;
    isSuperuser: boolean;
    bypassRls: boolean;
  }>>`
    SELECT current_user AS "roleName",
           rolsuper AS "isSuperuser",
           rolbypassrls AS "bypassRls"
    FROM pg_roles
    WHERE rolname = current_user
  `;

  if (!role) {
    throw new Error("Could not resolve the PostgreSQL role used by the RLS test connection.");
  }
  if (role.isSuperuser || role.bypassRls) {
    throw new Error(
      `RLS tests require a non-superuser, non-BYPASSRLS role; connected as ${role.roleName} ` +
      `(rolsuper=${role.isSuperuser}, rolbypassrls=${role.bypassRls}).`
    );
  }

  if (process.env.REQUIRE_TRUSTED_DATABASE_URL === "true") {
    const trustedUrl = process.env.TRUSTED_DATABASE_URL;
    if (!trustedUrl) {
      throw new Error("TRUSTED_DATABASE_URL is required when REQUIRE_TRUSTED_DATABASE_URL=true.");
    }
    const trustedDatabaseName = decodeURIComponent(new URL(trustedUrl).pathname.slice(1));
    if (trustedDatabaseName !== testDatabaseName) {
      throw new Error("TRUSTED_DATABASE_URL must target the same isolated test database as DATABASE_URL_TEST.");
    }

    const [trustedRole] = await getTrustedPrisma().$queryRaw<Array<{
      roleName: string;
      isSuperuser: boolean;
      bypassRls: boolean;
    }>>`
      SELECT current_user AS "roleName",
             rolsuper AS "isSuperuser",
             rolbypassrls AS "bypassRls"
      FROM pg_roles
      WHERE rolname = current_user
    `;
    if (!trustedRole || trustedRole.roleName === role.roleName || trustedRole.isSuperuser || !trustedRole.bypassRls) {
      throw new Error(
        "Trusted DB tests require a distinct NOSUPERUSER/BYPASSRLS role and the app role must remain NOBYPASSRLS."
      );
    }
  }
});
