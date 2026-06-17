import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import { enqueueNotification } from "./queue";

const execAsync = promisify(exec);
const prisma = new PrismaClient();
const env = getEnv();

// ═══════════════════════════════════════════
// Maintenance Worker (GAP 1 — Idempotency Cleanup)
// ═══════════════════════════════════════════
// Handles scheduled cleanup of expired idempotency records
// from both the DB (IdempotencyRecord table) and Redis.

export function startMaintenanceWorker(): Worker | undefined {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — Maintenance worker will not start");
    return undefined;
  }

  const connection = { url: env.REDIS_URL };

  const worker = new Worker(
    "maintenanceQueue",
    async (job: Job) => {
      switch (job.name) {
        case "cleanupExpiredIdempotencyRecords":
          await cleanupExpiredIdempotencyRecords();
          await cleanupOldBackups();
          break;

        case "validate-backup":
          await validateBackupRestore();
          break;

        default:
          logger.warn({ jobName: job.name }, "Unknown maintenance job type");
      }
    },
    {
      connection,
      concurrency: 1, // Maintenance jobs should run one at a time
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, "Maintenance job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, "Maintenance job failed");
  });

  logger.info("Maintenance worker started");
  return worker;
}

/**
 * Cleanup expired IdempotencyRecord entries from the database.
 *
 * Runs in batches to avoid locking large swaths of the table.
 * Also cleans up corresponding Redis keys if they exist.
 */
async function cleanupExpiredIdempotencyRecords(): Promise<void> {
  const now = new Date();
  const BATCH_SIZE = 500;
  let totalDeleted = 0;

  logger.info("Starting IdempotencyRecord cleanup");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Find expired records in batches
    const expiredRecords = await (prisma as any).idempotencyRecord.findMany({
      where: {
        expiresAt: { lt: now },
      },
      take: BATCH_SIZE,
      select: { id: true, key: true },
    });

    if (expiredRecords.length === 0) {
      break; // No more expired records
    }

    const idsToDelete = expiredRecords.map((r: any) => r.id);

    // Delete from DB
    const deleteResult = await (prisma as any).idempotencyRecord.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    totalDeleted += deleteResult.count;

    // Also clean up Redis keys (fire-and-forget)
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        const redisKeys = expiredRecords.map((r: any) => `idempotency:system:${r.key}`);
        try {
          await redis.del(...redisKeys);
        } catch (err) {
          logger.warn({ err }, "Failed to clean Redis idempotency keys");
        }
      }
    }

    // If we got fewer than BATCH_SIZE, we're done
    if (expiredRecords.length < BATCH_SIZE) {
      break;
    }
  }

  logger.info({ totalDeleted }, "IdempotencyRecord cleanup completed");
}

/**
 * Cleanup old SystemBackup entries and their S3 objects based on retention policy (e.g., older than 30 days).
 */
async function cleanupOldBackups(): Promise<void> {
  const retentionDays = parseInt(env.BACKUP_RETENTION_DAYS || "30", 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  logger.info({ cutoffDate }, "Starting SystemBackup retention cleanup");

  const oldBackups = await prisma.systemBackup.findMany({
    where: { createdAt: { lt: cutoffDate } }
  });

  if (oldBackups.length === 0) {
    logger.info("No old backups to clean up");
    return;
  }

  const s3 = new S3Client({
    region: env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
  const S3_BUCKET = env.AWS_S3_BUCKET || "ssvm-backups";
  let deletedCount = 0;

  for (const backup of oldBackups) {
    if (backup.fileUrl) {
      const backupKey = backup.fileUrl.split("/").pop();
      if (backupKey) {
        try {
          const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
          await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: backupKey }));
          deletedCount++;
        } catch (err) {
          logger.warn({ err, backupKey }, "Failed to delete backup from S3");
        }
      }
    }
    await prisma.systemBackup.delete({ where: { id: backup.id } });
  }

  logger.info({ deletedCount }, "SystemBackup retention cleanup completed");
}

/**
 * GAP A12: Backup Restore Validation
 */
