import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import { LedgerEngine } from "../../lib/ledgerEngine";

const router = Router();

// Allow Finance Admins and HR Admins (or Super Admins)
const requirePayrollRole = requireRole("SUPER_ADMIN", "FINANCE_ADMIN", "HR_ADMIN");

// POST /api/v1/admin/payroll/generate
// Mass generate salaries for all active teachers for a given month/year
router.post("/generate", authenticate, requirePayrollRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { month, year } = req.body;

    if (!month || !year) {
      res.status(400).json({ success: false, error: "Month and Year are required" });
      return;
    }

    // Ensure we don't duplicate generation
    const existing = await prisma.salary.findFirst({
      where: { schoolId, month: Number(month), year: Number(year) }
    });

    if (existing) {
      res.status(400).json({ success: false, error: `Payroll for ${month}/${year} has already been generated.` });
      return;
    }

    // Fetch all active teachers (assuming a basic join to Users to check isActive, or we'll just pull all teachers)
    // In a real app we'd have a basicPay field on Teacher, but here we'll define a standard payload.
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: { user: true }
    });

    if (teachers.length === 0) {
      res.status(400).json({ success: false, error: "No active teachers found." });
      return;
    }

    let generatedCount = 0;

    await prisma.$transaction(async (tx: any) => {
      for (const teacher of teachers) {
        // Mock payroll calculation (Standardize 50,000 INR basic pay)
        // In enterprise, this reads from Teacher.basicPay, subtracts unpaid leave using TeacherAttendance, etc.
        const basicPay = 50000;
        const allowances = 5000;
        const deductions = 2000; // e.g. PF or Tax
        const netPay = basicPay + allowances - deductions;

        await tx.salary.create({
          data: {
            schoolId,
            teacherId: teacher.id,
            month: Number(month),
            year: Number(year),
            basicPay,
            allowances,
            deductions,
            netPay,
            status: "PENDING",
            remarks: "System Generated",
          }
        });
        generatedCount++;
      }
    });

    logger.info({ month, year, generated: generatedCount }, "Mass Payroll Generation Completed");
    res.status(201).json({ success: true, message: `Successfully generated ${generatedCount} salary records`, generatedCount });
  } catch (error: any) {
    logger.error({ error }, "Error generating payroll");
    res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

// POST /api/v1/admin/payroll/:id/disburse
// Disburse a specific salary and link to Ledger
router.post("/:id/disburse", authenticate, requirePayrollRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const salaryId = req.params.id as string;

    const salary = await prisma.salary.findFirst({
      where: { id: salaryId, schoolId },
      include: { teacher: { include: { user: true } } }
    });

    if (!salary) {
      res.status(404).json({ success: false, error: "Salary record not found" });
      return;
    }

    if (salary.status === "PAID") {
      res.status(400).json({ success: false, error: "Salary has already been disbursed." });
      return;
    }

    // System Accounts mapping (5000: Salary Expense, 1000: Cash/Bank)
    const expenseAccount = await prisma.ledgerAccount.findFirst({
      where: { schoolId, category: "EXPENSE", code: "5000" }
    });
    const bankAccount = await prisma.ledgerAccount.findFirst({
      where: { schoolId, category: "ASSET", code: "1000" } 
    });

    if (!expenseAccount || !bankAccount) {
      res.status(500).json({ success: false, error: "Missing required ledger accounts (1000, 5000) for payroll" });
      return;
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Update Salary Status
      await tx.salary.update({
        where: { id: salaryId },
        data: {
          status: "PAID",
          paidDate: new Date()
        }
      });

      // 2. Post to Double-Entry Ledger: Debit Salary Expense, Credit Bank
      await LedgerEngine.postTransaction({
        schoolId,
        referenceType: "SALARY",
        referenceId: salary.id,
        description: `Salary Disbursement: ${salary.teacher.user.name} for ${salary.month}/${salary.year}`,
        createdBy: userId,
        entries: [
          {
            accountId: expenseAccount.id,
            debitAmount: salary.netPay,
            creditAmount: 0,
            description: "Staff Salary Expense",
          },
          {
            accountId: bankAccount.id,
            debitAmount: 0,
            creditAmount: salary.netPay,
            description: "Cash/Bank Outflow",
          }
        ]
      });
    });

    logger.info({ salaryId }, "Salary disbursed and booked to Ledger");
    res.status(200).json({ success: true, message: "Salary successfully disbursed and ledger updated." });
  } catch (error: any) {
    logger.error({ error }, "Error disbursing salary");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/admin/payroll
// Fetch payroll records with filtering
router.get("/", authenticate, requirePayrollRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { month, year, status } = req.query;

    const filters: any = { schoolId };
    if (month) filters.month = Number(month);
    if (year) filters.year = Number(year);
    if (status) filters.status = status;

    const salaries = await prisma.salary.findMany({
      where: filters,
      include: {
        teacher: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });

    res.json({ success: true, salaries });
  } catch (error) {
    logger.error({ error }, "Error fetching salaries");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
