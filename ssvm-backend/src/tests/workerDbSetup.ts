import { beforeAll } from "vitest";
import { initWorkerDatabase, getWorkerDatabaseUrl, getWorkerFixtureDatabaseUrl, getWorkerAuthDatabaseUrl, getWorkerTrustedDatabaseUrl } from "./helpers/workerDatabase";

// In Vitest, each worker pool has VITEST_POOL_ID (1, 2, 3...)
const workerId = process.env.VITEST_POOL_ID || "1";
const workerUrl = getWorkerDatabaseUrl(workerId);
const workerFixtureUrl = getWorkerFixtureDatabaseUrl(workerId);
const workerAuthUrl = getWorkerAuthDatabaseUrl(workerId);
const workerTrustedUrl = getWorkerTrustedDatabaseUrl(workerId);
process.env.DATABASE_URL = workerUrl;
process.env.DATABASE_URL_TEST = workerUrl;
process.env.DATABASE_URL_TEST_FIXTURE = workerFixtureUrl;
process.env.DATABASE_URL_AUTH = workerAuthUrl;
process.env.DATABASE_URL_TRUSTED = workerTrustedUrl;
process.env.DIRECT_URL = workerUrl;

// Recreate the worker's private database from template before test file starts
beforeAll(async () => {
  await initWorkerDatabase(workerId);
}, 60000);
