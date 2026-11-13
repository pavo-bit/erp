import { Prisma } from "@prisma/client";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { toPaise, fromPaise } from "../lib/money";
import { amountToWordsIndianRupees } from "../lib/amount-to-words";
import { LedgerService } from "./ledger.service";
import { seedDefaultChartOfAccounts } from "../lib/chartOfAccounts";
import logger from "../lib/logger";

export interface InvoiceAllocationItem {
  invoiceId: string;
  invoiceDescription: string;
  dueDate: Date;
  previousBalance: Prisma.Decimal;
  allocatedAmount: Prisma.Decimal;
  principalPaid: Prisma.Decimal;
  finePaid: Prisma.Decimal;
  remainingBalance: Prisma.Decimal;
  newStatus: "PAID" | "PARTIAL";
}

export interface AllocationPreviewResult {
  totalReceived: Prisma.Decimal;
  totalAllocated: Prisma.Decimal;
  advanceCreditAmount: Prisma.Decimal;
  allocations: InvoiceAllocationItem[];
  amountInWords: string;
}

export interface RecordCashPaymentInput {
  studentId: string;
  amountReceived: number | string | Prisma.Decimal;
  paymentMethod: "CASH" | "CHEQUE" | "DD" | "COUNTER_UPI" | "BANK_TRANSFER";
  selectedInvoiceIds?: string[];
  allocationStrategy?: "OLDEST_FIRST" | "MANUAL";
  manualAllocations?: { invoiceId: string; amount: number | string | Prisma.Decimal }[];
  instrumentNo?: string;
  instrumentDate?: Date | string;
  issuingBank?: string;
  pendingClearance?: boolean;
  remarks?: string;
}

export class CashCollectionService {
  /**
   * Search students for cashier collection desk
   */
  static async searchStudentsForCashier(schoolId: string, query: string) {
    const q = query.trim();
    if (!q) return [];

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { admissionNo: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { rollNo: { contains: q, mode: "insensitive" } },
          { guardian: { primaryName: { contains: q, mode: "insensitive" } } },
          { guardian: { primaryPhone: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        branch: { select: { id: true, name: true } },
        sectionRef: {
          select: {
            id: true,
            name: true,
            class: { select: { id: true, name: true } },
          },
        },
        guardian: { select: { id: true, primaryName: true, primaryPhone: true, primaryRelation: true } },
        invoices: {
          where: {
            status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
            isVoided: false,
            deletedAt: null,
          },
          select: {
            id: true,
            amount: true,
            fineAmount: true,
            amountPaid: true,
            remainingAmount: true,
            status: true,
            dueDate: true,
          },
        },
        advanceCredits: {
          where: { status: "ACTIVE" },
          select: { id: true, remainingCredit: true },
        },
      },
      take: 20,
    });

    return students.map((s) => {
      let totalDuePaise = 0;
      for (const inv of s.invoices) {
        const invDue = toPaise(inv.remainingAmount) > 0
          ? toPaise(inv.remainingAmount)
          : Math.max(0, toPaise(inv.amount) + toPaise(inv.fineAmount) - toPaise(inv.amountPaid));
        totalDuePaise += invDue;
      }

      const totalAdvancePaise = s.advanceCredits.reduce(
        (sum, cr) => sum + toPaise(cr.remainingCredit),
        0
      );

      return {
        id: s.id,
        admissionNo: s.admissionNo,
        name: s.name,
        rollNo: s.rollNo,
        gender: s.gender,
        branch: s.branch?.name || null,
        className: s.sectionRef?.class?.name || null,
        sectionName: s.sectionRef?.name || null,
        guardianName: s.guardian?.primaryName || null,
        guardianPhone: s.guardian?.primaryPhone || null,
        outstandingInvoiceCount: s.invoices.length,
        totalOutstanding: fromPaise(totalDuePaise),
        totalAdvanceCredit: fromPaise(totalAdvancePaise),
      };
    });
  }

