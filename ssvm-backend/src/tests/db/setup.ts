import prisma from '../../lib/prisma';

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

  const { TENANT_RLS_TABLES } = await import('../../generated/tenantClassification');
  const tableStates = await rlsTestPrisma.$queryRaw<Array<{
    tableName: string;
    rlsEnabled: boolean;
    rlsForced: boolean;
  }>>`
    SELECT c.relname AS "tableName",
           c.relrowsecurity AS "rlsEnabled",
           c.relforcerowsecurity AS "rlsForced"
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY(${[...TENANT_RLS_TABLES]})
  `;

  const stateMap = new Map(tableStates.map((t) => [t.tableName, t]));
  const missingOrBroken: string[] = [];

  for (const table of TENANT_RLS_TABLES) {
    const st = stateMap.get(table);
    if (!st || !st.rlsEnabled || !st.rlsForced) {
      missingOrBroken.push(`${table} (present=${Boolean(st)}, rlsEnabled=${st?.rlsEnabled}, rlsForced=${st?.rlsForced})`);
    }
  }

  if (missingOrBroken.length > 0) {
    throw new Error(
      `ABORT: ${missingOrBroken.length} classified tenant tables failed RLS guard (both relrowsecurity and relforcerowsecurity must be true):\n  ${missingOrBroken.join("\n  ")}`
    );
  }
});

