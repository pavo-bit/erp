import { BackupService } from '../src/services/backup.service';
import fs from 'fs';
import path from 'path';
import logger from '../src/lib/logger';

async function runDisasterRecoveryTest() {
  logger.info("==========================================");
  logger.info("   DISASTER RECOVERY TEST INITIATED       ");
  logger.info("==========================================");

  try {
    // 1. Create a Backup
    logger.info("Step 1: Triggering Automated Database Backup...");
    const backupId = await BackupService.createDatabaseBackup(true);
    logger.info(`Backup Record Created with ID: ${backupId}`);

    // 2. Find the latest backup file
    const backupDir = path.join(process.cwd(), 'backups');
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql.gz'));
    
    if (files.length === 0) {
      throw new Error("No backup files found in backups directory!");
    }

    // Get the most recently modified file
    const latestFile = files.map(file => ({
      name: file,
      time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
    })).sort((a, b) => b.time - a.time)[0].name;

    logger.info(`Step 2: Found latest backup file: ${latestFile}`);

    // 3. Restore the Backup
    logger.info("Step 3: Triggering Automated Database Restore...");
    await BackupService.restoreDatabaseBackup(latestFile);
    
    logger.info("==========================================");
    logger.info("   DISASTER RECOVERY TEST SUCCESSFUL      ");
    logger.info("==========================================");

  } catch (error: any) {
    logger.error("==========================================");
    logger.error("   DISASTER RECOVERY TEST FAILED          ");
    logger.error("==========================================");
    logger.error(`Error Details: ${error.message}`);
    process.exit(1);
  }
}

runDisasterRecoveryTest();
