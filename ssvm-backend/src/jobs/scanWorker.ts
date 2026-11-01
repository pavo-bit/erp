import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import prisma from "../lib/prisma";
import { runWithTenantDatabaseTransaction, runWithTrustedDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";

const env = getEnv();

// In a real app, this would use ClamAV or an external API
// We simulate the scan here
async function simulateVirusScan(fileUrl: string): Promise<"CLEAN" | "QUARANTINED"> {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 5% chance of being quarantined for simulation purposes
  if (Math.random() < 0.05) {
    return "QUARANTINED";
  }
  return "CLEAN";
}

export function startScanWorker() {
  const connection = {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  };

  const worker = new Worker(
    "SCAN_QUEUE",
    async (job: Job) => {
      const { documentId, fileUrl } = job.data;
      
      logger.info({ documentId }, "Starting virus scan");

      const storageObject = await runWithTrustedDatabaseTransaction({
        purpose: "worker",
        requestId: job.id,
        route: "worker:scan-document:tenant-discovery",
      }, () => prisma.storageObject.findUnique({
        where: { id: documentId },
        select: { schoolId: true },
      }));
      if (!storageObject?.schoolId) {
        throw new Error("Document scan requires a document assigned to a school.");
      }

      await runWithTenantDatabaseTransaction(storageObject.schoolId, () => prisma.storageObject.update({
        where: { id: documentId },
        data: { scanStatus: "IN_PROGRESS" }
      }));

      const scanResult = await simulateVirusScan(fileUrl);

      await runWithTenantDatabaseTransaction(storageObject.schoolId, () => prisma.storageObject.update({
        where: { id: documentId },
        data: {
          scanStatus: scanResult
        }
      }));

      if (scanResult === "QUARANTINED") {
        logger.warn({ documentId }, "Document quarantined by virus scanner");
        const { logSecurityEvent } = await import("../lib/audit");
        await runWithTrustedDatabaseTransaction({
          purpose: "worker",
          requestId: job.id,
          route: "worker:scan-document:security-audit",
        }, () => logSecurityEvent({
          eventType: "DOCUMENT_QUARANTINED",
          severity: "HIGH",
          metadata: { documentId, fileUrl }
        }));
      } else {
        logger.info({ documentId }, "Document scan complete — CLEAN");
      }
    },
    { connection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "Scan worker failed");
  });

  logger.info("Scan worker started");
  return worker;
}
