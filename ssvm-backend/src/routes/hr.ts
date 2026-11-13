import { Router, Response } from "express";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireHRAdmin, requireTeacherOrAdmin } from "../middleware/auth";
import { parsePaginationParams, paginatedQuery } from "../lib/paginate";
import { LedgerService } from "../services/ledger.service";

const router = Router();

// ═══════════════════════════════
// SALARY MANAGEMENT
// ═══════════════════════════════

// GET /api/hr/salaries — List salaries
router.get("/salaries", authenticate, requireHRAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    const { month, year } = req.query;
    const paginationParams = parsePaginationParams(req.query, ['year', 'month', 'netPay']);

    const where: Record<string, unknown> = { schoolId };
    if (month) where.month = parseInt(month as string);
    if (year) where.year = parseInt(year as string);

    const result = await paginatedQuery(
      prisma.salary,
      where,
      { teacher: { include: { user: { select: { name: true, email: true } } } } },
      paginationParams
    );
    res.json(result);
  } catch (e) {
    logger.error({ err: e }, "List salaries error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/hr/salaries — Create salary entry
router.post("/salaries", authenticate, requireHRAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { teacherId, month, year, basicPay, allowances, deductions } = req.body;

    if (!teacherId || !month || !year || !basicPay) {
      res.status(400).json({ success: false, error: "Required: teacherId, month, year, basicPay" }); return;
    }

    const netPay = (basicPay || 0) + (allowances || 0) - (deductions || 0);

    const salary = await prisma.salary.upsert({
      where: { teacherId_month_year: { teacherId, month: parseInt(month), year: parseInt(year) } },
      update: { basicPay, allowances: allowances || 0, deductions: deductions || 0, netPay },
      create: { teacherId, schoolId: schoolId!, month: parseInt(month), year: parseInt(year), basicPay, allowances: allowances || 0, deductions: deductions || 0, netPay },
    });
    res.status(201).json({ success: true, data: salary });
  } catch (e) {
    logger.error({ err: e }, "Create salary error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/hr/payroll/generate — Generate payroll for all active teachers
router.post("/payroll/generate", authenticate, requireHRAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { month, year } = req.body;

    if (!month || !year) {
      res.status(400).json({ success: false, error: "Required: month, year" }); return;
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // 1. Get all active teachers
    const teachers = await prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      select: { id: true }
    });

    if (!teachers.length) {
      res.status(400).json({ success: false, error: "No active teachers found." }); return;
    }

    // Check if salaries are already generated for this month
    const existingSalaries = await prisma.salary.findFirst({
      where: { schoolId, month: m, year: y }
    });

    if (existingSalaries) {
      res.status(400).json({ success: false, error: "Payroll for this month has already been generated." }); return;
    }

    const workingDays = 22; // Typical working days
    const generatedSalaries = [];

    for (const teacher of teachers) {


      // Count absents
      const absents = await prisma.teacherAttendance.count({
        where: {
          teacherId: teacher.id,
          status: "ABSENT",
          date: {
            gte: new Date(y, m - 1, 1),
            lt: new Date(y, m, 1)
          }
        }
      });

      const allowedLeaves = 1;
      const unpaidLeaves = Math.max(0, absents - allowedLeaves);
      const baseSalary = 50000; // Mock default salary
      const dailyRate = baseSalary / workingDays;
      const deductions = unpaidLeaves * dailyRate;
      const allowances = baseSalary * 0.10; // e.g. 10% HRA
      const netPay = baseSalary + allowances - deductions;

      generatedSalaries.push({
        schoolId,
        teacherId: teacher.id,
        month: m,
        year: y,
        basicPay: baseSalary,
        allowances,
        deductions,
        netPay,
        status: "PENDING"
      });
    }

    await prisma.salary.createMany({
      data: generatedSalaries as any
    });

    logger.info({ schoolId, month: m, year: y, generated: generatedSalaries.length }, "Payroll generated");
    res.status(201).json({ success: true, message: `Generated payroll for ${generatedSalaries.length} teachers.` });

  } catch (e) {
    logger.error({ err: e }, "Generate payroll error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/hr/salaries/:id/pay — Mark salary as paid & post to General Ledger
router.put("/salaries/:id/pay", authenticate, requireHRAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const salaryId = req.params.id as string;
    const existing = await prisma.salary.findUnique({
      where: { id: salaryId },
      include: {
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Salary record not found" });
      return;
    }

    if (existing.status === "PAID") {
      res.status(400).json({ success: false, error: "Salary has already been marked as PAID" });
      return;
    }

    const schoolId = existing.schoolId;
    const paymentMode = req.body.paymentMode || "BANK"; // "BANK" or "CASH"
    const creditAccount = paymentMode === "CASH" ? "1020-CASH" : "1010-BANK";

    const updatedSalary = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const updated = await tx.salary.update({
        where: { id: salaryId },
        data: { status: "PAID", paidDate: new Date() },
      });

      // Post double-entry ledger entry: Debit 5010-SAL (Salaries Expense), Credit 1010-BANK/1020-CASH
      const payAmount = new Prisma.Decimal(existing.netPay || 0);
      if (payAmount.gt(0)) {
        const salAcc = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: "5010-SAL" } },
        });
        const creditAcc = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: creditAccount } },
        });

        if (salAcc && creditAcc) {
          await LedgerService.postTransaction(
            {
              schoolId,
              referenceType: "SALARY",
              referenceId: salaryId,
              sourceModule: "PAYROLL",
              description: `Salary payout for ${existing.teacher?.user?.name || "Teacher"} - ${existing.month}/${existing.year}`,
              postingDate: new Date(),
              createdBy: req.user!.id,
              entries: [
                { accountId: salAcc.id, debitAmount: payAmount, creditAmount: 0 },
                { accountId: creditAcc.id, debitAmount: 0, creditAmount: payAmount },
              ],
            },
            tx
          );
        }
      }

      return updated;
    });

    res.json({ success: true, data: updatedSalary });
  } catch (e) {
    logger.error({ err: e }, "Pay salary error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/hr/salaries/:id/payslip — Printable payslip HTML
router.get("/salaries/:id/payslip", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const salary = await prisma.salary.findUnique({
      where: { id: req.params.id as string },
      include: {
        teacher: { include: { user: { select: { name: true, email: true } } } },
        school: { select: { name: true, address: true, phone: true } },
      },
    });

    if (!salary) {
      res.status(404).json({ success: false, error: "Salary record not found" });
      return;
    }

    if (req.user!.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher || teacher.id !== salary.teacherId) {
        res.status(403).json({ success: false, error: "Can only view your own payslips" });
        return;
      }
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthStr = monthNames[(salary.month - 1) % 12] || String(salary.month);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payslip - ${salary.teacher?.user?.name || "Teacher"}</title>
  <style>
    body { font-family: sans-serif; padding: 40px; color: #1e293b; }
    .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 25px; }
    .title { font-size: 22px; font-weight: bold; color: #312e81; }
    .sub { font-size: 13px; color: #64748b; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th, td { padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; }
    .total-row { font-weight: bold; background: #eef2ff; font-size: 15px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #dcfce7; color: #15803d; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${salary.school?.name || "School ERP"}</div>
    <div class="sub">${salary.school?.address || ""} · Payslip for ${monthStr} ${salary.year}</div>
  </div>
  <div class="details">
    <div><strong>Employee Name:</strong> ${salary.teacher?.user?.name || "—"}</div>
    <div><strong>Email:</strong> ${salary.teacher?.user?.email || "—"}</div>
    <div><strong>Pay Period:</strong> ${monthStr} ${salary.year}</div>
    <div><strong>Status:</strong> <span class="status">${salary.status}</span></div>
  </div>
  <table>
    <thead><tr><th>Earnings & Deductions</th><th style="text-align: right;">Amount (INR)</th></tr></thead>
    <tbody>
      <tr><td>Basic Pay</td><td style="text-align: right;">₹${Number(salary.basicPay || 0).toLocaleString()}</td></tr>
      <tr><td>Allowances</td><td style="text-align: right;">+ ₹${Number(salary.allowances || 0).toLocaleString()}</td></tr>
      <tr><td>Deductions (Unpaid Leaves / Tax)</td><td style="text-align: right;">- ₹${Number(salary.deductions || 0).toLocaleString()}</td></tr>
      <tr class="total-row"><td>Net Salary Payable</td><td style="text-align: right;">₹${Number(salary.netPay || 0).toLocaleString()}</td></tr>
    </tbody>
  </table>
  <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
    <div>Generated on: ${new Date().toLocaleDateString("en-IN")}</div>
    <div>Authorized Signatory</div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (e) {
    logger.error({ err: e }, "Generate payslip error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/hr/payslips/:teacherId — Teacher: view own payslips
router.get("/payslips/:teacherId", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    // Teachers can only see their own payslips
    if (req.user!.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher || teacher.id !== req.params.teacherId) {
        res.status(403).json({ success: false, error: "Can only view your own payslips" }); return;
      }
    }

    const salaries = await prisma.salary.findMany({
      where: { teacherId: req.params.teacherId as string },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json({ success: true, data: salaries });
  } catch (e) {
    logger.error({ err: e }, "Payslips error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════
// LEAVE MANAGEMENT
// ═══════════════════════════════

// GET /api/hr/leaves — Leave requests list
router.get("/leaves", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    let where: Record<string, unknown> = {};

    if (req.user!.role === "TEACHER") {
      // Teachers see only their own
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) { res.status(404).json({ success: false, error: "Teacher profile not found" }); return; }
      where = { requesterId: teacher.id };
    } else {
      // Admin sees school's leaves
      const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
      if (schoolId) {
        where = { requester: { schoolId } };
      }
    }

    const { status } = req.query;
    const paginationParams = parsePaginationParams(req.query, ['createdAt', 'startDate']);
    if (status) where.status = status;

    const result = await paginatedQuery(
      prisma.leaveRequest,
      where,
      { requester: { include: { user: { select: { name: true } } } } },
      paginationParams
    );
    res.json(result);
  } catch (e) {
    logger.error({ err: e }, "List leaves error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/hr/leaves — Teacher: apply leave
router.post("/leaves", authenticate, requireTeacherOrAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    let requesterId: string;
    if (req.user!.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) { res.status(404).json({ success: false, error: "Teacher profile not found" }); return; }
      requesterId = teacher.id;
    } else {
      requesterId = req.body.requesterId;
    }

    if (!requesterId || !leaveType || !startDate || !endDate || !reason) {
      res.status(400).json({ success: false, error: "All fields required" }); return;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        requesterId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      },
    });
    res.status(201).json({ success: true, data: leave });
  } catch (e) {
    logger.error({ err: e }, "Apply leave error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/hr/leaves/:id — Admin: approve/reject
router.put("/leaves/:id", authenticate, requireHRAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { status, approverRemarks } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ success: false, error: "Status must be APPROVED or REJECTED" }); return;
    }

    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id as string },
      data: { status, approvedById: req.user!.id, approverRemarks },
    });
    res.json({ success: true, data: leave });
  } catch (e) {
    logger.error({ err: e }, "Update leave error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
