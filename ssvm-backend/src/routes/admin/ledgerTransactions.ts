import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import { LedgerEngine } from "../../lib/ledgerEngine";

const router = Router();

const requireFinanceRole = requireRole("SUPER_ADMIN", "FINANCE_ADMIN");

// GET /api/v1/admin/ledger/transactions
router.get("/", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const transactions = await prisma.ledgerTransaction.findMany({
      where: { schoolId },
      include: {
        LedgerEntry: {
          include: { LedgerAccount: { select: { name: true, code: true } } }
        }
      },
      orderBy: { postingDate: "desc" },
      take: 100, // Limit for performance
    });
    res.json({ success: true, transactions });
  } catch (error) {
    logger.error({ error }, "Error fetching ledger transactions");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/ledger/transactions - Manual Journal Entry
router.post("/", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const { referenceType, referenceId, description, entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      res.status(400).json({ success: false, error: "At least two entries (one debit, one credit) are required" });
      return;
    }

    const tx = await LedgerEngine.postTransaction({
      schoolId,
      referenceType: referenceType || "INVOICE", // Default fallback if not provided
      referenceId: referenceId || "MANUAL-JRNL",
      description,
      entries,
      createdBy: userId,
    });

    res.status(201).json({ success: true, transaction: tx });
  } catch (error: any) {
    logger.error({ error }, "Error posting manual journal entry");
    res.status(400).json({ success: false, error: error.message || "Server error" });
  }
});

// GET /api/v1/admin/ledger/balance - Trial Balance Report
router.get("/balance", authenticate, requireFinanceRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // Aggregate sum of Debits and Credits grouping by accountId
    const balances = await prisma.ledgerEntry.groupBy({
      by: ['accountId'],
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
      where: {
        LedgerTransaction: { schoolId, status: "POSTED" },
      }
    });

    // Enhance with Account Names and Categories
    const accountIds = balances.map(b => b.accountId);
    const accounts = await prisma.ledgerAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, code: true, name: true, category: true },
    });

    const trialBalance = balances.map(balance => {
      const account = accounts.find(a => a.id === balance.accountId);
      const totalDebit = Number(balance._sum.debitAmount || 0);
      const totalCredit = Number(balance._sum.creditAmount || 0);
      
      // Calculate net balance depending on account type (Asset/Expense = DR, Liab/Eq/Rev = CR)
      let netBalance = 0;
      let normalBalance = "DR";

      if (account?.category === "ASSET" || account?.category === "EXPENSE") {
        netBalance = totalDebit - totalCredit;
        normalBalance = "DR";
      } else {
        netBalance = totalCredit - totalDebit;
        normalBalance = "CR";
      }

      return {
        account: account ? `${account.code} - ${account.name}` : "Unknown Account",
        category: account?.category,
        totalDebit,
        totalCredit,
        netBalance,
        normalBalance,
      };
    });

    // Check overarching math
    const systemTotalDebit = trialBalance.reduce((acc, curr) => acc + curr.totalDebit, 0);
    const systemTotalCredit = trialBalance.reduce((acc, curr) => acc + curr.totalCredit, 0);

    res.json({
      success: true,
      trialBalance,
      totals: {
        systemTotalDebit,
        systemTotalCredit,
        isBalanced: Math.round(systemTotalDebit * 100) === Math.round(systemTotalCredit * 100)
      }
    });
  } catch (error) {
    logger.error({ error }, "Error generating Trial Balance");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
