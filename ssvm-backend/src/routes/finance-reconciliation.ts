import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireFinanceAdmin } from "../middleware/auth";
import { ReconciliationService } from "../services/reconciliation.service";
import { z } from "zod";

const router = Router();

// All reconciliation routes require finance admin access
router.use(authenticate);
router.use(requireFinanceAdmin());

/**
 * GET /api/v1/finance/reconciliation
 * List reconciliation records, optionally filtered by date.
 * Query params: ?date=YYYY-MM-DD&status=FULLY_RECONCILED
 */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, status } = req.query;
    const schoolId = req.user!.role === "SUPER_ADMIN"
      ? (req.query.schoolId as string) || undefined
      : req.user!.schoolId;

    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (status) where.status = status;

    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.settlementDate = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    const reconciliations = await prisma.razorpayReconciliation.findMany({
      where,
      orderBy: { settlementDate: "desc" },
      take: 50,
    });

    res.json({ success: true, data: reconciliations });
  } catch (e) {
    logger.error({ err: e }, "List reconciliations error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * GET /api/v1/finance/reconciliation/unmatched
 * Fetch reconciliation records that have unmatched items.
 */
router.get("/unmatched", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN"
      ? (req.query.schoolId as string) || undefined
      : req.user!.schoolId;

    const where: any = {
      status: { in: ["PARTIALLY_RECONCILED", "FAILED"] },
    };
    if (schoolId) where.schoolId = schoolId;

    const records = await prisma.razorpayReconciliation.findMany({
      where,
      orderBy: { settlementDate: "desc" },
      take: 50,
    });

    // Extract just the unmatched items from each record
    const unmatchedDetails = records.map(r => ({
      id: r.id,
      settlementId: r.settlementId,
      settlementDate: r.settlementDate,
      settlementAmount: r.settlementAmount,
      unreconciledAmount: r.unreconciledAmount,
      status: r.status,
      unmatchedItems: r.unmatchedItems || [],
    }));

    res.json({ success: true, data: unmatchedDetails });
  } catch (e) {
    logger.error({ err: e }, "List unmatched reconciliations error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

const manualMatchSchema = z.object({
  reconciliationId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  invoiceId: z.string().min(1),
  justification: z.string().min(10, "Justification must be at least 10 characters"),
});

/**
 * POST /api/v1/finance/reconciliation/manual-match
 * Manually link an unmatched Razorpay payment to an existing Invoice.
 * Requires a mandatory justification logged to AuditLog.
 */
router.post("/manual-match", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = manualMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { reconciliationId, razorpayPaymentId, invoiceId, justification } = parsed.data;

    await ReconciliationService.manualMatch({
      reconciliationId,
      razorpayPaymentId,
      invoiceId,
      justification,
      userId: req.user!.id,
    });

    res.json({
      success: true,
      message: "Manual match completed successfully",
    });
  } catch (e: any) {
    logger.error({ err: e }, "Manual match error");
    res.status(400).json({ success: false, error: e.message || "Server error" });
  }
});

/**
 * POST /api/v1/finance/reconciliation/trigger
 * Manually trigger a reconciliation run for a specific date range.
 * Useful for re-running failed reconciliations.
 */
router.post("/trigger", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only SUPER_ADMIN can manually trigger
    if (req.user!.role !== "SUPER_ADMIN") {
      res.status(403).json({ success: false, error: "Only SUPER_ADMIN can trigger manual reconciliation" });
      return;
    }

    const { from, to } = req.body;
    if (!from || !to) {
      res.status(400).json({ success: false, error: "from and to dates are required (YYYY-MM-DD)" });
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Run asynchronously — don't block the response
    ReconciliationService.runDailyReconciliation(fromDate, toDate).catch(err => {
      logger.error({ err }, "Manual reconciliation trigger failed");
    });

    res.status(202).json({
      success: true,
      message: "Reconciliation triggered in the background",
    });
  } catch (e) {
    logger.error({ err: e }, "Trigger reconciliation error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
