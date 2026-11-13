import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { AuthRequest, authenticate, requireRole, requireFinanceAdmin } from "../middleware/auth";
import logger from "../lib/logger";
import { toPaise, fromPaise } from "../lib/money";
import { LedgerService } from "../services/ledger.service";

const router = Router();

function resolveSchoolId(req: AuthRequest): string | null {
  const schoolId = req.user?.role === "SUPER_ADMIN" ? ((req.query.schoolId || req.body?.schoolId) as string || req.user?.schoolId) : req.user?.schoolId;
  return schoolId || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FEE CATEGORIES & STRUCTURES (Phase 2 Workstream 2A)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/v1/finance/fee-categories
router.get("/fee-categories", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const categories = await prisma.feeCategory.findMany({
      where: { schoolId },
      include: {
        _count: { select: { feeStructures: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: categories });
  } catch (e) {
    logger.error({ err: e }, "Get fee categories error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/finance/fee-categories
router.post("/fee-categories", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const { name, description } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, error: "Fee category name is required" });
      return;
    }

    const category = await prisma.feeCategory.upsert({
      where: { schoolId_name: { schoolId, name: name.trim() } },
      update: { description: description?.trim() || null },
      create: {
        schoolId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (e) {
    logger.error({ err: e }, "Create fee category error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/finance/fee-structures
router.get("/fee-structures", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const { classId, categoryId } = req.query as Record<string, string | undefined>;
    const where: Prisma.FeeStructureWhereInput = { schoolId };
    if (classId) where.classId = classId;
    if (categoryId) where.categoryId = categoryId;

    const structures = await prisma.feeStructure.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        classRef: { select: { id: true, name: true } },
      },
      orderBy: [{ classId: "asc" }, { createdAt: "desc" }],
    });

    res.json({ success: true, data: structures });
  } catch (e) {
    logger.error({ err: e }, "Get fee structures error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/finance/fee-structures
router.post("/fee-structures", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const { categoryId, classId, amount } = req.body;
    if (!categoryId || amount === undefined || amount === null) {
      res.status(400).json({ success: false, error: "categoryId and amount are required" });
      return;
    }

    const decimalAmount = new Prisma.Decimal(amount);
    if (decimalAmount.lt(0)) {
      res.status(400).json({ success: false, error: "Fee structure amount cannot be negative" });
      return;
    }

    // Verify category belongs to school
    const category = await prisma.feeCategory.findFirst({
      where: { id: categoryId, schoolId },
    });
    if (!category) {
      res.status(404).json({ success: false, error: "Fee category not found for this school" });
      return;
    }

    if (classId) {
      const cls = await prisma.class.findFirst({
        where: { id: classId, schoolId },
      });
      if (!cls) {
        res.status(404).json({ success: false, error: "Class not found for this school" });
        return;
      }
    }

    const structure = await prisma.feeStructure.create({
      data: {
        schoolId,
        categoryId,
        classId: classId || null,
        amount: decimalAmount,
      },
      include: {
        category: { select: { id: true, name: true } },
        classRef: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: structure });
  } catch (e) {
    logger.error({ err: e }, "Create fee structure error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/v1/finance/fee-structures/:id
router.delete("/fee-structures/:id", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const { id } = req.params;
    const existing = await prisma.feeStructure.findFirst({
      where: { id: id as string, schoolId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Fee structure not found" });
      return;
    }

    await prisma.feeStructure.delete({
      where: { id: id as string },
    });

    res.json({ success: true, message: "Fee structure deleted" });
  } catch (e) {
    logger.error({ err: e }, "Delete fee structure error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INVOICE GENERATION & DEFAULTERS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/defaulters
router.get("/defaulters", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const now = new Date();
    
    // Find all invoices that are overdue or pending but past due date
    const defaulters = await prisma.invoice.findMany({
      where: {
        schoolId,
        status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
        dueDate: { lt: now },
      },
      include: {
        student: {
          select: { name: true, guardian: true }
        }
      },
      orderBy: { dueDate: "asc" }
    });

    const enhancedDefaulters = defaulters.map(inv => {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24));
      return {
        ...inv,
        daysOverdue,
        remainingAmount: Number(inv.amount) + Number(inv.fineAmount) - Number(inv.amountPaid)
      };
    });

    res.json({ success: true, data: enhancedDefaulters });
  } catch (e) { 
    logger.error({ err: e }, "Get defaulters error");
    res.status(500).json({ success: false, error: "Server error" }); 
  }
});

// POST /api/finance/generate-monthly-fees
router.post("/generate-monthly-fees", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    // Fetch active students and fee structures
    const activeStudents = await prisma.student.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, sectionRef: { select: { classId: true } } }
    });

    const feeStructures = await prisma.feeStructure.findMany({
      where: { schoolId },
      include: { category: true }
    });

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const dueDate = new Date(currentYear, currentMonth, 10); // Due 10th of the month

    let count = 0;
    let autoSettledCreditsCount = 0;

    for (const student of activeStudents) {
      const matches = feeStructures.filter(fs => 
        fs.classId === student.sectionRef?.classId &&
        fs.category.name.toLowerCase().includes("monthly")
      );

      for (const structure of matches) {
        // Prevent duplicate generation for same month/category
        const existing = await prisma.invoice.findFirst({
          where: {
            studentId: student.id,
            type: "MONTHLY",
            dueDate: {
              gte: new Date(currentYear, currentMonth, 1),
              lt: new Date(currentYear, currentMonth + 1, 1)
            }
          }
        });

        if (!existing) {
          await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
            let invAmount = structure.amount;
            let amountPaid = new Prisma.Decimal(0);
            let remainingAmount = invAmount;
            let status: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
            let paidDate: Date | null = null;

            // Check for available StudentAdvanceCredit
            const activeCredit = await tx.studentAdvanceCredit.findFirst({
              where: {
                schoolId,
                studentId: student.id,
                status: "ACTIVE",
                remainingCredit: { gt: 0 },
              },
              orderBy: { createdAt: "asc" },
            });

            let allocatedCredit = new Prisma.Decimal(0);
            if (activeCredit) {
              const creditPaise = toPaise(activeCredit.remainingCredit);
              const invoicePaise = toPaise(invAmount);

              if (creditPaise >= invoicePaise) {
                // Fully settle invoice from credit
                allocatedCredit = invAmount;
                amountPaid = invAmount;
                remainingAmount = new Prisma.Decimal(0);
                status = "PAID";
                paidDate = new Date();

                const newRemainingCredit = fromPaise(creditPaise - invoicePaise);
                await tx.studentAdvanceCredit.update({
                  where: { id: activeCredit.id },
                  data: {
                    remainingCredit: newRemainingCredit,
                    status: newRemainingCredit.isZero() ? "EXHAUSTED" : "ACTIVE",
                  },
                });
              } else {
                // Partially settle invoice from credit
                allocatedCredit = activeCredit.remainingCredit;
                amountPaid = activeCredit.remainingCredit;
                remainingAmount = fromPaise(invoicePaise - creditPaise);
                status = "PARTIAL";

                await tx.studentAdvanceCredit.update({
                  where: { id: activeCredit.id },
                  data: {
                    remainingCredit: new Prisma.Decimal(0),
                    status: "EXHAUSTED",
                  },
                });
              }
              autoSettledCreditsCount++;
            }

            const createdInvoice = await tx.invoice.create({
              data: {
                studentId: student.id,
                schoolId,
                amount: invAmount,
                amountPaid,
                remainingAmount,
                fineAmount: new Prisma.Decimal(0),
                type: "MONTHLY",
                status,
                dueDate,
                paidDate,
                description: `Monthly Fee - ${new Date().toLocaleString('default', { month: 'long' })} ${currentYear}`
              }
            });

            // If credit was allocated, post double-entry ledger entry
            if (allocatedCredit.gt(0)) {
              const advAcc = await tx.ledgerAccount.findUnique({
                where: { schoolId_code: { schoolId, code: "2100-ADV" } },
              });
              const tuitAcc = await tx.ledgerAccount.findUnique({
                where: { schoolId_code: { schoolId, code: "4000-TUIT" } },
              });

              if (advAcc && tuitAcc) {
                await LedgerService.postTransaction(
                  {
                    schoolId,
                    referenceType: "INVOICE",
                    referenceId: createdInvoice.id,
                    sourceModule: "FEES",
                    description: `Advance Credit settlement for invoice ${createdInvoice.id}`,
                    postingDate: new Date(),
                    createdBy: req.user!.id,
                    entries: [
                      { accountId: advAcc.id, debitAmount: allocatedCredit, creditAmount: 0 },
                      { accountId: tuitAcc.id, debitAmount: 0, creditAmount: allocatedCredit },
                    ],
                  },
                  tx
                );
              }
            }
          });
          count++;
        }
      }
    }

    logger.info({ generatedCount: count, autoSettledCreditsCount, schoolId }, "Monthly fees generated");
    res.status(201).json({
      success: true,
      message: `Successfully generated ${count} monthly invoices (${autoSettledCreditsCount} settled via advance credits).`,
      generatedCount: count,
      autoSettledCreditsCount,
    });
  } catch (e) { 
    logger.error({ err: e }, "Generate monthly fees error");
    res.status(500).json({ success: false, error: "Server error" }); 
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL STATEMENTS & GENERAL LEDGER
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/finance/ledger/trial-balance
router.get("/ledger/trial-balance", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const accounts = await prisma.ledgerAccount.findMany({
      where: { schoolId },
      include: { LedgerEntry: { select: { debitAmount: true, creditAmount: true } } }
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const trialBalance = accounts.map(acc => {
      const db = acc.LedgerEntry.reduce((sum: number, e: any) => sum + Number(e.debitAmount), 0);
      const cr = acc.LedgerEntry.reduce((sum: number, e: any) => sum + Number(e.creditAmount), 0);
      
      const balance = Math.abs(db - cr);
      const balanceType = db >= cr ? "DEBIT" : "CREDIT";

      if (balanceType === "DEBIT") totalDebit += balance;
      else totalCredit += balance;

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        category: acc.category,
        debit: db >= cr ? balance : 0,
        credit: cr > db ? balance : 0
      };
    }).filter(a => a.debit > 0 || a.credit > 0);

    res.json({
      success: true,
      data: {
        accounts: trialBalance,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.001
      }
    });
  } catch(e) {
    logger.error({ err: e }, "Trial balance error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/finance/ledger/profit-loss
router.get("/ledger/profit-loss", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const accounts = await prisma.ledgerAccount.findMany({
      where: { schoolId, category: { in: ['REVENUE', 'EXPENSE'] } },
      include: { LedgerEntry: { select: { debitAmount: true, creditAmount: true } } }
    });

    let totalRevenue = 0;
    let totalExpense = 0;

    const pnlStatement = accounts.map(acc => {
      const totalDebits = acc.LedgerEntry.reduce((sum: number, e: any) => sum + Number(e.debitAmount), 0);
      const totalCredits = acc.LedgerEntry.reduce((sum: number, e: any) => sum + Number(e.creditAmount), 0);
      
      let balance = 0;
      if (acc.category === 'REVENUE') {
        balance = totalCredits - totalDebits; // Revenue has credit balance
        totalRevenue += balance;
      } else {
        balance = totalDebits - totalCredits; // Expense has debit balance
        totalExpense += balance;
      }

      return {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        balance
      };
    }).filter(a => a.balance !== 0);

    const netIncome = totalRevenue - totalExpense;

    res.json({
      success: true,
      data: {
        revenue: pnlStatement.filter(a => a.category === 'REVENUE'),
        expenses: pnlStatement.filter(a => a.category === 'EXPENSE'),
        totalRevenue,
        totalExpense,
        netIncome,
        isProfitable: netIncome >= 0
      }
    });
  } catch(e) {
    logger.error({ err: e }, "P&L error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/finance/ledger/balance-sheet
router.get("/ledger/balance-sheet", authenticate, requireFinanceAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) { res.status(400).json({ success: false, error: "School context is required" }); return; }

    const accounts = await prisma.ledgerAccount.findMany({
      where: { schoolId, category: { in: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] } },
      include: { LedgerEntry: { select: { debitAmount: true, creditAmount: true } } }
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpense = 0;

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    for (const acc of accounts) {
      const debits = acc.LedgerEntry.reduce((s, e) => s + Number(e.debitAmount), 0);
      const credits = acc.LedgerEntry.reduce((s, e) => s + Number(e.creditAmount), 0);

      if (acc.category === 'ASSET') {
        const net = debits - credits;
        if (net !== 0) {
          assets.push({ code: acc.code, name: acc.name, balance: net });
          totalAssets += net;
        }
      } else if (acc.category === 'LIABILITY') {
        const net = credits - debits;
        if (net !== 0) {
          liabilities.push({ code: acc.code, name: acc.name, balance: net });
          totalLiabilities += net;
        }
      } else if (acc.category === 'EQUITY') {
        const net = credits - debits;
        if (net !== 0) {
          equity.push({ code: acc.code, name: acc.name, balance: net });
          totalEquity += net;
        }
      } else if (acc.category === 'REVENUE') {
        totalRevenue += (credits - debits);
      } else if (acc.category === 'EXPENSE') {
        totalExpense += (debits - credits);
      }
    }

    const currentPeriodNetIncome = totalRevenue - totalExpense;
    const finalEquity = totalEquity + currentPeriodNetIncome;

    res.json({
      success: true,
      data: {
        assets: { items: assets, total: totalAssets },
        liabilities: { items: liabilities, total: totalLiabilities },
        equity: {
          items: equity,
          retainedEarnings: currentPeriodNetIncome,
          total: finalEquity
        },
        totalLiabilitiesAndEquity: totalLiabilities + finalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + finalEquity)) < 0.01,
      }
    });
  } catch (e) {
    logger.error({ err: e }, "Balance sheet error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
