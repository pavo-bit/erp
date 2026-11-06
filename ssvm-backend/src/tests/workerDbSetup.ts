import { beforeAll } from "vitest";
import { initializeWorkerDatabase } from "./helpers/workerDatabase";

const baseAppUrl = process.env.BASE_DATABASE_URL_TEST ?? process.env.DATABASE_URL_TEST;
const baseTrustedUrl = process.env.BASE_TRUSTED_DATABASE_URL ?? process.env.TRUSTED_DATABASE_URL;

if (!baseAppUrl || !baseTrustedUrl) {
  throw new Error("Worker setup requires both the app and trusted test database URLs.");
}

process.env.BASE_DATABASE_URL_TEST = baseAppUrl;
process.env.BASE_TRUSTED_DATABASE_URL = baseTrustedUrl;

const appUrl = new URL(baseAppUrl);
const laneMatch = /^ssvm_test_lane_([a-g])$/.exec(decodeURIComponent(appUrl.pathname.slice(1)));
const workerId = process.env.VITEST_POOL_ID ?? "1";
const runKey = process.env.VITEST_RUN_KEY ?? String(process.pid);
if (!laneMatch || !/^[1-9][0-9]*$/.test(workerId)) {
  throw new Error("Worker setup requires an explicit lane test database and valid Vitest worker ID.");
}
if (!/^[1-9][0-9]{0,9}$/.test(runKey)) {
  throw new Error("Worker setup requires a valid per-process Vitest run key.");
}
process.env.VITEST_RUN_KEY = runKey;

const workerDatabase = `${decodeURIComponent(appUrl.pathname.slice(1))}_worker_${workerId}_${runKey}`;
appUrl.pathname = `/${workerDatabase}`;
process.env.DATABASE_URL = appUrl.toString();
process.env.DATABASE_URL_TEST = appUrl.toString();
const trustedUrl = new URL(baseTrustedUrl);
trustedUrl.pathname = `/${workerDatabase}`;
process.env.TRUSTED_DATABASE_URL = trustedUrl.toString();
process.env.DIRECT_URL = appUrl.toString();

beforeAll(async () => {
  await initializeWorkerDatabase();
}, 60000);
