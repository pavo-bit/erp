import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Load test environment
dotenv.config({ path: path.resolve(__dirname, "../../../.env.test") });

export function getBaseTestUrl(): string {
  return (
    process.env.DATABASE_URL_TEST ||
    "postgresql://postgres:postgres@localhost:5433/ssvm_test?schema=public"
  );
}

export function getWorkerDatabaseName(workerId: string): string {
  return `ssvm_test_worker_${workerId}`;
}

export function getWorkerDatabaseUrl(workerId: string): string {
  const parsed = new URL(getBaseTestUrl());
  parsed.pathname = `/${getWorkerDatabaseName(workerId)}`;
  return parsed.toString();
}

export function getMaintenanceUrl(): string {
  const adminUrl =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_ADMIN ||
    getBaseTestUrl();
  const parsed = new URL(adminUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

let templateEnsured = false;

export async function ensureTemplateDatabase(): Promise<void> {
  if (templateEnsured) return;
  const client = new PrismaClient({
    datasources: { db: { url: getMaintenanceUrl() } },
  });

  try {
    const existing = await client.$queryRaw<Array<{ datname: string }>>`
      SELECT datname FROM pg_database WHERE datname = 'ssvm_test_template';
    `;
    if (existing.length === 0) {
      await client.$executeRawUnsafe(
        "CREATE DATABASE ssvm_test_template TEMPLATE ssvm_test;"
      );
      await client.$executeRawUnsafe(
        "ALTER DATABASE ssvm_test_template is_template true;"
      );
      await client.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_app') THEN
            EXECUTE 'GRANT ALL PRIVILEGES ON DATABASE ssvm_test_template TO ssvm_app';
          END IF;
        END
        $$;
      `);
    }
    templateEnsured = true;
  } catch (err: unknown) {
    // If another worker created it concurrently or permission denied, handle gracefully
    const msg = String(err);
    if (!msg.includes("already exists") && !msg.includes("42P04")) {
      console.warn("Notice: could not create template database:", msg);
    }
    templateEnsured = true;
  } finally {
    await client.$disconnect();
  }
}

export async function initWorkerDatabase(workerId: string): Promise<string> {
  try {
    await ensureTemplateDatabase();

    const client = new PrismaClient({
      datasources: { db: { url: getMaintenanceUrl() } },
    });

    const workerDb = getWorkerDatabaseName(workerId);
    try {
      // Terminate existing connections to this worker DB and recreate from template
      await client.$executeRawUnsafe(
        `DROP DATABASE IF EXISTS ${workerDb} WITH (FORCE);`
      );
      await client.$executeRawUnsafe(
        `CREATE DATABASE ${workerDb} TEMPLATE ssvm_test_template;`
      );
      await client.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_app') THEN
            EXECUTE 'GRANT ALL PRIVILEGES ON DATABASE ${workerDb} TO ssvm_app';
          END IF;
        END
        $$;
      `);
    } finally {
      await client.$disconnect();
    }

    const workerUrl = getWorkerDatabaseUrl(workerId);
    process.env.DATABASE_URL = workerUrl;
    process.env.DATABASE_URL_TEST = workerUrl;
    process.env.DIRECT_URL = workerUrl;

    return workerUrl;
  } catch (err: unknown) {
    console.warn("Notice: worker DB initialization fallback to base URL:", String(err));
    return getBaseTestUrl();
  }
}
