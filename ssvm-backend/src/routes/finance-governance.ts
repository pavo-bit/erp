import { Router, Response } from "express";
import { FinancialCloseService } from "../services/FinancialCloseService";
import { AuthRequest, authenticate, requireFinanceAdmin } from "../middleware/auth";
import logger from "../lib/logger";

const router = Router();

// 1. Month-End Close (Lock Accounting Period)
router.post("/periods/:id/close", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response): Promise<void> => {
    const periodId = req.params.id as string;
    try {
        const user = req.user!;
        const requestedSchoolId = req.body?.schoolId;
        const schoolId = user.role === "SUPER_ADMIN" ? requestedSchoolId : user.schoolId;
        if (typeof schoolId !== "string" || !schoolId.trim()) {
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

// Bank reconciliation is intentionally unavailable until statement lines can
// be persisted and matched to posted ledger entries with auditable rules. The
// former handler stored a zero ledger balance and reported a reconciliation
// record without performing a match.
router.post("/reconcile", authenticate, requireFinanceAdmin(), async (_req: AuthRequest, res: Response): Promise<void> => {
    res.status(501).json({
        success: false,
        error: "Bank reconciliation is not implemented; no reconciliation was created",
        code: "BANK_RECONCILIATION_UNAVAILABLE",
    });
});

export default router;
