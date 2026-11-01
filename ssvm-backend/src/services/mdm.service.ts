import prisma from '../lib/prisma';



export class MasterDataManagementService {
  /**
   * Phase 13: Merge two duplicated records into a single Golden Record
   * This ensures all future queries point to the surviving authoritative ID.
   */
  static async deduplicateRecords(
    entityType: string,
    survivingId: string,
    mergedId: string,
    mergedBy: string,
    reason?: string
  ) {
    if (survivingId === mergedId) throw new Error("Cannot merge a record into itself");

    return await prisma.$transaction(async (tx) => {
      // 1. Find or Create the Golden Record for the Survivor
      let goldenRecord = await tx.masterDataRegistry.findUnique({
        where: { authoritativeId: survivingId }
      });

      if (!goldenRecord) {
        goldenRecord = await tx.masterDataRegistry.create({
          data: {
            entityType,
            authoritativeId: survivingId,
            canonicalName: `Golden Record for ${survivingId}`, // In production, fetch actual name
            confidenceScore: 1.0
          }
        });
      }

      // 2. Point all Aliases of the merged record to the Survivor's Golden Record
      // (Handles recursive merges)
      const mergedRecordRegistry = await tx.masterDataRegistry.findUnique({
        where: { authoritativeId: mergedId }
      });

      if (mergedRecordRegistry) {
         await tx.masterRecordAlias.updateMany({
           where: { registryId: mergedRecordRegistry.id },
           data: { registryId: goldenRecord.id }
         });
      }

      // 3. Add an explicit alias for the merged ID itself
      await tx.masterRecordAlias.upsert({
        where: {
          registryId_sourceSystem_sourceId: {
            registryId: goldenRecord.id,
            sourceSystem: 'INTERNAL',
            sourceId: mergedId
          }
        },
        update: {},
        create: {
          registryId: goldenRecord.id,
          sourceSystem: 'INTERNAL',
          sourceId: mergedId,
          sourceName: `Merged Record ${mergedId}`
        }
      });

      // 4. Create the Immutable Audit Trail for the Merge
      await tx.masterRecordMerge.create({
        data: {
          registryId: goldenRecord.id,
          survivingId,
          mergedId,
          mergedBy,
          reason
        }
      });

      // In a complete ERP, an async worker would now scan the DB and remap 
      // all foreign keys pointing to `mergedId` to point to `survivingId`.

      return goldenRecord;
    });
  }

  /**
   * Get the Authoritative ID for any given source ID.
   * If a record was merged, this will seamlessly return the surviving ID.
   */
  static async getAuthoritativeRecord(sourceId: string, sourceSystem: string = 'INTERNAL') {
    const alias = await prisma.masterRecordAlias.findFirst({
      where: { sourceSystem, sourceId },
      include: { MasterDataRegistry: true }
    });

    // If an alias exists, it means this record was merged. Return the True ID.
    if (alias) {
      return alias.MasterDataRegistry.authoritativeId;
    }

    // Otherwise, the ID hasn't been merged and is still valid.
    return sourceId; 
  }
}
