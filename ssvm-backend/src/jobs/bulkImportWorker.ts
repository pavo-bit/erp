import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import Papa from "papaparse";
// We don't fetch directly from S3, we assume file is local or we download it. 
// For simplicity we simulate processing or we can fetch from S3 buffer.
import { storageService } from "../services/storage.service";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const env = getEnv();

/**
 * Helper to fetch a file buffer from S3/R2 directly
 */
async function fetchFileFromStorage(key: string): Promise<string> {
  const s3 = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "dummy",
      secretAccessKey: process.env.S3_SECRET_KEY || "dummy",
    },
  });

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || "ssvm-erp-bucket",
    Key: key,
  });

  const response = await s3.send(command);
  if (!response.Body) throw new Error("Empty file from storage");

  return await response.Body.transformToString("utf-8");
}

export function startImportWorker() {
  if (!env.REDIS_URL) return null;

  const connection = { url: env.REDIS_URL };

  const importWorker = new Worker(
    "importQueue",
    async (job: Job) => {
      const { jobId, fileKey, schoolId, type } = job.data;
      logger.info({ jobId, type, schoolId }, "Starting bulk import job");

      await prisma.bulkJob.update({
        where: { id: jobId },
        data: { status: "PROCESSING", progress: 0 },
      });

      try {
        await job.updateProgress(5);
        // Fetch CSV string from storage
        const csvString = await fetchFileFromStorage(fileKey);
        await job.updateProgress(10);

        // Parse CSV
        const { data, errors } = Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
        });

        if (errors.length > 0) {
          throw new Error("Invalid CSV format");
        }

        const totalRows = data.length;
        let successRows = 0;
        let failedRows = 0;
        const errorLogs: any[] = [];

        await prisma.bulkJob.update({
          where: { id: jobId },
          data: { totalRows },
        });

        // Process rows in batches to avoid overwhelming DB/memory
        for (let i = 0; i < data.length; i++) {
          const row: any = data[i];

          try {
            if (type === "STUDENT_IMPORT") {
              if (!row.Name || !row.RollNo || !row.Class) throw new Error("Missing required fields");
              // Simulated insertion
              // await prisma.student.create(...)
            } else if (type === "TEACHER_IMPORT") {
              if (!row.Name || !row.Email || !row.Department) throw new Error("Missing required fields");
              // Simulated insertion
            } else {
              throw new Error("Unsupported import type");
            }
            successRows++;
          } catch (err: any) {
            failedRows++;
            errorLogs.push({ rowNumber: i + 1, ...row, error: err.message });
          }

          // Update progress every 10 rows
          if (i % 10 === 0 || i === data.length - 1) {
            const progress = Math.round(((i + 1) / totalRows) * 80) + 10; // Reserve 0-10 for setup, 90-100 for finishing
            await job.updateProgress(progress);
            await prisma.bulkJob.update({
              where: { id: jobId },
              data: { progress },
            });
          }
        }

        let errorFileUrl = null;
        if (failedRows > 0) {
          // Generate Error CSV and upload to storage
          const errorCsv = Papa.unparse(errorLogs);
          errorFileUrl = await storageService.uploadFile(
            Buffer.from(errorCsv),
            "text/csv",
            `errors-${jobId}.csv`,
            "imports/errors"
          );
        }

        // Complete job
        await job.updateProgress(100);
        await prisma.bulkJob.update({
          where: { id: jobId },
          data: {
            status: failedRows === totalRows ? "FAILED" : "COMPLETED",
            successRows,
            failedRows,
            errorFile: errorFileUrl,
            progress: 100,
          },
        });

        logger.info({ jobId, successRows, failedRows }, "Bulk import job completed");
      } catch (error: any) {
        logger.error({ err: error, jobId }, "Bulk import job failed catastrophically");
        await prisma.bulkJob.update({
          where: { id: jobId },
          data: { status: "FAILED", errorFile: error.message },
        });
      }
    },
    { connection, concurrency: 1 } // Process one import at a time to prevent DB lock
  );

  importWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Import worker failed");
  });

  return importWorker;
}
