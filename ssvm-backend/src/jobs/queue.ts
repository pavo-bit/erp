import { Queue, QueueOptions } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";

const env = getEnv();

// Shared connection configuration for all queues
const connectionOptions = {
  url: env.REDIS_URL,
};

// Queue options with default settings
const defaultQueueOptions: QueueOptions = {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // 1s, 2s, 4s...
    },
    removeOnComplete: true, // Keep Redis clean
    removeOnFail: 100, // Keep last 100 failed jobs for inspection
  },
};

// ═══════════════════════════════════════════
// Core Queues
// ═══════════════════════════════════════════

export const emailQueue = env.REDIS_URL ? new Queue("emailQueue", defaultQueueOptions) : null;
export const smsQueue = env.REDIS_URL ? new Queue("smsQueue", defaultQueueOptions) : null;
export const reportQueue = env.REDIS_URL ? new Queue("reportQueue", defaultQueueOptions) : null;
export const notificationQueue = env.REDIS_URL ? new Queue("notificationQueue", defaultQueueOptions) : null;

if (env.REDIS_URL) {
  logger.info("BullMQ Queues initialized");
} else {
  logger.warn("REDIS_URL not set — background jobs will run synchronously or fail");
}

// ═══════════════════════════════════════════
// Queue Helpers
// ═══════════════════════════════════════════

export async function enqueueEmail(data: { to: string; subject: string; body: string }): Promise<void> {
  if (emailQueue) {
    await emailQueue.add("sendEmail", data);
  } else {
    logger.warn({ data }, "Email queue disabled — mock sending synchronously");
    // Synchronous mock fallback
  }
}

export async function enqueueSMS(data: { phone: string; message: string }): Promise<void> {
  if (smsQueue) {
    await smsQueue.add("sendSMS", data);
  } else {
    logger.warn({ data }, "SMS queue disabled — mock sending synchronously");
  }
}

export async function enqueueReportGeneration(data: { type: string; schoolId: string; params: unknown }): Promise<void> {
  if (reportQueue) {
    await reportQueue.add("generateReport", data);
  } else {
    logger.warn({ data }, "Report queue disabled");
  }
}

// System graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    emailQueue?.close(),
    smsQueue?.close(),
    reportQueue?.close(),
    notificationQueue?.close()
  ]);
  logger.info("BullMQ Queues closed");
}
