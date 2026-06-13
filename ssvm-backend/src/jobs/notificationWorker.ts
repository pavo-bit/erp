import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { sendSSEToUser } from "../lib/sse";

const env = getEnv();

/**
 * Starts the BullMQ worker for the unified notification queue.
 */
export function startNotificationWorker() {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — Notification Worker will not start");
    return;
  }

  const worker = new Worker(
    "notificationQueue",
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name }, "Processing notification job");

      if (job.name === "sendNotification") {
        const { logId, channel, to, content, subject } = job.data;

        try {
          // 1. Fetch Log
          const commLog = await prisma.communicationLog.findUnique({ where: { id: logId }});
          if (!commLog) throw new Error(`CommunicationLog not found: ${logId}`);

          // 2. Deliver via Channel Integration (Mocked for external providers)
          if (channel === "NOTICE") {
            if (commLog.recipientId) {
              sendSSEToUser(commLog.recipientId, "SYSTEM_NOTICE", { subject, message: content });
            }
          } else if (channel === "EMAIL") {
            // e.g., await sendgrid.send({ to, subject, text: content })
            await new Promise(resolve => setTimeout(resolve, 300));
            logger.info({ to, subject }, "Simulated EMAIL delivery");
          } else if (channel === "SMS") {
            // e.g., await twilio.messages.create({ to, body: content })
            await new Promise(resolve => setTimeout(resolve, 200));
            logger.info({ to }, "Simulated SMS delivery");
          } else if (channel === "WHATSAPP") {
             // e.g., await meta.whatsapp.messages.send(...)
             await new Promise(resolve => setTimeout(resolve, 400));
             logger.info({ to }, "Simulated WhatsApp delivery");
          }

          // 3. Update Log Status
          await prisma.communicationLog.update({
            where: { id: logId },
            data: { status: "SENT", sentAt: new Date() }
          });

          logger.info({ jobId: job.id, channel }, "Notification delivered successfully");
        } catch (error: any) {
          logger.error({ jobId: job.id, error: error.message }, "Notification delivery error");
          
          await prisma.communicationLog.update({
            where: { id: logId },
            data: { status: "FAILED", errorMsg: error.message }
          });
          
          throw error;
        }
      }
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 10,
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Notification job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Notification job failed");
  });

  return worker;
}
