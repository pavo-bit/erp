import { beforeAll } from "vitest";
import { initWorkerDatabase, getWorkerDatabaseUrl } from "./helpers/workerDatabase";

// In Vitest, each worker pool has VITEST_POOL_ID (1, 2, 3...)
const workerId = process.env.VITEST_POOL_ID || "1";
const workerUrl = getWorkerDatabaseUrl(workerId);
process.env.DATABASE_URL = workerUrl;
process.env.DATABASE_URL_TEST = workerUrl;
process.env.DIRECT_URL = workerUrl;

// Recreate the worker's private database from template before test file starts
beforeAll(async () => {
  await initWorkerDatabase(workerId);
}, 60000);
