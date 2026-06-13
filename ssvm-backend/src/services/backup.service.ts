import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

const execAsync = util.promisify(exec);

export class BackupService {
  private static readonly BACKUP_DIR = path.join(process.cwd(), "backups");

  static async initialize() {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Generates a pg_dump compressed SQL file
   * @param isAutomated True if triggered via Cron
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

      // For security, don't log the raw URL with password
      logger.info(`[BackupService] Starting database backup: ${fileName}`);

      // We pipe pg_dump directly into gzip to save disk space
      const command = `pg_dump "${dbUrl}" | gzip > "${filePath}"`;
      await execAsync(command);

      const stats = fs.statSync(filePath);

      await prisma.systemBackup.update({
        where: { id: backupRecord.id },
        data: {
          status: "COMPLETED",
          sizeBytes: stats.size,
          fileUrl: `/backups/${fileName}`,
        },
      });

      logger.info(`[BackupService] Backup completed successfully: ${fileName}`);
      return backupRecord.id;
    } catch (error: any) {
      logger.error(`[BackupService] Backup failed: ${error.message}`);

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
}
