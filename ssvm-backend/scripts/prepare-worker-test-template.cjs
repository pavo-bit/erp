#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const classification = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "docs", "DATABASE", "TENANT_CLASSIFICATION.json"), "utf8"),
);
if (classification.models.length !== classification.modelCount) {
  throw new Error(`Tenant classification lists ${classification.models.length} models; expected ${classification.modelCount}.`);
}

const appUrl = new URL(process.env.DATABASE_URL_TEST ?? "");
const trustedUrl = new URL(process.env.TRUSTED_DATABASE_URL ?? "");
const adminUrl = new URL(process.env.WORKER_DATABASE_ADMIN_URL ?? "");
const sourceDatabase = decodeURIComponent(appUrl.pathname.slice(1));
const trustedDatabase = decodeURIComponent(trustedUrl.pathname.slice(1));
const adminDatabase = decodeURIComponent(adminUrl.pathname.slice(1));
const safeName = /^[a-z][a-z0-9_]{0,62}$/;
const appRole = decodeURIComponent(appUrl.username);
const trustedRole = decodeURIComponent(trustedUrl.username);
const sourceMatch = /^ssvm_test_lane_([a-g])$/.exec(sourceDatabase);
if (!sourceMatch || trustedDatabase !== sourceDatabase || adminDatabase !== sourceDatabase) {
  throw new Error("Worker template requires three explicitly configured URLs targeting the current lane test database.");
}
if (!safeName.test(appRole) || !safeName.test(trustedRole) || appRole === trustedRole) {
  throw new Error("Worker template requires distinct app and trusted role names.");
}

const templateDatabase = `ssvm_test_template_lane_${sourceMatch[1]}`;
const models = classification.models;
const quotedTables = [...new Set(models.map((model) => model.table))]
  .sort()
  .map((table) => `'${table.replaceAll("'", "''")}'`)
  .join(",\n      ");
const verifySql = `
DO $verify_fresh_backend_schema$
DECLARE
  model_table text;
  table_rls_enabled boolean;
  table_rls_forced boolean;
BEGIN
  FOREACH model_table IN ARRAY ARRAY[${quotedTables}] LOOP
    SELECT c.relrowsecurity, c.relforcerowsecurity
      INTO table_rls_enabled, table_rls_forced
      FROM pg_class c
      WHERE c.oid = to_regclass(format('%I.%I', 'public', model_table));
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Classified Prisma table public.% is missing', model_table;
    END IF;
    IF model_table IN (${classification.models
      .filter((model) => model.classification !== "global")
      .map((model) => `'${model.table.replaceAll("'", "''")}'`)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(",")}) AND (table_rls_enabled OR table_rls_forced) THEN
      RAISE EXCEPTION 'Main backend test template must not enable RLS on public.%', model_table;
    END IF;
  END LOOP;
END
$verify_fresh_backend_schema$;
`;

function psql(databaseName, sql, tupleOutput = false) {
  const args = [
    "--no-psqlrc",
    "--set=ON_ERROR_STOP=1",
    "--host", adminUrl.hostname,
    "--port", adminUrl.port || "5432",
    "--username", decodeURIComponent(adminUrl.username),
    "--dbname", databaseName,
    "--command", sql,
  ];
  if (tupleOutput) args.unshift("--tuples-only", "--no-align", "--quiet");
  return execFileSync("psql", args, {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(adminUrl.password) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

const existingTemplate = psql(
  "postgres",
  `SELECT datname FROM pg_database WHERE datname = '${templateDatabase}';`,
  true,
);
if (existingTemplate !== "") {
  throw new Error(`Refusing to reuse pre-existing backend test template ${templateDatabase}.`);
}

psql(sourceDatabase, verifySql);
psql("postgres", `CREATE DATABASE "${templateDatabase}" WITH TEMPLATE "${sourceDatabase}";`);
psql("postgres", `ALTER DATABASE "${templateDatabase}" IS_TEMPLATE true;`);
psql("postgres", `GRANT CONNECT ON DATABASE "${templateDatabase}" TO "${appRole}";`);
psql("postgres", `GRANT CONNECT ON DATABASE "${templateDatabase}" TO "${trustedRole}";`);
psql(templateDatabase, verifySql);

console.log(`Validated all ${new Set(models.map((model) => model.table)).size} model tables and created a fresh non-RLS template for lane ${sourceMatch[1]}.`);
