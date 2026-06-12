import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { startImportWorker } from "./importWorker";

const env = getEnv();

// We only start workers if REDIS_URL is provided
export function startWorkers() {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — BullMQ workers will not start");
    return;
  }

  const connection = { url: env.REDIS_URL };

  // ═══════════════════════════════════════════
  // Email Worker
  // ═══════════════════════════════════════════
  const emailWorker = new Worker(
    "emailQueue",
    async (job: Job) => {
      logger.info({ jobId: job.id, to: job.data.to }, "Processing email job");
      
      // Phase 3 implementation hook:
      // await sendgrid.send({ to: job.data.to, subject: job.data.subject, html: job.data.body })
      
      // Simulate work for now
      await new Promise(resolve => setTimeout(resolve, 500));
      logger.info({ jobId: job.id }, "Email sent successfully");
    },
    { connection, concurrency: 5 }
  );

  emailWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Email job failed");
  });

  // ═══════════════════════════════════════════
  // SMS Worker
  // ═══════════════════════════════════════════
  const smsWorker = new Worker(
    "smsQueue",
    async (job: Job) => {
      logger.info({ jobId: job.id, phone: job.data.phone }, "Processing SMS job");
      
      // Phase 3 implementation hook:
      // await twilio.messages.create({ to: job.data.phone, body: job.data.message })
      
      await new Promise(resolve => setTimeout(resolve, 200));
    },
    { connection, concurrency: 10 }
  );

  smsWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "SMS job failed");
  });

  // ═══════════════════════════════════════════
  // Report Generation Worker (Heavy Duty)
  // ═══════════════════════════════════════════
  const reportWorker = new Worker(
    "reportQueue",
    async (job: Job) => {
      logger.info({ jobId: job.id, type: job.data.type }, "Starting heavy report generation");
      
      // Create a background audit log
      await prisma.auditLog.create({
        data: {
          schoolId: job.data.schoolId,
          action: "GENERATE_REPORT",
          entity: "REPORT",
          details: `Type: ${job.data.type}`,
        }
      });

      // Simulate heavy PDF generation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      logger.info({ jobId: job.id }, "Report generation complete");
    },
    { connection, concurrency: 2 } // Keep low to avoid blocking main thread event loop heavily
  );

  reportWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Report job failed");
  });

  const importWorker = startImportWorker();

  logger.info("BullMQ Workers started");

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    logger.info("Shutting down workers...");
    await Promise.all([
      emailWorker.close(),
      smsWorker.close(),
      reportWorker.close(),
      importWorker?.close(),
    ]);
  });
}
