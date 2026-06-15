import prisma from "../lib/prisma";
import logger from "../lib/logger";

export class DataRetentionService {

    /**
     * Executes all active Data Retention Policies.
     * This method is designed to be called via a daily Cron job.
     */
    static async executePolicies(): Promise<void> {
        logger.info("Starting Data Retention Policy Execution...");

        const policies = await prisma.dataRetentionPolicy.findMany({
            where: { isActive: true }
        });

        for (const policy of policies) {
            try {
                await this.processPolicy(policy);
            } catch (error: any) {
                logger.error({ err: error }, `Failed to execute retention policy for ${policy.entityName} (School: ${policy.schoolId})`);
            }
        }

        logger.info("Data Retention Policy Execution completed.");
    }

    private static async processPolicy(policy: { id: string; schoolId: string; entityName: string; retentionDays: number; action: string }): Promise<void> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - policy.retentionDays);

        logger.info(`Processing Policy: ${policy.action} ${policy.entityName} older than ${thresholdDate.toISOString()} for School ${policy.schoolId}`);

        if (policy.action === "PURGE") {
            let deletedCount = 0;

            // Highly dynamic table execution logic.
            // Using raw queries or matching the exact Prisma delegate would be necessary here.
            // For safety and typing, we switch on supported models.
            
            switch (policy.entityName) {
                case "VisitorLog":
                    const vLogResult = await prisma.visitorLog.deleteMany({
                        where: {
                            schoolId: policy.schoolId,
                            checkIn: { lt: thresholdDate }
                        }
                    });
                    deletedCount = vLogResult.count;
                    break;
                
                case "AuditLog":
                    const aLogResult = await prisma.auditLog.deleteMany({
                        where: {
                            schoolId: policy.schoolId,
                            createdAt: { lt: thresholdDate }
                        }
                    });
                    deletedCount = aLogResult.count;
                    break;
                    
                default:
                    logger.warn(`Retention policy engine does not currently support purging entity: ${policy.entityName}`);
                    return;
            }

            logger.info(`Purged ${deletedCount} ${policy.entityName} records for School ${policy.schoolId}`);
            
            // Log the purge action to Audit
            if (deletedCount > 0) {
                await prisma.auditLog.create({
                    data: {
                        schoolId: policy.schoolId,
                        action: "DATA_RETENTION_PURGE",
                        entity: policy.entityName,
                        details: `Automated purge deleted ${deletedCount} records older than ${policy.retentionDays} days.`
                    }
                });
            }
        } else if (policy.action === "ARCHIVE") {
            logger.warn(`Archival action for ${policy.entityName} is supported in Enterprise Tier AWS S3 cold storage only. Proceeding with dry-run.`);
        }
    }
}
