import { beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { execSync } from 'child_process';
import prisma from '../lib/prisma';
import Redis from 'ioredis-mock';

// Mock Redis globally
vi.mock('ioredis', () => ({
  default: Redis,
  Redis: Redis,
}));

// Mock BullMQ Queues globally
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bullmq')>();
  return {
    ...actual,
    Queue: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
      on: vi.fn(),
    })),
    Worker: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: vi.fn(),
    })),
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

// Use test database URL
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/ssvm_test?schema=public';

// Mock required environment variables
process.env.ACCESS_TOKEN_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----';
process.env.ACCESS_TOKEN_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----';
process.env.REFRESH_TOKEN_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----';
process.env.REFRESH_TOKEN_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----';
process.env.FIELD_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

beforeAll(async () => {
  try {
    console.log('Running Prisma migrations for test DB...');
    // We try to deploy migrations to the test DB
    // execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    // Note: Skipped in this setup file due to environment differences. 
    // Usually best to run `dotenv -e .env.test -- npx prisma migrate deploy` in a global setup script.
  } catch (e) {
    console.error('Migration failed in setup:', e);
  }
});

beforeEach(async () => {
  // Truncate all tables for a clean slate
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations');`;

  const tables = tablenames
    .map(({ tablename }) => '"' + tablename + '"')
    .join(', ');

  try {
    if (tables !== '') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  } catch (error) {
    console.log({ error });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
