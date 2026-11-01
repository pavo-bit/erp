import { initWorkerDatabase } from "./helpers/workerDatabase";

// In Vitest, each worker pool has VITEST_POOL_ID (1, 2, 3...)
const workerId = process.env.VITEST_POOL_ID || "1";

// Recreate the worker's private database from template before test file starts
await initWorkerDatabase(workerId);
