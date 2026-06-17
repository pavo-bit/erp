import { Queue, QueueOptions } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import crypto from "crypto";

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
export const importQueue = env.REDIS_URL ? new Queue("importQueue", defaultQueueOptions) : null;
export const webhookQueue = env.REDIS_URL ? new Queue("webhookQueue", defaultQueueOptions) : null;
export const scanQueue = env.REDIS_URL ? new Queue("scanQueue", defaultQueueOptions) : null;
export const exportQueue = env.REDIS_URL ? new Queue("exportQueue", defaultQueueOptions) : null;
export const maintenanceQueue = env.REDIS_URL ? new Queue("maintenanceQueue", defaultQueueOptions) : null;
export const reconciliationQueue = env.REDIS_URL ? new Queue("reconciliationQueue", defaultQueueOptions) : null;

// Schedule recurring maintenance jobs at startup
async function scheduleMaintenanceJobs() {
  if (!maintenanceQueue) return;

  // Cleanup expired IdempotencyRecords every 6 hours
  await maintenanceQueue.upsertJobScheduler(
    "idempotency-cleanup",
    { every: 6 * 60 * 60 * 1000 },
    { name: "cleanupExpiredIdempotencyRecords" }
  );

  // GAP A12: Weekly backup restore validation (Sunday 2 AM)
  await maintenanceQueue.upsertJobScheduler(
    "backup-restore-validation",
    { pattern: "0 2 * * 0" }, // CRON: Every Sunday at 2 AM
    { name: "validate-backup" }
  );

  // GAP A9: Daily Razorpay settlement reconciliation (9 AM)
  if (reconciliationQueue) {
    await reconciliationQueue.upsertJobScheduler(
      "daily-reconciliation",
      { pattern: "0 9 * * *" }, // CRON: Every day at 9 AM
      { name: "reconcile-settlements" }
    );
  }

  logger.info("Maintenance jobs scheduled");
}

if (env.REDIS_URL) {
  logger.info("BullMQ Queues initialized");
  scheduleMaintenanceJobs().catch(err => logger.error({ err }, "Failed to schedule maintenance jobs"));
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

export async function enqueueNotification(data: { logId: string; channel: string; to: string; content: string; subject?: string }): Promise<void> {
  if (notificationQueue) {
    await notificationQueue.add("sendNotification", data);
  } else {
    logger.warn({ data }, "Notification queue disabled");
  }
}

export async function enqueueReportGeneration(data: { type: string; schoolId: string; params: unknown }): Promise<void> {
  if (reportQueue) {
    await reportQueue.add("generateReport", data);
  } else {
    logger.warn({ data }, "Report queue disabled");
  }
}

export async function enqueueImport(data: { jobId: string; fileKey: string; schoolId: string; type: string }): Promise<void> {
  if (importQueue) {
    await importQueue.add("processImport", data);
  } else {
    logger.warn({ data }, "Import queue disabled");
  }
}

export async function enqueueWebhook(endpoint: { id: string; url: string; secret: string }, payload: any): Promise<void> {
  if (webhookQueue) {
    const bodyString = JSON.stringify(payload);
    const signature = crypto.createHmac("sha256", endpoint.secret).update(bodyString).digest("hex");
    await webhookQueue.add("deliverWebhook", {
      endpointId: endpoint.id,
      url: endpoint.url,
      payload,
      signature
    });
  } else {
    logger.warn({ endpointId: endpoint.id, url: endpoint.url }, "Webhook queue disabled");
  }
}

// System graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    emailQueue?.close(),
    smsQueue?.close(),
    reportQueue?.close(),
    notificationQueue?.close(),
    importQueue?.close(),
    webhookQueue?.close(),
    scanQueue?.close(),
    exportQueue?.close(),
    maintenanceQueue?.close(),
    reconciliationQueue?.close(),
  ]);
  logger.info("BullMQ Queues closed");
}