  /**
   * Get student details and all outstanding invoices with accurate balances
   */
  static async getStudentOutstandingInvoices(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        school: { select: { id: true, name: true, code: true, address: true, phone: true, email: true, logo: true } },
        branch: { select: { id: true, name: true } },
        sectionRef: {
          select: {
            id: true,
            name: true,
            class: { select: { id: true, name: true } },
          },
        },
        guardian: { select: { id: true, primaryName: true, primaryPhone: true, primaryRelation: true } },
        advanceCredits: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) {
      throw new Error(`Student ${studentId} not found in school ${schoolId}`);
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        schoolId,
        status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        isVoided: false,
        deletedAt: null,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    const formattedInvoices = invoices.map((inv) => {
      const grossPaise = toPaise(inv.amount) + toPaise(inv.fineAmount);
      const paidPaise = toPaise(inv.amountPaid);
      const balancePaise = toPaise(inv.remainingAmount) > 0
        ? toPaise(inv.remainingAmount)
        : Math.max(0, grossPaise - paidPaise);

      return {
        id: inv.id,
        type: inv.type,
        description: inv.description || `${inv.type} Fee`,
        amount: inv.amount,
        fineAmount: inv.fineAmount,
        amountPaid: inv.amountPaid,
        remainingAmount: fromPaise(balancePaise),
        status: inv.status,
        dueDate: inv.dueDate,
        isOverdue: inv.isOverdue || new Date(inv.dueDate) < new Date(),
      };
    });

    const totalOutstandingPaise = formattedInvoices.reduce(
      (sum, inv) => sum + toPaise(inv.remainingAmount),
      0
    );

    const totalAdvancePaise = student.advanceCredits.reduce(
      (sum, cr) => sum + toPaise(cr.remainingCredit),
      0
    );

    return {
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: student.name,
        rollNo: student.rollNo,
        branch: student.branch?.name || null,
        className: student.sectionRef?.class?.name || null,
        sectionName: student.sectionRef?.name || null,
        guardianName: student.guardian?.primaryName || null,
        guardianPhone: student.guardian?.primaryPhone || null,
        schoolName: student.school.name,
      },
      invoices: formattedInvoices,
      totalOutstanding: fromPaise(totalOutstandingPaise),
      totalAdvanceCredit: fromPaise(totalAdvancePaise),
    };
  }

  /**
   * Deterministic calculation of invoice allocations and advance credits
   */
  static previewAllocation(params: {
    invoices: {
      id: string;
      description?: string | null;
      type?: string;
      amount: Prisma.Decimal | number;
      fineAmount: Prisma.Decimal | number;
      amountPaid: Prisma.Decimal | number;
      remainingAmount: Prisma.Decimal | number;
      dueDate: Date;
    }[];
    amountReceived: number | string | Prisma.Decimal;
    selectedInvoiceIds?: string[];
    allocationStrategy?: "OLDEST_FIRST" | "MANUAL";
    manualAllocations?: { invoiceId: string; amount: number | string | Prisma.Decimal }[];
  }): AllocationPreviewResult {
    const receivedPaise = toPaise(params.amountReceived);
    if (receivedPaise <= 0) {
      throw new Error("Amount received must be greater than zero");
    }

    // Filter to selected invoices if provided
    let targetInvoices = params.invoices;
    if (params.selectedInvoiceIds && params.selectedInvoiceIds.length > 0) {
      const selectedSet = new Set(params.selectedInvoiceIds);
      targetInvoices = targetInvoices.filter((inv) => selectedSet.has(inv.id));
      if (targetInvoices.length === 0) {
        throw new Error("None of the selected invoices were found");
      }
    }

    // Sort oldest due date first
    targetInvoices = [...targetInvoices].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    const allocations: InvoiceAllocationItem[] = [];
    let unallocatedPaise = receivedPaise;
    let totalAllocatedPaise = 0;

    if (params.allocationStrategy === "MANUAL" && params.manualAllocations) {
      const manualMap = new Map(
        params.manualAllocations.map((m) => [m.invoiceId, toPaise(m.amount)])
      );

      for (const inv of targetInvoices) {
        const reqPaise = manualMap.get(inv.id) || 0;
        if (reqPaise <= 0) continue;

        const prevBalancePaise = toPaise(inv.remainingAmount) > 0
          ? toPaise(inv.remainingAmount)
          : Math.max(0, toPaise(inv.amount) + toPaise(inv.fineAmount) - toPaise(inv.amountPaid));

        if (reqPaise > prevBalancePaise) {
          throw new Error(
            `Manual allocation for invoice ${inv.id} (${fromPaise(reqPaise)}) exceeds remaining balance (${fromPaise(prevBalancePaise)})`
          );
        }

        if (reqPaise > unallocatedPaise) {
          throw new Error("Sum of manual allocations exceeds total amount received");
        }

        const fineDuePaise = toPaise(inv.fineAmount);
        const finePaidPaise = Math.min(reqPaise, fineDuePaise);
        const principalPaidPaise = reqPaise - finePaidPaise;
        const remainingPaise = prevBalancePaise - reqPaise;

        allocations.push({
          invoiceId: inv.id,
          invoiceDescription: inv.description || `${inv.type || "Fee"} Invoice`,
          dueDate: inv.dueDate,
          previousBalance: fromPaise(prevBalancePaise),
          allocatedAmount: fromPaise(reqPaise),
          principalPaid: fromPaise(principalPaidPaise),
          finePaid: fromPaise(finePaidPaise),
          remainingBalance: fromPaise(remainingPaise),
          newStatus: remainingPaise === 0 ? "PAID" : "PARTIAL",
        });

        unallocatedPaise -= reqPaise;
        totalAllocatedPaise += reqPaise;
      }
    } else {
      // Default: OLDEST_FIRST
      for (const inv of targetInvoices) {
        if (unallocatedPaise <= 0) break;

        const prevBalancePaise = toPaise(inv.remainingAmount) > 0
          ? toPaise(inv.remainingAmount)
          : Math.max(0, toPaise(inv.amount) + toPaise(inv.fineAmount) - toPaise(inv.amountPaid));

        if (prevBalancePaise <= 0) continue;

        const allocPaise = Math.min(unallocatedPaise, prevBalancePaise);
        const fineDuePaise = toPaise(inv.fineAmount);
        const finePaidPaise = Math.min(allocPaise, fineDuePaise);
        const principalPaidPaise = allocPaise - finePaidPaise;
        const remainingPaise = prevBalancePaise - allocPaise;

        allocations.push({
          invoiceId: inv.id,
          invoiceDescription: inv.description || `${inv.type || "Fee"} Invoice`,
          dueDate: inv.dueDate,
          previousBalance: fromPaise(prevBalancePaise),
          allocatedAmount: fromPaise(allocPaise),
          principalPaid: fromPaise(principalPaidPaise),
          finePaid: fromPaise(finePaidPaise),
          remainingBalance: fromPaise(remainingPaise),
          newStatus: remainingPaise === 0 ? "PAID" : "PARTIAL",
        });

        unallocatedPaise -= allocPaise;
        totalAllocatedPaise += allocPaise;
      }
    }

    const advanceCreditPaise = unallocatedPaise;

    return {
      totalReceived: fromPaise(receivedPaise),
      totalAllocated: fromPaise(totalAllocatedPaise),
      advanceCreditAmount: fromPaise(advanceCreditPaise),
      allocations,
      amountInWords: amountToWordsIndianRupees(fromPaise(receivedPaise)),
    };
  }

  /**
   * Record Cash/Offline payment atomically with RLS, Ledger, and sequential receipt
   */
  static async recordCashPayment(
    schoolId: string,
    cashierUser: { id: string; name: string },
    payload: RecordCashPaymentInput
  ) {
    return runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // 1. Verify Student
      const student = await tx.student.findFirst({
        where: { id: payload.studentId, schoolId },
        include: {
          school: true,
          branch: true,
          sectionRef: {
            include: {
              class: true,
            },
          },
          guardian: true,
        },
      });

      if (!student) {
        throw new Error(`Student ${payload.studentId} not found in school ${schoolId}`);
      }

      // 2. Fetch and Lock Invoices
      const invoices = await tx.invoice.findMany({
        where: {
          studentId: payload.studentId,
          schoolId,
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          isVoided: false,
          deletedAt: null,
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      });

      // 3. Compute Allocation Preview
      const preview = this.previewAllocation({
        invoices,
        amountReceived: payload.amountReceived,
        selectedInvoiceIds: payload.selectedInvoiceIds,
        allocationStrategy: payload.allocationStrategy,
        manualAllocations: payload.manualAllocations,
      });

      if (preview.allocations.length === 0 && toPaise(preview.advanceCreditAmount) === 0) {
        throw new Error("No invoices allocated and no advance credit generated");
      }

      // 4. Generate Sequential Receipt Number
      const counter = await tx.sequenceCounter.upsert({
        where: { schoolId_key: { schoolId, key: "FEE_RECEIPT" } },
        update: { currentValue: { increment: 1 } },
        create: { schoolId, key: "FEE_RECEIPT", currentValue: 1 },
      });
      const currentYear = new Date().getFullYear();
      const receiptNumber = `REC-${currentYear}-${String(counter.currentValue).padStart(6, "0")}`;

      // 5. Create PaymentTransaction (using primary invoice or first allocated invoice)
      const primaryInvoiceId = preview.allocations.length > 0
        ? preview.allocations[0].invoiceId
        : (invoices[0]?.id || "");

      if (!primaryInvoiceId) {
        throw new Error("At least one invoice must exist to attach payment transaction");
      }

      const paymentTx = await tx.paymentTransaction.create({
        data: {
          schoolId,
          invoiceId: primaryInvoiceId,
          amountPaid: preview.totalReceived,
          gateway: payload.paymentMethod || "CASH",
          transactionId: payload.instrumentNo || `CASH-${Date.now()}-${counter.currentValue}`,
          status: payload.paymentMethod === "CHEQUE" && payload.pendingClearance
            ? "PENDING_CLEARANCE"
            : "SUCCESS",
          paidAt: new Date(),
          receiptNo: receiptNumber,
        },
      });

      // 6. Freeze Metadata Snapshot
      const metadataSnapshot = {
        school: {
          name: student.school.name,
          code: student.school.code,
          address: student.school.address,
          phone: student.school.phone,
          email: student.school.email,
        },
        student: {
          id: student.id,
          admissionNo: student.admissionNo,
          name: student.name,
          rollNo: student.rollNo,
          className: student.sectionRef?.class?.name || null,
          sectionName: student.sectionRef?.name || null,
          branchName: student.branch?.name || null,
          guardianName: student.guardian?.primaryName || null,
          guardianPhone: student.guardian?.primaryPhone || null,
        },
        payment: {
          method: payload.paymentMethod,
          instrumentNo: payload.instrumentNo || null,
          instrumentDate: payload.instrumentDate || null,
          issuingBank: payload.issuingBank || null,
          amountReceived: preview.totalReceived.toString(),
          totalAllocated: preview.totalAllocated.toString(),
          advanceCreditAmount: preview.advanceCreditAmount.toString(),
          amountInWords: preview.amountInWords,
        },
        allocations: preview.allocations.map((a) => ({
          invoiceId: a.invoiceId,
          description: a.invoiceDescription,
          dueDate: a.dueDate,
          previousBalance: a.previousBalance.toString(),
          allocatedAmount: a.allocatedAmount.toString(),
          principalPaid: a.principalPaid.toString(),
          finePaid: a.finePaid.toString(),
          remainingBalance: a.remainingBalance.toString(),
          newStatus: a.newStatus,
        })),
      };

      // 7. Create FeeReceipt
      const feeReceipt = await tx.feeReceipt.create({
        data: {
          schoolId,
          studentId: student.id,
          receiptNo: receiptNumber,
          paymentTransactionId: paymentTx.id,
          totalAmount: preview.totalReceived,
          paymentMethod: payload.paymentMethod,
          cashierId: cashierUser.id,
          cashierName: cashierUser.name,
          instrumentNo: payload.instrumentNo || null,
          instrumentDate: payload.instrumentDate ? new Date(payload.instrumentDate) : null,
          issuingBank: payload.issuingBank || null,
          status: paymentTx.status === "PENDING_CLEARANCE" ? "PENDING_CLEARANCE" : "COMPLETED",
          paidAt: new Date(),
          metadataSnapshot,
        },
      });

      // 8. Create PaymentAllocations and Update Invoices
      for (const alloc of preview.allocations) {
        await tx.paymentAllocation.create({
          data: {
            schoolId,
            receiptId: feeReceipt.id,
            paymentTransactionId: paymentTx.id,
            invoiceId: alloc.invoiceId,
            allocatedAmount: alloc.allocatedAmount,
            principalPaid: alloc.principalPaid,
            finePaid: alloc.finePaid,
            previousBalance: alloc.previousBalance,
            remainingBalance: alloc.remainingBalance,
          },
        });

        // Update Invoice
        const inv = invoices.find((i) => i.id === alloc.invoiceId)!;
        const newPaidPaise = toPaise(inv.amountPaid) + toPaise(alloc.allocatedAmount);
        await tx.invoice.update({
          where: { id: alloc.invoiceId, schoolId },
          data: {
            amountPaid: fromPaise(newPaidPaise),
            remainingAmount: alloc.remainingBalance,
            status: alloc.newStatus,
            paidDate: alloc.newStatus === "PAID" ? new Date() : inv.paidDate,
          },
        });
      }

      // 9. If Excess Amount: Create StudentAdvanceCredit
      let createdAdvanceCredit = null;
      if (toPaise(preview.advanceCreditAmount) > 0) {
        createdAdvanceCredit = await tx.studentAdvanceCredit.create({
          data: {
            schoolId,
            studentId: student.id,
            amount: preview.advanceCreditAmount,
            remainingCredit: preview.advanceCreditAmount,
            sourceReceiptNo: receiptNumber,
            status: "ACTIVE",
          },
        });
      }

      // 10. Update StudentFinancialProjection
      const currentProjection = await tx.studentFinancialProjection.findUnique({
        where: { studentId: student.id },
      });
      if (currentProjection) {
        await tx.studentFinancialProjection.update({
          where: { studentId: student.id },
          data: {
            totalPaid: currentProjection.totalPaid + toPaise(preview.totalAllocated) / 100,
            outstanding: Math.max(
              0,
              currentProjection.outstanding - toPaise(preview.totalAllocated) / 100
            ),
          },
        });
      }

      // 11. General Ledger Double-Entry Posting
      // Asset Account (Debit)
      const isCash = payload.paymentMethod === "CASH" || payload.paymentMethod === "CHEQUE";
      const debitAccountCode = isCash ? "1020-CASH" : "1010-BANK";
      let debitAccount = await tx.ledgerAccount.findUnique({
        where: { schoolId_code: { schoolId, code: debitAccountCode } },
      });

      // Revenue / Receivable Account (Credit)
      let revenueAccount = await tx.ledgerAccount.findUnique({
        where: { schoolId_code: { schoolId, code: "4000-TUIT" } },
      });
      if (!revenueAccount) {
        revenueAccount = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: "1200-AR" } },
        });
      }

      // Advance Deposit Account (Credit for excess amount)
      let advanceAccount = await tx.ledgerAccount.findUnique({
        where: { schoolId_code: { schoolId, code: "2100-ADV" } },
      });

      if (!debitAccount || !revenueAccount || !advanceAccount) {
        await seedDefaultChartOfAccounts(tx, schoolId);
        debitAccount = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: debitAccountCode } },
        });
        revenueAccount = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: "4000-TUIT" } },
        }) || await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: "1200-AR" } },
        });
        advanceAccount = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: "2100-ADV" } },
        });
      }

      if (debitAccount && revenueAccount) {
        const ledgerEntries = [];

        // Debit Cash / Bank for total amount
        ledgerEntries.push({
          accountId: debitAccount.id,
          debitAmount: preview.totalReceived,
          creditAmount: 0,
          description: `Fee collection (${payload.paymentMethod}) for student ${student.admissionNo} - Receipt ${receiptNumber}`,
        });

        // Credit Revenue / AR for allocated amount
        if (toPaise(preview.totalAllocated) > 0) {
          ledgerEntries.push({
            accountId: revenueAccount.id,
            debitAmount: 0,
            creditAmount: preview.totalAllocated,
            description: `Tuition fee revenue allocated from Receipt ${receiptNumber}`,
          });
        }

        // Credit Advance Fee Liability for excess amount
        if (toPaise(preview.advanceCreditAmount) > 0 && advanceAccount) {
          ledgerEntries.push({
            accountId: advanceAccount.id,
            debitAmount: 0,
            creditAmount: preview.advanceCreditAmount,
            description: `Advance fee credit deposited from Receipt ${receiptNumber}`,
          });
        }

        // Double entry check: sum(debits) === sum(credits)
        await LedgerService.postTransaction(
          {
            schoolId,
            referenceType: "PAYMENT",
            referenceId: feeReceipt.id,
            sourceModule: "FEES",
            description: `Offline fee receipt ${receiptNumber} collected by ${cashierUser.name}`,
            postingDate: new Date(),
            createdBy: cashierUser.id,
            entries: ledgerEntries,
          },
          tx
        );
      }

      return {
        receipt: feeReceipt,
        allocations: preview.allocations,
        advanceCredit: createdAdvanceCredit,
        paymentTransaction: paymentTx,
      };
    });
  }

  /**
   * Fetch official receipt by ID
   */
  static async getReceiptById(schoolId: string, receiptId: string) {
    const receipt = await prisma.feeReceipt.findFirst({
      where: { id: receiptId, schoolId },
      include: {
        student: {
          include: {
            branch: true,
            sectionRef: { include: { class: true } },
            guardian: true,
          },
        },
        school: true,
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new Error(`Receipt ${receiptId} not found in school ${schoolId}`);
    }

    return receipt;
  }

  /**
   * Reprint receipt: increments reprintCount, logs audit and marks duplicate
   */
  static async reprintReceipt(
    schoolId: string,
    receiptId: string,
    cashierUser: { id: string; name: string }
  ) {
    return runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const receipt = await tx.feeReceipt.findFirst({
        where: { id: receiptId, schoolId },
        include: {
          student: true,
          school: true,
          allocations: { include: { invoice: true } },
        },
      });

      if (!receipt) {
        throw new Error(`Receipt ${receiptId} not found in school ${schoolId}`);
      }

      const updated = await tx.feeReceipt.update({
        where: { id: receiptId, schoolId },
        data: {
          reprintCount: { increment: 1 },
          lastReprintedAt: new Date(),
          lastReprintedById: cashierUser.id,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: cashierUser.id,
          action: "REPRINT",
          entity: "FeeReceipt",
          entityId: receipt.id,
          details: JSON.stringify({
            receiptNo: receipt.receiptNo,
            reprintCount: updated.reprintCount,
            cashierName: cashierUser.name,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return {
        ...receipt,
        reprintCount: updated.reprintCount,
        lastReprintedAt: updated.lastReprintedAt,
        lastReprintedById: updated.lastReprintedById,
      };
    });
  }

  /**
   * Daily Cash Register / Cashier Shift Report
   */
  static async getDailyCashRegister(schoolId: string, options?: { date?: string; cashierId?: string }) {
    const targetDate = options?.date ? new Date(options.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const whereClause: Prisma.FeeReceiptWhereInput = {
      schoolId,
      paidAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (options?.cashierId) {
      whereClause.cashierId = options.cashierId;
    }

    const receipts = await prisma.feeReceipt.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, admissionNo: true, name: true, rollNo: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    let totalCollectedPaise = 0;
    const byPaymentMethod: Record<string, number> = {
      CASH: 0,
      CHEQUE: 0,
      DD: 0,
      COUNTER_UPI: 0,
      BANK_TRANSFER: 0,
    };
    const cashierMap = new Map<string, { cashierId: string; cashierName: string; totalPaise: number; count: number }>();

    for (const r of receipts) {
      const amtPaise = toPaise(r.totalAmount);
      totalCollectedPaise += amtPaise;

      const method = r.paymentMethod || "CASH";
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + amtPaise;

      const c = cashierMap.get(r.cashierId) || {
        cashierId: r.cashierId,
        cashierName: r.cashierName,
        totalPaise: 0,
        count: 0,
      };
      c.totalPaise += amtPaise;
      c.count += 1;
      cashierMap.set(r.cashierId, c);
    }

    const methodSummary = Object.fromEntries(
      Object.entries(byPaymentMethod).map(([k, v]) => [k, fromPaise(v)])
    );

    const cashierSummary = Array.from(cashierMap.values()).map((c) => ({
      cashierId: c.cashierId,
      cashierName: c.cashierName,
      totalCollected: fromPaise(c.totalPaise),
      receiptCount: c.count,
    }));

    return {
      date: startOfDay.toISOString().split("T")[0],
      totalCollected: fromPaise(totalCollectedPaise),
      receiptCount: receipts.length,
      byPaymentMethod: methodSummary,
      byCashier: cashierSummary,
      receipts: receipts.map((r) => ({
        id: r.id,
        receiptNo: r.receiptNo,
        studentName: r.student.name,
        admissionNo: r.student.admissionNo,
        totalAmount: r.totalAmount,
        paymentMethod: r.paymentMethod,
        cashierName: r.cashierName,
        paidAt: r.paidAt,
        reprintCount: r.reprintCount,
        isCancelled: r.isCancelled,
      })),
    };
  }
}
