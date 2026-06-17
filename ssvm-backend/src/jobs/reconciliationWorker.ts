import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import { ReconciliationService } from "../services/reconciliation.service";
import { enqueueNotification, enqueueEmail } from "./queue";
import prisma from "../lib/prisma";

const env = getEnv();

/**
 * Reconciliation Worker
 * Runs daily at 9:00 AM (scheduled via queue.ts) to reconcile
 * Razorpay settlements from the previous day against SSVM records.
 */

async function processReconciliation(job: Job): Promise<void> {
  logger.info({ jobId: job.id }, "Starting daily Razorpay reconciliation");

  // Default: reconcile yesterday's settlements
  const to = new Date();
  to.setHours(0, 0, 0, 0); // Start of today

  const from = new Date(to);
  from.setDate(from.getDate() - 1); // Start of yesterday

  try {
    const result = await ReconciliationService.runDailyReconciliation(from, to);

    // Build summary message
    const summary = [
      `Razorpay Reconciliation Report — ${from.toISOString().split("T")[0]}`,
      `Settlements processed: ${result.processed}`,
      `Fully reconciled: ${result.fullyReconciled}`,
      `Partially reconciled: ${result.partiallyReconciled}`,
      `Failed: ${result.failed}`,
    ];

    if (result.criticalAlerts.length > 0) {
      summary.push("");
      summary.push("⚠️ CRITICAL ALERTS — Investigate same day:");
      result.criticalAlerts.forEach(alert => summary.push(`  • ${alert}`));
    }

    const summaryText = summary.join("\n");

    // Notify finance admins via notification queue
    // Find all ERP_ADMINs and ACCOUNTANTs across all schools
    const financeUsers = await prisma.user.findMany({
      where: {
        role: { in: ["ERP_ADMIN", "ACCOUNTANT", "SUPER_ADMIN"] },
        isActive: true,
      },
      select: { id: true, email: true, role: true },
    });

    for (const user of financeUsers) {
      if (user.email) {
        await enqueueEmail({
          to: user.email,
          subject: result.criticalAlerts.length > 0
            ? `⚠️ CRITICAL: Razorpay Reconciliation — ${result.criticalAlerts.length} unmatched payment(s)`
            : `✅ Razorpay Reconciliation Report — ${from.toISOString().split("T")[0]}`,
          body: summaryText,
        });
      }
    }

    // If there are critical unmatched payments, also log to SystemLog for visibility
    if (result.criticalAlerts.length > 0) {
      await prisma.systemLog.create({
        data: {
          level: "ERROR",
          module: "RECONCILIATION",
          message: `CRITICAL: ${result.criticalAlerts.length} unmatched Razorpay payment(s) found`,
          metadata: JSON.stringify({
            date: from.toISOString().split("T")[0],
            alerts: result.criticalAlerts,
          }),
        },
      });
    }

    logger.info({ result: { ...result, criticalAlerts: result.criticalAlerts.length } }, "Reconciliation job completed");
  } catch (error) {
    logger.error({ err: error }, "Reconciliation job failed");

    // Alert on failure — reconciliation itself breaking is a high-priority issue
    await prisma.systemLog.create({
      data: {
        level: "ERROR",
        module: "RECONCILIATION",
        message: "Daily reconciliation job failed entirely",
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          date: from.toISOString().split("T")[0],
        }),
      },
    });

    throw error; // BullMQ will retry per queue config
  }
}

// Initialize the worker if Redis is available
let reconciliationWorker: Worker | null = null;

if (env.REDIS_URL) {
  reconciliationWorker = new Worker(
    "reconciliationQueue",
    processReconciliation,
    {
      connection: { url: env.REDIS_URL },
      concurrency: 1, // Only one reconciliation job at a time
    }
  );

  reconciliationWorker.on("completed", (job) => {
    logger.info({ jobId: job?.id }, "Reconciliation worker: job completed");
  });

  reconciliationWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Reconciliation worker: job failed");
  });

  logger.info("Reconciliation worker initialized");
}

export { reconciliationWorker };
