import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

export class FinancialCloseService {

    /**
     * Executes the strict Month-End Close process.
     * Prevents future journal entries in the frozen period.
     */
    static async closePeriod(schoolId: string, periodId: string, closedById: string): Promise<void> {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const period = await tx.accountingPeriod.findUniqueOrThrow({
                where: { id: periodId }
            });

            if (period.schoolId !== schoolId) {
                throw new Error("Unauthorized period access");
            }

            if (period.status === "CLOSED") {
                throw new Error("Period is already closed");
            }

            // 1. Guardrail: Check for any PENDING transactions in this period
            const pendingCount = await tx.ledgerTransaction.count({
                where: {
                    accountingPeriodId: periodId,
                    status: "PENDING"
                }
            });

            if (pendingCount > 0) {
                throw new Error(`Cannot close period: ${pendingCount} pending transactions remain. Approve or reject them first.`);
            }

            // 2. Calculate closing balances for the period
            // In a full implementation, you would compute the total debits/credits 
            // and update LedgerAccount balances or create a snapshot.
            // For now, we will just sum up the posted transactions as a simplistic check.
            
            const transactions = await tx.ledgerTransaction.aggregate({
                where: {
                    accountingPeriodId: periodId,
                    status: "POSTED"
                },
                _count: { id: true }
            });

            // 3. Update Period Status to mathematically lock it
            await tx.accountingPeriod.update({
                where: { id: periodId },
                data: { status: "CLOSED" }
            });

            // 4. Generate the Immutable Financial Close Record
            await tx.financialClose.create({
                data: {
                    schoolId,
                    periodId,
                    closedById,
                    totalDebits: new Prisma.Decimal(0), // Placeholder for complex computation
                    totalCredits: new Prisma.Decimal(0), // Placeholder for complex computation
                    netIncome: new Prisma.Decimal(0),    // Placeholder for complex computation
                    status: "COMPLETED",
                    notes: `Period closed with ${transactions._count.id} posted transactions.`
                }
            });

            logger.info(`Period ${period.name} successfully CLOSED for school ${schoolId}.`);
        });
    }
}