async function validateBackupRestore(): Promise<void> {
  logger.info("Starting weekly backup restore validation...");

  // 1. Fetch the most recent PASSED backup
  const latestBackup = await prisma.systemBackup.findFirst({
    where: { status: "PASSED" },
    orderBy: { createdAt: "desc" },
  });

  if (!latestBackup) {
    logger.warn("No PASSED backup found for validation.");
    return;
  }

  const backupKey = latestBackup.fileUrl?.split("/").pop();
  if (!backupKey) {
    logger.error("Latest backup does not have a valid fileUrl.");
    await markBackupValidationFailed(latestBackup.id, "Invalid S3 URL");
    return;
  }

  logger.info({ backupId: latestBackup.id, backupKey }, "Found backup for validation");

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, backupKey);

  const s3 = new S3Client({
    region: env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
  const S3_BUCKET = env.AWS_S3_BUCKET || "ssvm-backups";

  try {
    // 2. Download from S3
    logger.info("Downloading backup from S3...");
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: backupKey });
    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("Empty body returned from S3");
    }

    const writeStream = fs.createWriteStream(filePath);
    const body = response.Body as NodeJS.ReadableStream;
    await new Promise<void>((resolve, reject) => {
      body.pipe(writeStream)
        .on("error", reject)
        .on("finish", resolve);
    });

    // 3. Verify Checksum BEFORE attempting restore
    logger.info("Verifying checksum...");
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const actualChecksum = hashSum.digest('hex');

    if (latestBackup.checksum && actualChecksum !== latestBackup.checksum) {
      logger.error({ expected: latestBackup.checksum, actual: actualChecksum }, "Checksum mismatch!");
      await markBackupValidationFailed(latestBackup.id, `Checksum mismatch. Expected ${latestBackup.checksum}, got ${actualChecksum}`);
      return;
    }

    logger.info("Checksum verified. Proceeding with pg_restore...");

    // 4. Restore to staging database (ssvm_validation) using pg_restore
    const dbUrl = new URL(env.DATABASE_URL);
    dbUrl.pathname = "/ssvm_validation";
    const validationDbUrl = dbUrl.toString();

    const restoreCmd = `pg_restore --clean --if-exists --no-owner --no-acl -d "${validationDbUrl}" "${filePath}"`;

    try {
      await execAsync(restoreCmd);
      logger.info("pg_restore completed successfully.");
    } catch (restoreError: any) {
      logger.error({ err: restoreError }, "pg_restore failed");
      await markBackupValidationFailed(latestBackup.id, `Restore failed: ${restoreError.message}`);
      return;
    }

    // 5. Smoke Queries
    logger.info("Running smoke queries against validation database...");
    const psqlCmd = `psql "${validationDbUrl}" -t -c`;
    const studentsCountOutput = await execAsync(`${psqlCmd} "SELECT COUNT(*) FROM students;"`);
    const invoicesCountOutput = await execAsync(`${psqlCmd} "SELECT COUNT(*) FROM invoices;"`);
    const paymentsCountOutput = await execAsync(`${psqlCmd} "SELECT COUNT(*) FROM payment_transactions;"`);

    const validationCounts = {
      students: parseInt(studentsCountOutput.stdout.trim(), 10) || 0,
      invoices: parseInt(invoicesCountOutput.stdout.trim(), 10) || 0,
      payments: parseInt(paymentsCountOutput.stdout.trim(), 10) || 0,
    };

    const prodCounts = {
      students: await prisma.student.count(),
      invoices: await prisma.invoice.count(),
      payments: await prisma.paymentTransaction.count(),
    };

    const isWithinVariance = (prod: number, val: number) => {
      if (prod === 0 && val === 0) return true;
      if (prod === 0) return val <= 5;
      const variance = Math.abs(prod - val) / prod;
      return variance <= 0.05;
    };

    const passed =
      isWithinVariance(prodCounts.students, validationCounts.students) &&
      isWithinVariance(prodCounts.invoices, validationCounts.invoices) &&
      isWithinVariance(prodCounts.payments, validationCounts.payments);

    const validationDetails = {
      productionCounts: prodCounts,
      validationCounts: validationCounts,
      varianceAllowed: "5%",
      passed,
    };

    if (passed) {
      logger.info("Backup validation PASSED.");
      await prisma.systemBackup.update({
        where: { id: latestBackup.id },
        data: {
          lastValidatedAt: new Date(),
          validationStatus: "PASSED",
          validationDetails: JSON.stringify(validationDetails),
        },
      });
    } else {
      logger.error({ validationDetails }, "Backup validation FAILED due to variance threshold exceeded.");
      await markBackupValidationFailed(latestBackup.id, "Variance threshold exceeded", validationDetails);
    }

  } catch (error: any) {
    logger.error({ err: error }, "Unexpected error during backup validation");
    await markBackupValidationFailed(latestBackup.id, `Unexpected error: ${error.message}`);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

async function markBackupValidationFailed(backupId: string, reason: string, details?: any) {
  await prisma.systemBackup.update({
    where: { id: backupId },
    data: {
      lastValidatedAt: new Date(),
      validationStatus: "FAILED",
      validationDetails: details ? JSON.stringify({ reason, ...details }) : JSON.stringify({ reason }),
    },
  });

  const superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN", isActive: true } });
  if (superAdmin) {
    await enqueueNotification({
      logId: backupId,
      channel: "EMAIL",
      to: superAdmin.email,
      subject: "CRITICAL: Backup Validation Failed",
      content: `The automated weekly backup validation has FAILED.\nBackup ID: ${backupId}\nReason: ${reason}\nPlease investigate immediately as Disaster Recovery may be compromised.`,
    });
  }
}
