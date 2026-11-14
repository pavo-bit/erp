import { Router, Response } from "express";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { AuthRequest, authenticate, requireRole, requireFinanceAdmin } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";
import { toPaise, fromPaise } from "../lib/money";
import { Prisma, InvoiceStatus } from "@prisma/client";
import { CashCollectionService } from "../services/cash-collection.service";
import logger from "../lib/logger";

const router = Router();

// GET /api/invoices
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, studentId } = req.query as Record<string, string | undefined>;
    const paginationParams = parsePaginationParams(req.query, ['dueDate', 'amount', 'createdAt']);
    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (req.user!.schoolId) where.schoolId = req.user!.schoolId;
    if (req.user!.branchId) where.branchId = req.user!.branchId;

    // If STUDENT, force studentId filter to their own record
    if (req.user!.role === "STUDENT") {
      const studentIdFromToken = req.user?.studentId;
      if (!studentIdFromToken) {
        return res.status(400).json({ success: false, error: 'Student ID not found in token' });
      }
      where.studentId = studentIdFromToken;
    }

    const result = await paginatedQuery(
      prisma.invoice,
      where,
      { 
        student: { select: { id: true, name: true,   rollNo: true, guardian: true, sectionRef: { select: { name: true, class: { select: { name: true } } } } } },
        transactions: true
      },
      paginationParams
    );

    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// POST /api/invoices
router.post("/", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, amount, type, status, dueDate, remarks } = req.body;
    if (!studentId || !amount || !type || !dueDate) { res.status(400).json({ success: false, error: "Required fields missing" }); return; }
    
    const decimalAmount = new Prisma.Decimal(amount);
    const invoice = await prisma.invoice.create({
      data: { 
        studentId, 
        schoolId: req.user!.schoolId!,
        amount: decimalAmount,
        remainingAmount: decimalAmount,
        type, 
        status: status || "PENDING", 
        dueDate: new Date(dueDate), 
        remarks: remarks || null 
      },
      include: { student: { select: { id: true, name: true,   rollNo: true, sectionRef: { select: { name: true, class: { select: { name: true } } } } } } },
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

// PUT /api/invoices/:id/pay
router.put("/:id/pay", authenticate, requireRole("ACCOUNTANT", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { amountPaid, gateway, transactionId } = req.body;
    let decimalAmount: Prisma.Decimal;
    try {
      decimalAmount = new Prisma.Decimal(amountPaid);
    } catch {
      res.status(400).json({ success: false, error: "amountPaid is required and must be a valid number" });
      return;
    }
    if (decimalAmount.lte(0)) {
      res.status(400).json({ success: false, error: "amountPaid is required and must be greater than zero" });
      return;
    }

    if (!req.user?.schoolId) {
      res.status(400).json({ success: false, error: "School context required" });
      return;
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id as string } });
    if (!invoice || invoice.schoolId !== req.user.schoolId) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    const cashierUser = {
      id: req.user.id,
      name: (req.user as any).name || req.user.email || "Staff Cashier",
    };

    const paymentMethod = (gateway === "CHEQUE" || gateway === "DD" || gateway === "COUNTER_UPI" || gateway === "BANK_TRANSFER")
      ? gateway
      : "CASH";

    const result = await CashCollectionService.recordCashPayment(invoice.schoolId, cashierUser, {
      studentId: invoice.studentId,
      amountReceived: amountPaid,
      paymentMethod,
      selectedInvoiceIds: [invoice.id],
      allocationStrategy: "MANUAL",
      manualAllocations: [{ invoiceId: invoice.id, amount: amountPaid }],
      instrumentNo: transactionId,
      remarks: "Staff collection via /invoices/:id/pay",
    });

    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { transactions: true },
    });

    res.json({
      success: true,
      data: updatedInvoice,
      receipt: result.receipt,
      paymentTransaction: result.paymentTransaction,
    });
  } catch (e: any) {
    logger.error({ err: e }, "Invoice pay error");
    res.status(400).json({ success: false, error: e.message || "Failed to process payment" });
  }
});

export default router;
