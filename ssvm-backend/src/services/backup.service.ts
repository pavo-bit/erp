import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

const execAsync = util.promisify(exec);

// ═══════════════════════════════════════════
// Backup Service (GAP 6 — Enhanced)
// ═══════════════════════════════════════════
// Enhancements:
//   1. SHA-256 checksum for backup integrity verification
//   2. S3 upload (when AWS_S3_BUCKET is configured)
//   3. Restore validation (verify checksum before restore)
//   4. Backup rotation (keep last N backups)
//   5. Backup size tracking

const MAX_LOCAL_BACKUPS = 10;

export class BackupService {
  private static readonly BACKUP_DIR = path.join(process.cwd(), "backups");

  static async initialize() {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Generate SHA-256 checksum of a file.
   */
  private static async computeChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }

  /**
   * Creates a database backup with checksum and optional S3 upload.
   */
  static async createDatabaseBackup(isAutomated: boolean = false): Promise<string> {
    await this.initialize();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `ssvm_db_${timestamp}.sql.gz`;
    const filePath = path.join(this.BACKUP_DIR, fileName);
    const typeStr = isAutomated ? "DATABASE_AUTO" : "DATABASE_MANUAL";

    // Create tracking record
    const backupRecord = await prisma.systemBackup.create({
      data: {
        type: typeStr,
        status: "IN_PROGRESS",
      },
    });

    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error("DATABASE_URL is not set");

      logger.info({ fileName }, "[BackupService] Starting database backup");

      // pg_dump with custom format for parallel restore support
      const command = `pg_dump "${dbUrl}" | gzip > "${filePath}"`;
      await execAsync(command);

      const stats = fs.statSync(filePath);

      // Compute checksum for integrity verification
      const checksum = await this.computeChecksum(filePath);

      // Write checksum file alongside backup
      fs.writeFileSync(`${filePath}.sha256`, `${checksum}  ${fileName}\n`);

      let s3Url: string | null = null;

      // Upload to S3 if configured
      if (process.env.AWS_S3_BUCKET) {
        try {
          s3Url = await this.uploadToS3(filePath, fileName);
          logger.info({ s3Url }, "[BackupService] Backup uploaded to S3");
        } catch (s3Err) {
          logger.error({ err: s3Err }, "[BackupService] S3 upload failed — local backup preserved");
        }
      }

      // Update tracking record
      await prisma.systemBackup.update({
        where: { id: backupRecord.id },
        data: {
          status: "COMPLETED",
          sizeBytes: stats.size,
          fileUrl: s3Url || `/backups/${fileName}`,
          checksum,
        },
      });

      // Rotate old backups
      await this.rotateLocalBackups();

      logger.info({ fileName, sizeBytes: stats.size, checksum: checksum.substring(0, 16) }, "[BackupService] Backup completed");
      return backupRecord.id;
    } catch (error: any) {
      logger.error({ err: error }, "[BackupService] Backup failed");

      await prisma.systemBackup.update({
        where: { id: backupRecord.id },
        data: {
          status: "FAILED",
          errorMsg: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Restore a database backup with integrity validation.
   */
  static async restoreDatabaseBackup(fileName: string): Promise<void> {
    const filePath = path.join(this.BACKUP_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    // Verify checksum before restoring
    const checksumFile = `${filePath}.sha256`;
    if (fs.existsSync(checksumFile)) {
      const expectedChecksum = fs.readFileSync(checksumFile, "utf-8").split(" ")[0].trim();
      const actualChecksum = await this.computeChecksum(filePath);

      if (expectedChecksum !== actualChecksum) {
        throw new Error(`Backup integrity check failed! Expected: ${expectedChecksum}, Got: ${actualChecksum}`);
      }

      logger.info("[BackupService] Checksum verified — backup integrity confirmed");
    } else {
      logger.warn("[BackupService] No checksum file found — proceeding without verification");
    }

    logger.info({ fileName }, "[BackupService] Starting database restore");

    try {
      const command = `gunzip -c "${filePath}" | psql "${dbUrl}"`;
      await execAsync(command);
      logger.info("[BackupService] Database restored successfully");
    } catch (error: any) {
      logger.error({ err: error }, "[BackupService] Restore failed");
      throw error;
    }
  }

  /**
   * Upload backup to S3.
   */
  private static async uploadToS3(filePath: string, fileName: string): Promise<string> {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });

    const fileStream = fs.createReadStream(filePath);
    const s3Key = `backups/${new Date().toISOString().split("T")[0]}/${fileName}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      Body: fileStream,
      ContentType: "application/gzip",
      ServerSideEncryption: "AES256",
      StorageClass: "STANDARD_IA",  // Infrequently accessed — cheaper
    }));

    return `s3://${process.env.AWS_S3_BUCKET}/${s3Key}`;
  }

  /**
   * Rotate local backups: keep only the most recent N backups.
   */
  private static async rotateLocalBackups(): Promise<void> {
    try {
      const files = fs.readdirSync(this.BACKUP_DIR)
        .filter(f => f.endsWith(".sql.gz"))
        .map(f => ({
          name: f,
          path: path.join(this.BACKUP_DIR, f),
          time: fs.statSync(path.join(this.BACKUP_DIR, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time); // Newest first

      if (files.length > MAX_LOCAL_BACKUPS) {
        const toDelete = files.slice(MAX_LOCAL_BACKUPS);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          // Also delete checksum file
          const checksumPath = `${file.path}.sha256`;
          if (fs.existsSync(checksumPath)) {
            fs.unlinkSync(checksumPath);
          }
          logger.info({ file: file.name }, "[BackupService] Rotated old backup");
        }
      }
    } catch (err) {
      logger.warn({ err }, "[BackupService] Backup rotation failed");
    }
  }

  /**
   * List all available backups with their status.
   */
  static async listBackups() {
    return prisma.systemBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        sizeBytes: true,
        fileUrl: true,
        checksum: true,
        createdAt: true,
      },
    });
  }
}
