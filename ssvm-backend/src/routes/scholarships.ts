import { createAuditLog } from "../lib/audit";
import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireFinanceAdmin, requireRole } from "../middleware/auth";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

const createScholarshipSchema = z.object({
  studentId: z.string(),
  name: z.string().min(2),
  amount: z.number().positive(),
  percentage: z.number().min(0).max(100).optional(),
  reason: z.string().optional(),
});

// GET /api/v1/finance/scholarships — List scholarships
// Allowed: Finance Admin OR Teachers+ (since teachers may need to view scholarship status of their students)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "School ID required" }); return; }

    const { studentId, status } = req.query;

    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (req.user!.branchId) where.branchId = req.user!.branchId;

    const scholarships = await prisma.scholarship.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } } // approvedBy relation
      }
    });

    res.json({ success: true, data: scholarships });
  } catch (e) {
    logger.error({ err: e }, "List scholarships error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/finance/scholarships — Create scholarship request
router.post("/", authenticate, requireFinanceAdmin(), validate(createScholarshipSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "School ID required" }); return; }

    const scholarshipData = req.body;

    const scholarship = await prisma.scholarship.create({
      data: {
        ...scholarshipData,
        schoolId,
        branchId: req.user!.branchId || undefined,
        status: "PENDING"
      },
    });

    // Log to AuditLog
    await createAuditLog({
      data: {
        action: "SCHOLARSHIP_REQUESTED",
        userId: req.user!.id,
        entity: "Scholarship",
        entityId: scholarship.id,
        schoolId,
        details: JSON.stringify({ amount: scholarship.amount, studentId: scholarship.studentId })
      }
    });

    logger.info({ scholarshipId: scholarship.id }, "Scholarship requested");
    res.status(201).json({ success: true, data: scholarship });
  } catch (e) {
    logger.error({ err: e }, "Create scholarship error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/finance/scholarships/:id/approve — Approve scholarship and credit invoice
router.put("/:id/approve", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const scholarshipId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.body.schoolId || req.query.schoolId) : req.user!.schoolId;

    const result = await prisma.$transaction(async (tx) => {
      const scholarship = await tx.scholarship.findUnique({ where: { id: scholarshipId } });
      if (!scholarship || (schoolId && scholarship.schoolId !== schoolId)) {
        throw new Error("Scholarship not found");
      }

      if (scholarship.status !== "PENDING") {
        throw new Error(`Scholarship is already ${scholarship.status}`);
      }

      // Find the next UNPAID or PARTIALLY_PAID invoice for this student
      const nextInvoice = await tx.invoice.findFirst({
        where: {
          studentId: scholarship.studentId,
          status: { in: ["PENDING", "PARTIAL"] }
        },
        orderBy: { dueDate: "asc" }
      });

      if (!nextInvoice) {
        throw new Error("No active invoice found to apply scholarship credit to");
      }

      // Apply credit to the invoice
      const creditAmount = Math.min(scholarship.amount, nextInvoice.remainingAmount || nextInvoice.amount);
      const newRemainingAmount = (nextInvoice.remainingAmount || nextInvoice.amount) - creditAmount;
      const newAmountPaid = (nextInvoice.amountPaid || 0) + creditAmount;
      const newStatus = newRemainingAmount <= 0 ? "PAID" : "PARTIAL";

      await tx.invoice.update({
        where: { id: nextInvoice.id },
        data: {
          amountPaid: newAmountPaid,
          remainingAmount: newRemainingAmount,
          status: newStatus
        }
      });

      // Add a payment transaction record to represent the scholarship credit
      await tx.paymentTransaction.create({
        data: {
          invoiceId: nextInvoice.id,
          amountPaid: creditAmount,
          gateway: "SCHOLARSHIP",
          transactionId: `SCH-${scholarship.id}`,
          status: "SUCCESS",
          gatewayPaymentId: `SCHOLARSHIP_${scholarship.id}`
        }
      });

      // Update scholarship status
      const updatedScholarship = await tx.scholarship.update({
        where: { id: scholarship.id },
        data: {
          status: "APPROVED",
          approvedBy: req.user!.id,
        }
      });

      // Log to AuditLog
      await tx.auditLog.create({
        data: {
          action: "SCHOLARSHIP_APPROVED",
          userId: req.user!.id,
          entity: "Scholarship",
          entityId: scholarship.id,
          schoolId: scholarship.schoolId,
          details: JSON.stringify({ invoiceId: nextInvoice.id, creditAmount })
        }
      });

      return updatedScholarship;
    });

    logger.info({ scholarshipId }, "Scholarship approved and credited");
    res.json({ success: true, data: result });
  } catch (e: any) {
    logger.error({ err: e }, "Approve scholarship error");
    res.status(400).json({ success: false, error: e.message || "Server error" });
  }
});

// PUT /api/v1/finance/scholarships/:id/reject — Reject scholarship
router.put("/:id/reject", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const scholarshipId = req.params.id as string;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.body.schoolId || req.query.schoolId) : req.user!.schoolId;

    const scholarship = await prisma.scholarship.findUnique({ where: { id: scholarshipId } });
    if (!scholarship || (schoolId && scholarship.schoolId !== schoolId)) {
      res.status(404).json({ success: false, error: "Scholarship not found" }); return;
    }

    if (scholarship.status !== "PENDING") {
      res.status(400).json({ success: false, error: `Scholarship is already ${scholarship.status}` }); return;
    }

    const updated = await prisma.scholarship.update({
      where: { id: scholarship.id },
      data: {
        status: "REJECTED",
      }
    });

    // Log to AuditLog
    await createAuditLog({
      data: {
        action: "SCHOLARSHIP_REJECTED",
        userId: req.user!.id,
        entity: "Scholarship",
        entityId: scholarship.id,
        schoolId: scholarship.schoolId,
      }
    });

    logger.info({ scholarshipId }, "Scholarship rejected");
    res.json({ success: true, data: updated });
  } catch (e) {
    logger.error({ err: e }, "Reject scholarship error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
