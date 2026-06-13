import prisma from '../lib/prisma';
import logger from '../lib/logger';

export class SoftDeleteService {
  /**
   * Soft delete an entity (generic wrapper).
   */
  static async softDelete(modelName: keyof typeof prisma, id: string, userId: string): Promise<boolean> {
    try {
      // We use any because dynamic prisma models don't easily share a common interface for deletedAt
      const model = prisma[modelName] as any;
      await model.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        }
      });
      return true;
    } catch (error) {
      logger.error({ error, modelName, id }, 'Failed to soft delete entity');
      return false;
    }
  }

  /**
   * Restore a soft-deleted entity.
   */
  static async restore(modelName: keyof typeof prisma, id: string): Promise<boolean> {
    try {
      const model = prisma[modelName] as any;
      await model.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedById: null,
        }
      });
      return true;
    } catch (error) {
      logger.error({ error, modelName, id }, 'Failed to restore entity');
      return false;
    }
  }

  /**
   * Permanently purge an entity.
   */
  static async purge(modelName: keyof typeof prisma, id: string): Promise<boolean> {
    try {
      const model = prisma[modelName] as any;
      await model.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      logger.error({ error, modelName, id }, 'Failed to purge entity');
      return false;
    }
  }

  /**
   * Check if an entity is soft deleted
   */
  static async isDeleted(modelName: keyof typeof prisma, id: string): Promise<boolean> {
    try {
      const model = prisma[modelName] as any;
      const entity = await model.findUnique({
        where: { id },
        select: { deletedAt: true }
      });
      return !!entity?.deletedAt;
    } catch (error) {
      return false;
    }
  }
}
