import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import { LedgerEngine } from "../../lib/ledgerEngine";

const router = Router();

// Allow Finance Admins and Super Admins
const requireFinanceRole = requireRole("SUPER_ADMIN", "FINANCE_ADMIN");

// ─── Fee Categories ───

// GET /api/v1/admin/billing/categories
router.get("/categories", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const categories = await prisma.feeCategory.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, categories });
  } catch (error) {
    logger.error({ error }, "Error fetching fee categories");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/billing/categories
router.post("/categories", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "Category name is required" });
      return;
    }

    const category = await prisma.feeCategory.create({
      data: { schoolId, name, description },
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    logger.error({ error }, "Error creating fee category");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── Fee Structures ───

// POST /api/v1/admin/billing/structures
router.post("/structures", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { categoryId, classId, amount } = req.body;

    if (!categoryId || !amount) {
      res.status(400).json({ success: false, error: "Category ID and Amount are required" });
      return;
    }

    const structure = await prisma.feeStructure.create({
      data: {
        schoolId,
        categoryId,
        classId,
        amount: Number(amount),
      },
    });
    res.status(201).json({ success: true, structure });
  } catch (error) {
    logger.error({ error }, "Error creating fee structure");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── Invoice Generation Engine ───

// POST /api/v1/admin/billing/invoices/generate
router.post("/invoices/generate", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const { classId, structureId, description, dueDate } = req.body;

    if (!classId || !structureId) {
      res.status(400).json({ success: false, error: "Class ID and Fee Structure ID are required" });
      return;
    }

    // 1. Fetch the Fee Structure
    const structure = await prisma.feeStructure.findFirst({
      where: { id: structureId, schoolId },
      include: { category: true }
    });

    if (!structure) {
      res.status(404).json({ success: false, error: "Fee Structure not found" });
      return;
    }

    // 2. Fetch all students in the class
    const students = await prisma.student.findMany({
      where: { schoolId, sectionRef: { classId } }
    });

    if (students.length === 0) {
      res.status(400).json({ success: false, error: "No students found in this class to bill" });
      return;
    }

    // Determine target Ledger Accounts for Double Entry
    // Usually defined globally or per-category. For this implementation, we will query standard system accounts.
    const receivableAccount = await prisma.ledgerAccount.findFirst({
      where: { schoolId, category: "ASSET", code: "1200" } // 1200 = Standard Accounts Receivable
    });
    const revenueAccount = await prisma.ledgerAccount.findFirst({
      where: { schoolId, category: "REVENUE", code: "4000" } // 4000 = Standard Tuition Revenue
    });

    if (!receivableAccount || !revenueAccount) {
      res.status(400).json({ success: false, error: "Missing required system ledger accounts (1200, 4000)" });
      return;
    }

    let invoicesGenerated = 0;

    // Process iteratively (in production, for thousands of students, use BullMQ worker)
    for (const student of students) {
      const result = await prisma.$transaction(async (tx: any) => {
        // Create Invoice
        const invoice = await tx.invoice.create({
          data: {
            schoolId,
            studentId: student.id,
            amount: structure.amount,
            remainingAmount: structure.amount,
            description: description || `${structure.category.name} Fee`,
            dueDate: dueDate ? new Date(dueDate) : new Date(),
            status: "PENDING",
            type: "MONTHLY",
          }
        });

        // Book the Ledger Transaction: Debit AR, Credit Revenue
        await LedgerEngine.postTransaction({
          schoolId,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          description: `Invoice Generation: ${student.name} - ${structure.category.name}`,
          createdBy: userId,
          entries: [
            {
              accountId: receivableAccount.id,
              debitAmount: structure.amount,
              creditAmount: 0,
              description: "Accounts Receivable",
            },
            {
              accountId: revenueAccount.id,
              debitAmount: 0,
              creditAmount: structure.amount,
              description: "Tuition Revenue",
            }
          ]
        });

        return invoice;
      });
      invoicesGenerated++;
    }

    logger.info({ classId, structureId, generated: invoicesGenerated }, "Mass Invoice Generation Completed");
    res.status(201).json({ success: true, message: `Successfully generated ${invoicesGenerated} invoices`, generated: invoicesGenerated });
  } catch (error: any) {
    logger.error({ error }, "Error generating mass invoices");
    res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

export default router;
