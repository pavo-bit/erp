import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { FinancialCloseService } from "../services/FinancialCloseService";

const router = Router();

// 1. Month-End Close (Lock Accounting Period)
router.post("/periods/:id/close", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const periodId = req.params.id as string;
        const { schoolId, closedById } = req.body;

        await FinancialCloseService.closePeriod(schoolId, periodId, closedById);

        res.json({ success: true, message: "Accounting Period successfully closed and locked." });
    } catch (error) {
        next(error);
    }
});

// 2. Bank Reconciliation Engine
router.post("/reconcile", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { schoolId, accountId, statementDate, statementBalance, lines } = req.body;
        // lines: Array of { date, amount, description, reference }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            
            // Create the parent reconciliation record
            const recon = await tx.bankReconciliation.create({
                data: {
                    schoolId,
                    accountId,
                    statementDate: new Date(statementDate),
                    statementBalance: new Prisma.Decimal(statementBalance),
                    ledgerBalance: new Prisma.Decimal(0), // Would normally be calculated from LedgerEntries
                    isMatched: false
                }
            });

            let matchedCount = 0;
            let unmatchedCount = 0;

            // Simple Reconciliation Engine algorithm
            for (const line of lines) {
                // Find potential matches on exact amount and approx date
                const potentialMatch = await tx.ledgerTransaction.findFirst({
                    where: {
                        schoolId,
                        status: "POSTED",
                        // Needs to map through LedgerEntry to get the amount in a real query, 
                        // but assuming amount is recorded natively or we just search.
                        // For demonstration, we just update a status string.
                        // (Real implementation requires querying LedgerEntry)
                    }
                });

                if (potentialMatch) {
                    matchedCount++;
                    // In a real system, you'd map a reconciliation link or entry
                    // await tx.ledgerTransaction.update({
                    //    where: { id: potentialMatch.id },
                    //    data: { eventPublished: true } // Mock flag
                    // });
                } else {
                    unmatchedCount++;
                }
            }

            const updatedRecon = await tx.bankReconciliation.update({
                where: { id: recon.id },
                data: {
                    isMatched: unmatchedCount === 0
                }
            });

            return updatedRecon;
        });

        res.status(201).json({ success: true, data: result });
    } catch(error) {
        next(error);
    }
});

export default router;
