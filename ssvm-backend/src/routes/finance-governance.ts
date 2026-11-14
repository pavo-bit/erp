import { Router, Response } from "express";
import { FinancialCloseService } from "../services/FinancialCloseService";
import { BankReconciliationService } from "../services/BankReconciliationService";
import { AuthRequest, authenticate, requireFinanceAdmin } from "../middleware/auth";
import logger from "../lib/logger";
import prisma from "../lib/prisma";

const router = Router();

function resolveSchoolId(req: AuthRequest, requestedSchoolId?: unknown): string | null {
    const schoolId = req.user?.role === "SUPER_ADMIN" ? requestedSchoolId : req.user?.schoolId;
    return typeof schoolId === "string" && schoolId.trim() ? schoolId : null;
}

router.get("/periods", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = resolveSchoolId(req, req.query.schoolId);
    if (!schoolId) {
        res.status(400).json({ success: false, error: "School scope is required" });
        return;
    }
    try {
        const periods = await prisma.accountingPeriod.findMany({
            where: { schoolId },
            orderBy: { startDate: "asc" },
        });
        res.json({ success: true, data: periods });
    } catch (error) {
        logger.error({ err: error, schoolId }, "Accounting period list failed");
        res.status(500).json({ success: false, error: "Unable to load accounting periods" });
    }
});

// 1. Month-End Close (Lock Accounting Period)
router.post("/periods/:id/close", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response): Promise<void> => {
    const periodId = req.params.id as string;
    try {
        const user = req.user!;
        const schoolId = resolveSchoolId(req, req.body?.schoolId);
        if (!schoolId) {
            res.status(400).json({ success: false, error: "School scope is required" });
            return;
        }

        const result = await FinancialCloseService.closePeriod(schoolId, periodId, user.id);
        if (!result.success) {
            res.status(409).json({ success: false, error: "Accounting period could not be closed", data: result });
            return;
        }

        res.json({ success: true, message: "Accounting Period successfully closed and locked.", data: result });
    } catch (error) {
        logger.error({ err: error, periodId, userId: req.user?.id }, "Financial period close failed");
        res.status(500).json({ success: false, error: "Unable to close accounting period" });
    }
});

// 2. Bank Reconciliation Engine
// Matches ingested BankStatementLines against posted LedgerEntry records.
// Intentionally rejects placeholder / empty-line requests with 501 to maintain security invariants.
router.post("/reconcile", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = resolveSchoolId(req, req.body?.schoolId);
    if (!schoolId) {
        res.status(400).json({ success: false, error: "School scope is required" });
        return;
    }

    const { accountId, statementDate, statementBalance, lines, statementLines } = req.body || {};
    const effectiveLines = (Array.isArray(statementLines) && statementLines.length > 0)
        ? statementLines
        : (Array.isArray(lines) && lines.length > 0 ? lines : null);

    // Reject empty placeholder reconciliation requests without creating false-positive records
    if (!effectiveLines || effectiveLines.length === 0) {
        res.status(400).json({
            success: false,
            error: "statement lines are required",
        });
        return;
    }

    if (!accountId || statementDate === undefined || statementBalance === undefined) {
        res.status(400).json({
            success: false,
            error: "accountId, statementDate, and statementBalance are required",
        });
        return;
    }

    try {
        const result = await BankReconciliationService.reconcileBank({
            schoolId,
            accountId,
            statementDate: new Date(statementDate),
            statementBalance,
            statementLines: effectiveLines,
        });

        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        logger.error({ err: error, schoolId, accountId }, "Bank reconciliation execution failed");
        res.status(400).json({ success: false, error: error.message || "Bank reconciliation failed" });
    }
});

export default router;
