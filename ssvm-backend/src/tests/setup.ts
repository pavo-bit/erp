import { beforeAll, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/prisma';
import { initRedis } from '../lib/redis';
import { TENANT_RLS_TABLES } from '../generated/tenantClassification';
import Redis from 'ioredis-mock';

// Mock Redis globally
vi.mock('ioredis', () => ({
  default: Redis,
  Redis: Redis,
}));

// Mock rate limit redis store
vi.mock('rate-limit-redis', () => ({
  default: class RedisStore {
    init() {}
    increment() { return { totalHits: 1, resetTime: new Date() }; }
    decrement() {}
    resetKey() {}
  }
}));

// Mock BullMQ Queues globally
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bullmq')>();
  return {
    ...actual,
    Queue: class {
      name: string;
      opts: any;
      client: any;
      constructor(name: string) { 
        this.name = name; 
        this.opts = { connection: {} };
        this.client = { status: 'ready' };
      }
      add = vi.fn().mockResolvedValue({ id: 'mock-job-id' });
      on = vi.fn();
      upsertJobScheduler = vi.fn();
    },
    Worker: class {
      on = vi.fn();
      close = vi.fn();
    },
  };
});

// Mock Razorpay
vi.mock('razorpay', () => {
  return {
    default: class RazorpayMock {
      orders = {
        create: vi.fn().mockResolvedValue({ id: 'order_mock123', amount: 1000, status: 'created' }),
      };
      payments = {
        fetch: vi.fn().mockResolvedValue({ id: 'pay_mock123', status: 'captured' }),
      };
      static utils = {
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      };
    }
  };
});

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
  Handlers: {
    requestHandler: () => (req: any, res: any, next: any) => next(),
    errorHandler: () => (err: any, req: any, res: any, next: any) => next(err),
  }
}));

// Mock Bull Board to avoid adapter errors with mocked Queues
vi.mock('@bull-board/api', () => ({
  createBullBoard: vi.fn().mockReturnValue({
    getRouter: vi.fn(),
    setQueues: vi.fn(),
    replaceQueues: vi.fn(),
    addQueue: vi.fn(),
    removeQueue: vi.fn()
  })
}));
vi.mock('@bull-board/express', () => ({
  ExpressAdapter: class ExpressAdapterMock {
    constructor() {}
    setBasePath() {}
    getRouter() { return require('express').Router(); }
  }
}));
vi.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: class BullMQAdapterMock {
    constructor() {}
    setFormatter() {}
    clean() {}
    getQueue() { return { name: 'mock' }; }
  }
}));

// Destructive test fixtures may only run against an explicitly configured test DB.
// Never silently truncate a developer, shared, or production database.
const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL_TEST must be explicitly set to an isolated test database before running tests.');
}
const testDatabaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1));
if (!/(^|[_-])test($|[_-])/i.test(testDatabaseName)) {
  throw new Error('DATABASE_URL_TEST database name must clearly identify an isolated test database.');
}
process.env.DATABASE_URL = testDatabaseUrl;

// Generate real RSA keys for testing so jsonwebtoken doesn't complain about invalid format
import crypto from 'crypto';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

process.env.ACCESS_TOKEN_PRIVATE_KEY = privateKey;
process.env.ACCESS_TOKEN_PUBLIC_KEY = publicKey;
process.env.REFRESH_TOKEN_PRIVATE_KEY = privateKey;
process.env.REFRESH_TOKEN_PUBLIC_KEY = publicKey;
process.env.FIELD_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.RAZORPAY_KEY_ID = 'rzp_test_codex';
process.env.RAZORPAY_KEY_SECRET = crypto.randomBytes(32).toString('hex');
process.env.RAZORPAY_WEBHOOK_SECRET = crypto.randomBytes(32).toString('hex');

beforeAll(async () => {
  const [role] = await prisma.$queryRaw<Array<{
    currentUser: string;
    isSuperuser: boolean;
    bypassRls: boolean;
  }>>`
    SELECT current_user AS "currentUser",
           rolsuper AS "isSuperuser",
           rolbypassrls AS "bypassRls"
    FROM pg_roles
    WHERE rolname = current_user
  `;

  if (!role) {
    throw new Error("ABORT: Could not resolve the current PostgreSQL role for tests.");
  }

  if (role.isSuperuser || role.bypassRls) {
    throw new Error(
      `ABORT: Tests must run as a restricted role (non-superuser, non-bypassrls). Connected as ${role.currentUser} (rolsuper=${role.isSuperuser}, rolbypassrls=${role.bypassRls}).`
    );
  }

  const classifiedTables = [...TENANT_RLS_TABLES];

  const tableStates = await prisma.$queryRaw<Array<{
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
      AND c.relname = ANY(${classifiedTables})
  `;

  const stateMap = new Map(tableStates.map((t) => [t.tableName, t]));
  const missingOrBroken: string[] = [];

  for (const table of classifiedTables) {
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

  await initRedis();
});


beforeEach(async () => {
  // Global TRUNCATE has been replaced by per-worker databases cloned from a template
  // (see src/tests/workerDbSetup.ts and src/tests/helpers/workerDatabase.ts).
  // This preserves suite beforeAll fixtures while maintaining worker isolation.
});

afterAll(async () => {
  await prisma.$disconnect();
});
