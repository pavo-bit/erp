import { spawnSync } from "node:child_process";

const safeDatabaseName = /^[a-z][a-z0-9_]{0,62}$/;
const safeRoleName = /^[a-z][a-z0-9_]{0,62}$/;

function requiredUrl(name: string): URL {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for isolated Vitest worker databases.`);
  return new URL(value);
}

function runPsql(databaseUrl: URL, databaseName: string, sql: string): void {
  const args = [
    "--no-psqlrc",
    "--set=ON_ERROR_STOP=1",
    "--host", databaseUrl.hostname,
    "--port", databaseUrl.port || "5432",
    "--username", decodeURIComponent(databaseUrl.username),
    "--dbname", databaseName,
    "--command", sql,
  ];
  const result = spawnSync("psql", args, {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(databaseUrl.password) },
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw new Error(`Could not run psql for an isolated worker database: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`Could not provision isolated worker database (psql exit ${result.status}). ${result.stderr.trim()}`);
  }
}

export async function initializeWorkerDatabase(): Promise<void> {
  const baseAppUrl = requiredUrl("BASE_DATABASE_URL_TEST");
  const baseTrustedUrl = requiredUrl("BASE_TRUSTED_DATABASE_URL");
  const adminUrl = requiredUrl("WORKER_DATABASE_ADMIN_URL");
  const sourceDatabase = decodeURIComponent(baseAppUrl.pathname.slice(1));
  const trustedDatabase = decodeURIComponent(baseTrustedUrl.pathname.slice(1));
  const adminDatabase = decodeURIComponent(adminUrl.pathname.slice(1));
  const laneMatch = /^ssvm_test_lane_([a-g])$/.exec(sourceDatabase);
  const workerId = process.env.VITEST_POOL_ID ?? "1";
  const runKey = process.env.VITEST_RUN_KEY ?? String(process.pid);

  if (!laneMatch || trustedDatabase !== sourceDatabase || adminDatabase !== sourceDatabase) {
    throw new Error("Worker DB setup requires the lane app, trusted, and admin URLs to target the same test database.");
  }
  if (!/^[1-9][0-9]*$/.test(workerId)) throw new Error(`Invalid Vitest worker ID ${workerId}.`);
  if (!/^[1-9][0-9]{0,9}$/.test(runKey)) throw new Error(`Invalid Vitest run key ${runKey}.`);

  const appRole = decodeURIComponent(baseAppUrl.username);
  const trustedRole = decodeURIComponent(baseTrustedUrl.username);
  if (!safeRoleName.test(appRole) || !safeRoleName.test(trustedRole) || appRole === trustedRole) {
    throw new Error("Worker DB setup requires distinct restricted app and trusted fixture roles.");
  }

  const templateDatabase = `ssvm_test_template_lane_${laneMatch[1]}`;
  const workerDatabase = `${sourceDatabase}_worker_${workerId}_${runKey}`;
  if (!safeDatabaseName.test(templateDatabase) || !safeDatabaseName.test(workerDatabase)) {
    throw new Error("Generated worker database name is invalid.");
  }

  runPsql(
    adminUrl,
    "postgres",
    `DO $verify_template$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${templateDatabase}' AND datistemplate) ` +
      `THEN RAISE EXCEPTION 'Validated per-lane worker template is missing'; END IF; END $verify_template$;`,
  );
  runPsql(adminUrl, "postgres", `DROP DATABASE IF EXISTS "${workerDatabase}" WITH (FORCE);`);
  runPsql(adminUrl, "postgres", `CREATE DATABASE "${workerDatabase}" WITH TEMPLATE "${templateDatabase}";`);
  runPsql(adminUrl, "postgres", `GRANT CONNECT ON DATABASE "${workerDatabase}" TO "${appRole}";`);
  runPsql(adminUrl, "postgres", `GRANT CONNECT ON DATABASE "${workerDatabase}" TO "${trustedRole}";`);

  const workerAppUrl = new URL(baseAppUrl);
  const workerTrustedUrl = new URL(baseTrustedUrl);
  workerAppUrl.pathname = `/${workerDatabase}`;
  workerTrustedUrl.pathname = `/${workerDatabase}`;
  process.env.DATABASE_URL = workerAppUrl.toString();
  process.env.DATABASE_URL_TEST = workerAppUrl.toString();
  process.env.TRUSTED_DATABASE_URL = workerTrustedUrl.toString();
  process.env.DIRECT_URL = workerAppUrl.toString();
}
