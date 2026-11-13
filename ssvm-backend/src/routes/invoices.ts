import { Router, Response } from "express";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { AuthRequest, authenticate, requireRole, requireFinanceAdmin } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";
import { toPaise, fromPaise } from "../lib/money";
import { Prisma, InvoiceStatus } from "@prisma/client";

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
        schoolId: req.user!.schoolId || req.body.schoolId,
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
router.put("/:id/pay", authenticate, requireRole("ACCOUNTANT", "ERP_ADMIN", "PARENT", "STUDENT"), async (req: AuthRequest, res: Response) => {
  try {
    const { amountPaid, gateway, transactionId } = req.body;
    if (!amountPaid) {
      res.status(400).json({ success: false, error: "amountPaid is required" }); return;
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id as string } });
    if (!invoice) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }
    if (!req.user?.schoolId || invoice.schoolId !== req.user.schoolId) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }

    const currentPaidPaise = toPaise(invoice.amountPaid);
    const paymentPaise = toPaise(amountPaid);
    const totalDuePaise = toPaise(invoice.amount) + toPaise(invoice.fineAmount);
    const newPaidPaise = currentPaidPaise + paymentPaise;
    const remainingPaise = Math.max(0, totalDuePaise - newPaidPaise);
    const newStatus = remainingPaise === 0 ? "PAID" : "PARTIAL";

    const updatedInvoice = await runWithTenantDatabaseTransaction(invoice.schoolId, async (tx) => {
      // 1. Create Transaction
      await tx.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          amountPaid: fromPaise(paymentPaise),
          gateway: gateway || "CASH",
          transactionId: transactionId || null,
          status: "SUCCESS",
          paidAt: new Date(),
          schoolId: invoice.schoolId,
        }
      });

      // 2. Update Invoice
      return await tx.invoice.update({
        where: { id: invoice.id, schoolId: req.user!.schoolId! },
        data: {
          amountPaid: fromPaise(newPaidPaise),
          remainingAmount: fromPaise(remainingPaise),
          status: newStatus as InvoiceStatus,
          paidDate: newStatus === "PAID" ? new Date() : null,
        },
        include: { transactions: true }
      });
    });

    res.json({ success: true, data: updatedInvoice });
  } catch (e) { console.error(e); res.status(500).json({ success: false, error: "Server error" }); }
});

export default router;
