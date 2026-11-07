import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { CashCollectionService } from "../services/cash-collection.service";
import { CashReceiptPdfService } from "../services/cash-receipt-pdf.service";
import logger from "../lib/logger";

const router = Router();

// Staff roles allowed to handle cash and offline fee collections
const cashierAuth = [authenticate, requireRole("ERP_ADMIN", "ACCOUNTANT", "SUPER_ADMIN", "RECEPTIONIST")];

/**
 * GET /api/v1/finance/cash/students?q=...
 * Search students by admission number, name, roll number, or guardian
 */
router.get("/students", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const query = String(req.query.q || "");
    const results = await CashCollectionService.searchStudentsForCashier(schoolId, query);
    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error({ error, schoolId: req.user?.schoolId }, "Failed to search students for cashier");
    res.status(500).json({ success: false, error: error.message || "Failed to search students" });
  }
});

/**
 * GET /api/v1/finance/cash/students/:studentId/invoices
 * Get student profile and outstanding invoices
 */
router.get("/students/:studentId/invoices", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const studentId = req.params.studentId as string;
    const data = await CashCollectionService.getStudentOutstandingInvoices(schoolId, studentId);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error({ error, studentId: req.params.studentId }, "Failed to get student invoices");
    res.status(error.message?.includes("not found") ? 404 : 500).json({
      success: false,
      error: error.message || "Failed to get student invoices",
    });
  }
});

/**
 * POST /api/v1/finance/cash/preview-allocation
 * Preview payment allocation across selected invoices
 */
router.post("/preview-allocation", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, amountReceived, selectedInvoiceIds, allocationStrategy, manualAllocations } = req.body;

    if (!studentId || !amountReceived) {
      res.status(400).json({ success: false, error: "studentId and amountReceived are required" });
      return;
    }

    const { invoices } = await CashCollectionService.getStudentOutstandingInvoices(schoolId, studentId);
    const preview = CashCollectionService.previewAllocation({
      invoices,
      amountReceived,
      selectedInvoiceIds,
      allocationStrategy,
      manualAllocations,
    });

    res.json({ success: true, data: preview });
  } catch (error: any) {
    logger.error({ error }, "Failed to preview fee allocation");
    res.status(400).json({ success: false, error: error.message || "Invalid allocation parameters" });
  }
});

/**
 * POST /api/v1/finance/cash/record-payment
 * Record cash or offline payment atomically
 */
router.post("/record-payment", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const cashierUser = {
      id: req.user!.id,
      name: (req.user as any).name || req.user!.email || "Cashier Staff",
    };

    const {
      studentId,
      amountReceived,
      paymentMethod,
      selectedInvoiceIds,
      allocationStrategy,
      manualAllocations,
      instrumentNo,
      instrumentDate,
      issuingBank,
      pendingClearance,
      remarks,
    } = req.body;

    if (!studentId || !amountReceived || !paymentMethod) {
      res.status(400).json({
        success: false,
        error: "studentId, amountReceived, and paymentMethod (CASH, CHEQUE, DD, COUNTER_UPI, BANK_TRANSFER) are required",
      });
      return;
    }

    const result = await CashCollectionService.recordCashPayment(schoolId, cashierUser, {
      studentId,
      amountReceived,
      paymentMethod,
      selectedInvoiceIds,
      allocationStrategy,
      manualAllocations,
      instrumentNo,
      instrumentDate,
      issuingBank,
      pendingClearance,
      remarks,
    });

    res.status(201).json({
      success: true,
      data: {
        receipt: result.receipt,
        allocations: result.allocations,
        advanceCredit: result.advanceCredit,
        paymentTransactionId: result.paymentTransaction.id,
      },
    });
  } catch (error: any) {
    logger.error({ error, body: req.body }, "Failed to record cash payment");
    res.status(500).json({ success: false, error: error.message || "Failed to record payment" });
  }
});

/**
 * GET /api/v1/finance/cash/receipts/:receiptId
 * Get official receipt metadata and allocations
 */
router.get("/receipts/:receiptId", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const receiptId = req.params.receiptId as string;
    const receipt = await CashCollectionService.getReceiptById(schoolId, receiptId);
    res.json({ success: true, data: receipt });
  } catch (error: any) {
    logger.error({ error, receiptId: req.params.receiptId }, "Failed to get receipt");
    res.status(error.message?.includes("not found") ? 404 : 500).json({
      success: false,
      error: error.message || "Failed to get receipt",
    });
  }
});

/**
 * GET /api/v1/finance/cash/receipts/:receiptId/html
 * Render printable HTML official receipt
 */
router.get("/receipts/:receiptId/html", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const receiptId = req.params.receiptId as string;
    const html = await CashReceiptPdfService.renderReceiptHtml(schoolId, receiptId);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error: any) {
    logger.error({ error, receiptId: req.params.receiptId }, "Failed to render receipt HTML");
    res.status(error.message?.includes("not found") ? 404 : 500).send(error.message || "Failed to render receipt");
  }
});

/**
 * GET /api/v1/finance/cash/receipts/:receiptId/pdf
 * Generate downloadable/streamable official PDF receipt
 */
router.get("/receipts/:receiptId/pdf", cashierAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const receiptId = req.params.receiptId as string;
  try {
    const pdfBuffer = await CashReceiptPdfService.generateReceiptPdf(schoolId, receiptId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Fee_Receipt_${receiptId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error({ error, receiptId }, "Failed to generate receipt PDF, falling back to HTML");
    try {
      // Fallback: render HTML printable page if puppeteer is unavailable in the environment
      const html = await CashReceiptPdfService.renderReceiptHtml(schoolId, receiptId);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (fallbackErr: any) {
      res.status(500).json({ success: false, error: fallbackErr.message || "Failed to render receipt" });
    }
  }
});

/**
 * POST /api/v1/finance/cash/receipts/:receiptId/reprint
 * Mark receipt as reprinted, increment counter, audit log
 */
router.post("/receipts/:receiptId/reprint", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const receiptId = req.params.receiptId as string;
    const cashierUser = {
      id: req.user!.id,
      name: (req.user as any).name || req.user!.email || "Cashier Staff",
    };

    const updated = await CashCollectionService.reprintReceipt(schoolId, receiptId, cashierUser);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error({ error, receiptId: req.params.receiptId }, "Failed to reprint receipt");
    res.status(error.message?.includes("not found") ? 404 : 500).json({
      success: false,
      error: error.message || "Failed to reprint receipt",
    });
  }
});

/**
 * GET /api/v1/finance/cash/daily-register
 * Daily Cash Register report
 */
router.get("/daily-register", cashierAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const date = req.query.date as string | undefined;
    const cashierId = req.query.cashierId as string | undefined;

    const report = await CashCollectionService.getDailyCashRegister(schoolId, { date, cashierId });
    res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error({ error, schoolId: req.user?.schoolId }, "Failed to get daily cash register");
    res.status(500).json({ success: false, error: error.message || "Failed to get daily cash register" });
  }
});

export default router;
