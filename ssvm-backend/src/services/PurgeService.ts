import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { StorageService } from './StorageService';

export class PurgeService {
  /**
   * Hard deletes all entities that were soft-deleted before the specified date.
   */
  static async purgeSoftDeletedEntities(olderThan: Date): Promise<void> {
    logger.info({ olderThan }, 'Starting purge of soft-deleted entities');
    
    // Purge Soft-deleted Users
    const deletedUsers = await prisma.user.findMany({
      where: { deletedAt: { lte: olderThan } },
      select: { id: true, schoolId: true }
    });
    
    if (deletedUsers.length > 0) {
      const userIds = deletedUsers.map(u => u.id);
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
      logger.info(`Purged ${deletedUsers.length} soft-deleted users.`);
    }

    // Purge Soft-deleted Students
    const deletedStudents = await prisma.student.findMany({
      where: { deletedAt: { lte: olderThan } },
      select: { id: true }
    });

    if (deletedStudents.length > 0) {
      const studentIds = deletedStudents.map(s => s.id);
      await prisma.student.deleteMany({
        where: { id: { in: studentIds } }
      });
      logger.info(`Purged ${deletedStudents.length} soft-deleted students.`);
    }
  }

  /**
   * Purges old system logs to free up database space.
   */
  static async purgeOldLogs(olderThan: Date): Promise<void> {
    logger.info({ olderThan }, 'Starting purge of old system logs');
    
    const result = await prisma.systemLog.deleteMany({
      where: { createdAt: { lte: olderThan } }
    });
    
    logger.info(`Purged ${result.count} old system logs.`);
  }

  /**
   * Cleans up orphaned storage objects (e.g. uploaded but never linked to any entity, or where entity was deleted)
   * This would typically query for storage objects older than X days that are not referenced.
   */
  static async purgeOrphanedStorage(olderThan: Date): Promise<void> {
    // A simplified example. You'd need to check references in a real system.
    logger.info({ olderThan }, 'Starting purge of orphaned storage objects');
    
    const orphanedObjects = await prisma.storageObject.findMany({
      where: { 
        scanStatus: 'INFECTED', // e.g. purge infected files immediately if they are old
        createdAt: { lte: olderThan }
      }
    });

    let count = 0;
    for (const obj of orphanedObjects) {
      const success = await StorageService.deleteObject(obj.key);
      if (success) {
        count++;
      }
    }
    
    logger.info(`Purged ${count} orphaned/infected storage objects.`);
  }
}
