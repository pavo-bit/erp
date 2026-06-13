import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";

const env = getEnv();

/**
 * Starts the BullMQ worker for the webhook delivery queue.
 * Dispatches webhooks using the built-in global fetch API.
 */
export function startWebhookWorker() {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — Webhook Worker will not start");
    return;
  }

  const worker = new Worker(
    "webhookQueue",
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name }, "Processing webhook job");

      if (job.name === "deliverWebhook") {
        const { url, payload, signature } = job.data;

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-SSVM-Signature": signature,
              "X-SSVM-Event": payload.event,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Webhook delivery failed with status: ${response.status}`);
          }

          logger.info({ jobId: job.id, url }, "Webhook delivered successfully");
        } catch (error: any) {
          logger.error({ jobId: job.id, error: error.message }, "Webhook delivery error");
          throw error; // Let BullMQ handle retries based on backoff config
        }
      }
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 5, // Process 5 webhooks concurrently
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Webhook job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Webhook job failed");
  });

  return worker;
}
