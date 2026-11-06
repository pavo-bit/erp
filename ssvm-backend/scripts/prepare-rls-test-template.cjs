#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const classificationPath = path.join(repoRoot, "docs", "DATABASE", "TENANT_CLASSIFICATION.json");
const classification = JSON.parse(fs.readFileSync(classificationPath, "utf8"));
if (classification.models.length !== classification.modelCount) {
  throw new Error(`Tenant classification lists ${classification.models.length} models; expected ${classification.modelCount}.`);
}
if (classification.models.some((model) => !["direct", "indirect", "global"].includes(model.classification))) {
  throw new Error("Every Prisma model must have a direct, indirect, or global tenant classification.");
}
const tenantModels = classification.models.filter(
  (model) => model.classification !== "global" && model.migrationCoverage === "PRESENT",
);

if (tenantModels.length === 0 || tenantModels.length !== classification.tenantModelsWithMigrations) {
  throw new Error(
    `Tenant classification has ${tenantModels.length} migrated tenant models; expected ${classification.tenantModelsWithMigrations}.`,
  );
}

const directUrl = new URL(process.env.DIRECT_URL ?? "");
const appUrl = new URL(process.env.DATABASE_URL_TEST ?? "");
const trustedUrl = new URL(process.env.TRUSTED_DATABASE_URL ?? "");
const sourceDatabase = decodeURIComponent(directUrl.pathname.slice(1));
const templateDatabase = "ssvm_test_template_lane_a";
const cloneDatabase = "ssvm_rls_test_lane_a";
const safeDatabaseName = /^[a-z][a-z0-9_]{0,62}$/;
const appRole = process.env.APP_DB_ROLE ?? "";
const trustedRole = process.env.TRUSTED_DB_ROLE ?? "";

if (!safeDatabaseName.test(appRole) || !safeDatabaseName.test(trustedRole) || appRole === trustedRole) {
  throw new Error("Expected distinct, explicitly configured app and trusted PostgreSQL role names.");
}

for (const databaseName of [sourceDatabase, templateDatabase, cloneDatabase]) {
  if (!safeDatabaseName.test(databaseName)) {
    throw new Error(`Unsafe or missing PostgreSQL database name: ${databaseName || "<empty>"}.`);
  }
}
if (sourceDatabase !== "ssvm_test_lane_a") {
  throw new Error(`Expected a fresh Lane A source database; got ${sourceDatabase}.`);
}
if (decodeURIComponent(appUrl.pathname.slice(1)) !== sourceDatabase || decodeURIComponent(trustedUrl.pathname.slice(1)) !== sourceDatabase) {
  throw new Error("App, trusted, and migration URLs must initially select the same Lane A source database.");
}

const tenantTables = [...new Set(tenantModels.map((model) => model.table))].sort();
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const expectedTables = tenantTables.map(sqlString).join(",\n      ");
const validationSql = `
DO $verify_tenant_rls$
DECLARE
  tenant_table text;
  table_rls_enabled boolean;
  table_rls_forced boolean;
  policy_count integer;
  invalid_policy_count integer;
  policy_details text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[${expectedTables}] LOOP
    SELECT c.relrowsecurity, c.relforcerowsecurity
      INTO table_rls_enabled, table_rls_forced
      FROM pg_class c
      WHERE c.oid = to_regclass(format('%I.%I', 'public', tenant_table));
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Classified tenant table public.% is missing', tenant_table;
    END IF;
    IF NOT table_rls_enabled OR NOT table_rls_forced THEN
      RAISE EXCEPTION 'RLS is not enabled and forced for public.%', tenant_table;
    END IF;

    SELECT count(*)::integer,
           count(*) FILTER (
             WHERE position('current_tenant_id()' IN coalesce(qual, '')) = 0
                OR position('current_tenant_id()' IN coalesce(with_check, '')) = 0
                OR qual ~* 'current_tenant_id\\(\\)\\s+IS\\s+NULL'
                OR with_check ~* 'current_tenant_id\\(\\)\\s+IS\\s+NULL'
           )::integer,
           string_agg(format('%s: USING %s WITH CHECK %s', policyname, coalesce(qual, '<none>'), coalesce(with_check, '<none>')), '; ' ORDER BY policyname)
      INTO policy_count, invalid_policy_count, policy_details
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tenant_table;

    IF policy_count = 0 OR invalid_policy_count > 0 THEN
      RAISE EXCEPTION 'Table public.% has missing or fail-open tenant policies', tenant_table;
    END IF;
    RAISE NOTICE 'Validated RLS table public.%: enabled %, forced %, policy count %, policies %',
      tenant_table, table_rls_enabled, table_rls_forced, policy_count, policy_details;
  END LOOP;
END
$verify_tenant_rls$;
`;

function psql(databaseName, sql, tuplesOnly = false) {
  const args = [
    "--no-psqlrc",
    "--set=ON_ERROR_STOP=1",
    "--host", directUrl.hostname,
    "--port", directUrl.port || "5432",
    "--username", decodeURIComponent(directUrl.username),
    "--dbname", databaseName,
    "--command", sql,
  ];
  if (tuplesOnly) args.unshift("--tuples-only", "--no-align", "--quiet");
  return execFileSync("psql", args, {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(directUrl.password) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

const existingDatabases = psql(
  "postgres",
  `SELECT datname FROM pg_database WHERE datname IN (${sqlString(templateDatabase)}, ${sqlString(cloneDatabase)});`,
  true,
);
if (existingDatabases !== "") {
  throw new Error(`Refusing to reuse pre-existing test databases: ${existingDatabases.split(/\s+/).join(", ")}.`);
}

psql(sourceDatabase, validationSql);
psql("postgres", `CREATE DATABASE "${templateDatabase}" WITH TEMPLATE "${sourceDatabase}";`);
psql("postgres", `ALTER DATABASE "${templateDatabase}" IS_TEMPLATE true;`);
psql("postgres", `CREATE DATABASE "${cloneDatabase}" WITH TEMPLATE "${templateDatabase}";`);
psql("postgres", `GRANT CONNECT ON DATABASE "${templateDatabase}" TO "${appRole}";`);
psql("postgres", `GRANT CONNECT ON DATABASE "${templateDatabase}" TO "${trustedRole}";`);
psql("postgres", `GRANT CONNECT ON DATABASE "${cloneDatabase}" TO "${appRole}";`);
psql("postgres", `GRANT CONNECT ON DATABASE "${cloneDatabase}" TO "${trustedRole}";`);
psql(cloneDatabase, validationSql);

for (const url of [appUrl, trustedUrl]) {
  url.pathname = `/${cloneDatabase}`;
}
const githubEnv = process.env.GITHUB_ENV;
if (!githubEnv) {
  throw new Error("GITHUB_ENV is required to point the following RLS test step at the validated clone.");
}
fs.appendFileSync(
  githubEnv,
  `DATABASE_URL_TEST=${appUrl.toString()}\n` +
    `DATABASE_URL=${appUrl.toString()}\n` +
    `TRUSTED_DATABASE_URL=${trustedUrl.toString()}\n`,
  { encoding: "utf8" },
);

console.log(
  `Validated ${tenantTables.length} classified tenant tables and policies, created a fresh RLS template, and cloned ${cloneDatabase}.`,
);
