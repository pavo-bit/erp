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

  /**
   * Restores a gzipped database backup
   */
  static async restoreDatabaseBackup(fileName: string): Promise<void> {
    const filePath = path.join(this.BACKUP_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    logger.info(`[BackupService] Starting database restore from: ${fileName}`);

    try {
      // For Windows/Linux compat, we'll try to use zcat or standard gzip extraction if needed.
      // But standard 'gzip -d -c ... | psql' is usually safe in unix environments.
      // Since the user might be on windows, we'll use a platform-agnostic approach where possible, 
      // but pg_restore / psql relies on DB tools.
      
      const isWindows = process.platform === "win32";
      let command = "";
      if (isWindows) {
        // Windows CMD/Powershell compatible gzip extraction and psql pipe might be tricky without gzip installed.
        // Assuming pg_restore or standard psql is available.
        // Actually, zcat or gunzip is often installed with Git Bash on Windows. 
        // We will attempt gunzip to stdout.
        command = `gunzip -c "${filePath}" | psql "${dbUrl}"`;
      } else {
        command = `gunzip -c "${filePath}" | psql "${dbUrl}"`;
      }

      await execAsync(command);
      logger.info(`[BackupService] Database restored successfully`);
    } catch (error: any) {
      logger.error(`[BackupService] Restore failed: ${error.message}`);
      throw error;
    }
  }
}
