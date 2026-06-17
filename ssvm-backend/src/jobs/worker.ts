import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { startImportWorker } from "./bulkImportWorker";
import { startWebhookWorker } from "./webhookWorker";
import { startNotificationWorker } from "./notificationWorker";
import { startScanWorker } from "./scanWorker";
import { startExportWorker } from "./exportWorker";
import { startMaintenanceWorker } from "./maintenanceWorker";
import { startSoftDeleteCleanupWorker } from "./softDeleteWorker";
import { generatePDF, defaultReceiptTemplate, defaultReportCardTemplate } from "../routes/reports";
import { storageService } from "../services/storage.service";
import { sendSSEToUser } from "../lib/sse";

const env = getEnv();

// We only start workers if REDIS_URL is provided
export function startWorkers() {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — BullMQ workers will not start");
    return;
  }

  const connection = { url: env.REDIS_URL };

  startImportWorker();
  startWebhookWorker();
  startNotificationWorker();
  startScanWorker();
  startExportWorker();
  startMaintenanceWorker();
  startSoftDeleteCleanupWorker();

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
  // PDF Generation Worker (Heavy Duty + Storage)
  // ═══════════════════════════════════════════
  const pdfWorker = new Worker(
    "PDF_QUEUE",
    async (job: Job) => {
      const { type, invoiceId, studentId, userId, schoolId } = job.data;
      logger.info({ jobId: job.id, type }, "Starting async PDF generation");
      
      let pdfBuffer: Buffer;
      let fileName: string;
      
      if (type === "receipt") {
        const data = {
          schoolName: "SSVM College Square",
          receiptNo: invoiceId || "REC-26-001",
          date: new Date().toLocaleDateString(),
          status: "PAID",
          studentName: "Aarav Sharma",
          admissionNo: "ADM-1024",
          className: "Class X-A",
          items: [
            { name: "Tuition Fee (Q3)", amount: 3000 },
            { name: "Transport Fee", amount: 1000 },
            { name: "Lab Fee", amount: 500 }
          ],
          totalAmount: 4500
        };
        pdfBuffer = await generatePDF(defaultReceiptTemplate, data);
        fileName = `Receipt-${data.receiptNo}.pdf`;
      } else if (type === "report_card" || !type) {
        const data = {
          schoolName: "SSVM College Square",
          schoolAddress: "123 Education Hub, Knowledge City",
          examName: "Term 1 Final Examination",
          academicSession: "2026-2027",
          studentName: "Aarav Sharma",
          className: "Class X-A",
          rollNo: "12",
          attendance: "94.5%",
          subjects: [
            { name: "Mathematics", maxMarks: 100, marksObtained: 95, grade: "A+" },
            { name: "Science", maxMarks: 100, marksObtained: 88, grade: "A+" }
          ],
          totalMarks: 462,
          maxTotal: 500,
          percentage: "92.4",
          finalGrade: "A+",
          remarks: "Outstanding!"
        };
        pdfBuffer = await generatePDF(defaultReportCardTemplate, data);
        fileName = `ReportCard-${data.studentName.replace(/\s+/g, '_')}.pdf`;
      } else if (type === "certificate") {
        const { qrHash, studentId, certificateId } = job.data;
        const data = {
          schoolName: "SSVM College Square",
          title: "Certificate of Excellence",
          studentName: "Aarav Sharma", // Should fetch from DB in real implementation
          body: "This is to certify that Aarav Sharma has successfully completed the required coursework.",
          qrCodeContent: `${env.FRONTEND_URL || "http://localhost:3000"}/verify/${qrHash}`,
          certificateNo: qrHash.substring(0, 8).toUpperCase(),
          date: new Date().toLocaleDateString()
        };
        // using defaultReceiptTemplate as placeholder since certificate template doesn't exist in reports.ts
        pdfBuffer = await generatePDF(defaultReceiptTemplate, data);
        fileName = `Certificate-${data.certificateNo}.pdf`;
      } else {
        throw new Error(`Unknown PDF type: ${type}`);
      }

      // Upload to Storage
      const fileKey = await storageService.uploadFile(pdfBuffer, "application/pdf", fileName, "reports");
      const url = await storageService.generateSignedUrl(fileKey);
      
      // SSE Success Notification
      try {
        sendSSEToUser(userId, "PDF_READY", { url, fileName, jobId: job.id });
        logger.info({ jobId: job.id, fileKey }, "PDF generated and SSE sent");
      } catch (err) {
        // Fallback to Unread Notification if SSE fails
        logger.warn({ err, userId }, "SSE delivery failed, falling back to Notification table");
        await prisma.notification.create({
          data: {
            schoolId,
            type: "EMAIL",
            subject: "Your PDF is Ready",
            message: `Your requested document (${fileName}) is ready. Link: ${url}`,
            status: "QUEUED"
          }
        });
      }
    },
    { connection, concurrency: 2 } // Keep low to avoid blocking main thread event loop heavily
  );

  pdfWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "PDF worker job failed");
  });

  const importWorker = startImportWorker();
  const webhookWorker = startWebhookWorker();
  const notificationWorker = startNotificationWorker();
  const exportWorker = startExportWorker();
  const maintenanceWorker = startMaintenanceWorker();
  const softDeleteWorker = startSoftDeleteCleanupWorker();

  logger.info("BullMQ Workers started");

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    logger.info("Shutting down workers...");
    await Promise.all([
      emailWorker.close(),
      smsWorker.close(),
      pdfWorker.close(),
      importWorker?.close(),
      webhookWorker?.close(),
      notificationWorker?.close(),
      exportWorker?.close(),
      maintenanceWorker?.close(),
      softDeleteWorker?.close(),
    ]);
  });
}
