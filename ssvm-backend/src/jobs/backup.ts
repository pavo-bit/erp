import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { storageService } from "../services/storage.service";
import { getEnv } from "../config/env";

const execPromise = util.promisify(exec);

/**
 * Perform a full PostgreSQL database dump, compress it, and upload to Cloud Storage.
 */
export async function performDatabaseBackup(): Promise<void> {
  const env = getEnv();
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    logger.error("DATABASE_URL not found for backup");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql.gz`;
  const tempPath = path.join(process.cwd(), "temp", filename);

  // Ensure temp dir exists
  if (!fs.existsSync(path.join(process.cwd(), "temp"))) {
    fs.mkdirSync(path.join(process.cwd(), "temp"), { recursive: true });
  }

  // Create a backup record
  const backupRecord = await prisma.systemBackup.create({
    data: {
      type: "DATABASE",
      status: "IN_PROGRESS",
    },
  });

  try {
    logger.info({ backupId: backupRecord.id }, "Starting database backup");

    // Execute pg_dump and pipe to gzip
    // Note: pg_dump must be installed on the system where this runs
    await execPromise(`pg_dump "${dbUrl}" | gzip > "${tempPath}"`);

    // Check file size
    const stats = fs.statSync(tempPath);
    const sizeBytes = stats.size;

    // Upload to S3/R2
    const fileBuffer = fs.readFileSync(tempPath);
    const fileKey = await storageService.uploadFile(fileBuffer, "application/gzip", filename, "backups");

    // Update DB record
    await prisma.systemBackup.update({
      where: { id: backupRecord.id },
      data: {
        status: "COMPLETED",
        sizeBytes,
        fileUrl: fileKey,
      },
    });

    logger.info({ backupId: backupRecord.id, sizeBytes, fileKey }, "Database backup completed successfully");
  } catch (error: any) {
    logger.error({ err: error, backupId: backupRecord.id }, "Database backup failed");
    await prisma.systemBackup.update({
      where: { id: backupRecord.id },
      data: {
        status: "FAILED",
        errorMsg: error.message || "Unknown error during backup",
      },
    });
  } finally {
    // Cleanup temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}
