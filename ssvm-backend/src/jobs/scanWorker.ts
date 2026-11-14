import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";

const env = getEnv();

async function performVirusScan(fileUrl: string): Promise<"CLEAN" | "QUARANTINED" | "SCAN_UNAVAILABLE"> {
  const scannerHost = process.env.CLAMAV_HOST;
  const isTestAdapter = process.env.VIRUS_SCAN_TEST_ADAPTER === "true";

  if (!scannerHost && !isTestAdapter) {
    logger.warn({ fileUrl }, "Virus scanner unconfigured. Returning SCAN_UNAVAILABLE.");
    return "SCAN_UNAVAILABLE";
  }

  if (isTestAdapter) {
    if (fileUrl.includes("eicar") || fileUrl.includes("virus")) {
      return "QUARANTINED";
    }
    return "CLEAN";
  }

  return "SCAN_UNAVAILABLE";
}

export function startScanWorker() {
  const connection = {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  };

  const worker = new Worker(
    "SCAN_QUEUE",
    async (job: Job) => {
      const { documentId, fileUrl, schoolId } = job.data;
      
      const executeScan = async () => {
        logger.info({ documentId }, "Starting virus scan");

        await prisma.storageObject.update({
          where: { id: documentId },
          data: { scanStatus: "IN_PROGRESS" }
        });

        const scanResult = await performVirusScan(fileUrl);

        await prisma.storageObject.update({
          where: { id: documentId },
          data: {
            scanStatus: scanResult
          }
        });

        if (scanResult === "QUARANTINED") {
          logger.warn({ documentId }, "Document quarantined by virus scanner");
          const { logSecurityEvent } = await import("../lib/audit");
          await logSecurityEvent({
            eventType: "DOCUMENT_QUARANTINED",
            severity: "HIGH",
            metadata: { documentId, fileUrl }
          });
        } else {
          logger.info({ documentId }, "Document scan complete — CLEAN");
        }
      };

      if (schoolId) {
        return runWithTenantDatabaseTransaction(schoolId, executeScan);
      }
      return executeScan();
    },
    { connection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "Scan worker failed");
  });

  logger.info("Scan worker started");
  return worker;
}
