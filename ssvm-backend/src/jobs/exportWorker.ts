import { Worker, Job } from "bullmq";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { parse } from "json2csv";
import { storageService } from "../services/storage.service";
import { getEnv } from "../config/env";
import { enqueueNotification } from "./queue";

// Mock environment
const env = getEnv();

/**
 * Worker to process data export jobs
 */
export function startExportWorker() {
  if (!env.REDIS_URL) return;

  const connection = { url: env.REDIS_URL };

  const exportWorker = new Worker(
  "exportQueue",
  async (job: Job) => {
    const { schoolId, userId, entity, format, filters, userEmail } = job.data;
    logger.info({ jobId: job.id, entity, schoolId }, "Starting export job");

    try {
      let data: any[] = [];

      // 1. Fetch Data Based on Entity
      await job.updateProgress(10);
      if (entity === "STUDENTS") {
        data = await prisma.student.findMany({
          where: { schoolId, ...filters },
          select: {
            id: true,
            admissionNo: true,
            name: true,
            rollNo: true,
            isActive: true,
            createdAt: true
          }
        });
      } else if (entity === "TEACHERS") {
        data = await prisma.teacher.findMany({
          where: { schoolId, ...filters },
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            departmentId: true,
            designation: true,
            isActive: true
          }
        });
      } else if (entity === "USERS") {
        data = await prisma.user.findMany({
          where: { schoolId, ...filters },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        });
      } else if (entity === "INVOICES") {
        data = await prisma.invoice.findMany({
          where: { schoolId, ...filters },
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            dueDate: true,
            student: { select: { name: true, admissionNo: true } }
          }
        });
      } else if (entity === "ATTENDANCE") {
        data = await prisma.attendance.findMany({
          where: { schoolId, ...filters },
          select: {
            id: true,
            date: true,
            status: true,
            student: { select: { name: true, admissionNo: true } }
          }
        });
      } else if (entity === "AUDIT_LOGS") {
        data = await prisma.auditLog.findMany({
          where: { schoolId, ...filters },
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            details: true,
            reason: true,
            ipAddress: true,
            hash: true,
            previousHash: true,
            createdAt: true,
            user: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: "desc" }
        });
      } else {
        throw new Error(`Unsupported entity for export: ${entity}`);
      }

      await job.updateProgress(40);

      if (data.length === 0) {
        logger.warn({ jobId: job.id }, "No data found for export");
        return { status: "COMPLETED", message: "No data found" };
      }

      // 2. Generate CSV
      await job.updateProgress(60);
      let fileBuffer: Buffer;
      let contentType = "text/csv";
      let fileExtension = "csv";

      if (format === "CSV") {
        const csvString = parse(data);
        fileBuffer = Buffer.from(csvString);
      } else {
        // Fallback to JSON for now
        fileBuffer = Buffer.from(JSON.stringify(data, null, 2));
        contentType = "application/json";
        fileExtension = "json";
      }

      // 3. Upload to S3/Storage
      await job.updateProgress(80);
      const fileKey = await storageService.uploadFile(fileBuffer, contentType, `export_${Date.now()}.${fileExtension}`, `exports/${schoolId}`);
      const downloadUrl = await storageService.generateSignedUrl(fileKey, 86400); // 24 hours

      // 4. Log completion
      await prisma.systemLog.create({
        data: {
          level: "INFO",
          module: "DATA_EXPORT",
          message: "EXPORT_COMPLETED",
          metadata: JSON.stringify({ entity, format, recordCount: data.length, fileKey }),
          schoolId,
          userId
        }
      });

      // 5. Notify user via email
      if (userEmail) {
        // We'll create a dummy commLog for the notification or bypass.
        // Actually, let's just create a CommunicationLog to satisfy logId
        const commLog = await prisma.communicationLog.create({
          data: {
            schoolId,
            recipientNum: userEmail,
            channel: "EMAIL",
            type: "EXPORT_READY",
            content: `Your data export is complete.`,
            status: "QUEUED"
          }
        });

        await enqueueNotification({
          logId: commLog.id,
          channel: "EMAIL",
          to: userEmail,
          subject: `Your ${entity} export is ready`,
          content: `Your data export is complete. You can download it using the following secure link (valid for 24 hours): ${downloadUrl}`
        });
      }

      await job.updateProgress(100);
      logger.info({ jobId: job.id }, "Export job completed successfully");
      return { status: "COMPLETED", downloadUrl, recordCount: data.length };
    } catch (error: any) {
      logger.error({ jobId: job.id, err: error }, "Export job failed");
      
      // Notify failure
      if (userEmail) {
        const commLog = await prisma.communicationLog.create({
          data: {
            schoolId,
            recipientNum: userEmail,
            channel: "EMAIL",
            type: "EXPORT_FAILED",
            content: `Your data export failed.`,
            status: "QUEUED"
          }
        });

        await enqueueNotification({
          logId: commLog.id,
          channel: "EMAIL",
          to: userEmail,
          subject: `Your ${entity} export failed`,
          content: `Unfortunately, your requested data export for ${entity} encountered an error. Please contact support.`
        });
      }

      throw error;
    }
  },
  { connection }
  );

  exportWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Export worker job failed");
  });

  return exportWorker;
}
