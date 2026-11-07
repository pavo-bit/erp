import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from "../helpers/testApp";
import { toPaise, fromPaise } from "../../lib/money";
import { amountToWordsIndianRupees } from "../../lib/amount-to-words";

const app = createTestApp();
const prisma = getTestPrisma();

describe("Phase 2 Addendum: Manual Cash Collection, Offline Payments & Official PDF Receipts", () => {
  const uid = Math.random().toString(36).substring(2, 7);

  let schoolAId: string;
  let schoolBId: string;

  let adminAToken: string;
  let accountantAToken: string;
  let teacherAToken: string;

  let studentA1Id: string;
  let studentA2Id: string;
  let studentB1Id: string;

  let invoiceA1Id: string;
  let invoiceA2Id: string;
  let invoiceA3Id: string;
  let invoiceB1Id: string;

  let issuedReceiptId: string;
  let issuedReceiptNo: string;

  beforeAll(async () => {
    // 1. Schools
    const schoolA = await createTestSchool();
    const schoolB = await createTestSchool();
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    // 2. Users (Roles)
    const adminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    adminAToken = adminA.token;

    const accountantA = await createTestUser(Role.ACCOUNTANT, schoolAId);
    accountantAToken = accountantA.token;

    const teacherA = await createTestUser(Role.TEACHER, schoolAId);
    teacherAToken = teacherA.token;

    // 3. Students
    const guardianA1 = await prisma.guardian.create({
      data: {
        schoolId: schoolAId,
        primaryName: `Rajesh Sharma-${uid}`,
        primaryPhone: "9876543210",
        primaryRelation: "Father",
      },
    });

    const studentA1 = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        rollNo: `R-101-${uid}`,
        admissionNo: `ADM-101-${uid}`,
        name: `Aarav Sharma-${uid}`,
        guardianId: guardianA1.id,
      },
    });
    studentA1Id = studentA1.id;

    const guardianA2 = await prisma.guardian.create({
      data: {
        schoolId: schoolAId,
        primaryName: `Suresh Patel-${uid}`,
        primaryPhone: "9876543211",
        primaryRelation: "Father",
      },
    });

    const studentA2 = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        rollNo: `R-102-${uid}`,
        admissionNo: `ADM-102-${uid}`,
        name: `Diya Patel-${uid}`,
        guardianId: guardianA2.id,
      },
    });
    studentA2Id = studentA2.id;

    const studentB1 = await prisma.student.create({
      data: {
        schoolId: schoolBId,
        rollNo: `R-B01-${uid}`,
        admissionNo: `ADM-B01-${uid}`,
        name: `Tenant B Student-${uid}`,
      },
    });
    studentB1Id = studentB1.id;

    // 4. Invoices
    // Student A1 has 2 invoices:
    // Invoice 1: Due earlier, Amount 5,000, Fine 200, Remaining 5,200
    const inv1 = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA1Id,
        type: "MONTHLY",
        description: "April 2026 Tuition Fee",
        amount: fromPaise(500000), // 5,000.00
        fineAmount: fromPaise(20000), // 200.00
        remainingAmount: fromPaise(520000), // 5,200.00
        dueDate: new Date("2026-04-10"),
        status: "OVERDUE",
        isOverdue: true,
      },
    });
    invoiceA1Id = inv1.id;

    // Invoice 2: Due later, Amount 6,000, Fine 0, Remaining 6,000
    const inv2 = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA1Id,
        type: "MONTHLY",
        description: "May 2026 Tuition Fee",
        amount: fromPaise(600000), // 6,000.00
        fineAmount: fromPaise(0),
        remainingAmount: fromPaise(600000),
        dueDate: new Date("2026-05-10"),
        status: "PENDING",
      },
    });
    invoiceA2Id = inv2.id;

    // Student A2 has 1 invoice: 3,000
    const inv3 = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentA2Id,
        type: "ADMISSION",
        description: "Annual Admission Fee",
        amount: fromPaise(300000),
        remainingAmount: fromPaise(300000),
        dueDate: new Date("2026-06-01"),
        status: "PENDING",
      },
    });
    invoiceA3Id = inv3.id;

    // Student B1 (Tenant Isolation test):
    const invB1 = await prisma.invoice.create({
      data: {
        schoolId: schoolBId,
        studentId: studentB1Id,
        type: "MONTHLY",
        description: "School B Fee",
        amount: fromPaise(400000),
        remainingAmount: fromPaise(400000),
        dueDate: new Date("2026-04-10"),
        status: "PENDING",
      },
    });
    invoiceB1Id = invB1.id;
  });

  afterAll(async () => {
    // Cleanup in foreign key order
    try {
      const accounts = await prisma.ledgerAccount.findMany({
        where: { schoolId: { in: [schoolAId, schoolBId] } },
        select: { id: true },
      });
      await prisma.ledgerEntry.deleteMany({ where: { accountId: { in: accounts.map((a) => a.id) } } });
      await prisma.ledgerTransaction.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.auditLog.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.paymentAllocation.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.feeReceipt.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.studentAdvanceCredit.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.paymentTransaction.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.invoice.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.student.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.guardian.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.school.deleteMany({ where: { id: { in: [schoolAId, schoolBId] } } });
    } catch {
      // Ignore cleanup error if already dropped by test teardown
    }
  });

  // 1. Amount in Words helper verification
  describe("1. Currency Precision and Amount in Words", () => {
    it("converts amounts to standard Indian English words accurately", () => {
      expect(amountToWordsIndianRupees(0)).toBe("Rupees Zero Only");
      expect(amountToWordsIndianRupees(5000)).toBe("Rupees Five Thousand Only");
      expect(amountToWordsIndianRupees(5200.5)).toBe("Rupees Five Thousand Two Hundred and Fifty Paise Only");
      expect(amountToWordsIndianRupees(15450.75)).toBe("Rupees Fifteen Thousand Four Hundred Fifty and Seventy Five Paise Only");
      expect(amountToWordsIndianRupees(1234567.0)).toBe("Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only");
    });
  });

  // 2. Student Search Desk
  describe("2. Cashier Student Search Desk", () => {
    it("searches student by admission number and computes outstanding balance", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/cash/students?q=ADM-101-${uid}`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);

      const student = res.body.data[0];
      expect(student.id).toBe(studentA1Id);
      expect(student.name).toContain("Aarav Sharma");
      expect(student.outstandingInvoiceCount).toBe(2);
      expect(toPaise(student.totalOutstanding)).toBe(1120000); // 5,200 + 6,000 = 11,200.00
    });

    it("searches student by guardian phone number", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/cash/students?q=9876543210`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].guardianPhone).toBe("9876543210");
    });

    it("fetches outstanding invoices with accurate balances", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/cash/students/${studentA1Id}/invoices`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.invoices.length).toBe(2);
      expect(res.body.data.invoices[0].id).toBe(invoiceA1Id);
      expect(toPaise(res.body.data.invoices[0].remainingAmount)).toBe(520000);
      expect(res.body.data.invoices[1].id).toBe(invoiceA2Id);
      expect(toPaise(res.body.data.invoices[1].remainingAmount)).toBe(600000);
    });
  });

  // 3. Deterministic Allocation Previews
  describe("3. Real-Time Deterministic Allocation Previews", () => {
    it("previews exact single invoice payment", async () => {
      const res = await request(app)
        .post("/api/v1/finance/cash/preview-allocation")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentA1Id,
          amountReceived: 5200,
          selectedInvoiceIds: [invoiceA1Id],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.allocations.length).toBe(1);
      expect(res.body.data.allocations[0].newStatus).toBe("PAID");
      expect(toPaise(res.body.data.allocations[0].remainingBalance)).toBe(0);
      expect(toPaise(res.body.data.allocations[0].finePaid)).toBe(20000);
      expect(toPaise(res.body.data.allocations[0].principalPaid)).toBe(500000);
      expect(toPaise(res.body.data.advanceCreditAmount)).toBe(0);
      expect(res.body.data.amountInWords).toBe("Rupees Five Thousand Two Hundred Only");
    });

    it("previews partial payment against oldest invoice", async () => {
      const res = await request(app)
        .post("/api/v1/finance/cash/preview-allocation")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentA1Id,
          amountReceived: 3000,
          selectedInvoiceIds: [invoiceA1Id],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.allocations[0].newStatus).toBe("PARTIAL");
      expect(toPaise(res.body.data.allocations[0].allocatedAmount)).toBe(300000);
      expect(toPaise(res.body.data.allocations[0].remainingBalance)).toBe(220000); // 5200 - 3000 = 2200
    });

    it("previews multi-invoice allocation (oldest due first)", async () => {
      // Total due across A1 and A2 = 5,200 + 6,000 = 11,200.
      // Pay 8,000:
      // Fully settles A1 (5,200), remaining 2,800 applied to A2 (balance 6000 - 2800 = 3200).
      const res = await request(app)
        .post("/api/v1/finance/cash/preview-allocation")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentA1Id,
          amountReceived: 8000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.allocations.length).toBe(2);

      // First invoice fully paid
      expect(res.body.data.allocations[0].invoiceId).toBe(invoiceA1Id);
      expect(toPaise(res.body.data.allocations[0].allocatedAmount)).toBe(520000);
      expect(res.body.data.allocations[0].newStatus).toBe("PAID");

      // Second invoice partially paid
      expect(res.body.data.allocations[1].invoiceId).toBe(invoiceA2Id);
      expect(toPaise(res.body.data.allocations[1].allocatedAmount)).toBe(280000);
      expect(toPaise(res.body.data.allocations[1].remainingBalance)).toBe(320000);
      expect(res.body.data.allocations[1].newStatus).toBe("PARTIAL");

      expect(toPaise(res.body.data.advanceCreditAmount)).toBe(0);
    });

    it("previews excess payment generating advance fee credit", async () => {
      // Pay 15,000 for total dues of 11,200 -> Excess 3,800 becomes advance credit
      const res = await request(app)
        .post("/api/v1/finance/cash/preview-allocation")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentA1Id,
          amountReceived: 15000,
        });

      expect(res.status).toBe(200);
      expect(toPaise(res.body.data.totalAllocated)).toBe(1120000);
      expect(toPaise(res.body.data.advanceCreditAmount)).toBe(380000); // 3,800.00
      expect(res.body.data.allocations[0].newStatus).toBe("PAID");
      expect(res.body.data.allocations[1].newStatus).toBe("PAID");
    });
  });

  // 4. Atomic Cash Payment Recording & Ledger Posting
  describe("4. Atomic Cash Payment Recording & General Ledger Integrity", () => {
    it("records cash payment, settles invoice, updates projections, and writes balanced ledger transaction", async () => {
      // Record payment for Student A2: exact 3,000 cash payment
      const res = await request(app)
        .post("/api/v1/finance/cash/record-payment")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentA2Id,
          amountReceived: 3000,
          paymentMethod: "CASH",
          selectedInvoiceIds: [invoiceA3Id],
          remarks: "Paid in full at cashier counter",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const receipt = res.body.data.receipt;
      expect(receipt).toBeDefined();
      expect(receipt.receiptNo).toMatch(/^REC-\d{4}-\d{6}$/);
      expect(receipt.paymentMethod).toBe("CASH");
      expect(toPaise(receipt.totalAmount)).toBe(300000);

      issuedReceiptId = receipt.id;
      issuedReceiptNo = receipt.receiptNo;

      // 1. Verify Invoice state in Database
      const updatedInv = await prisma.invoice.findUnique({ where: { id: invoiceA3Id } });
      expect(updatedInv?.status).toBe("PAID");
      expect(toPaise(updatedInv!.remainingAmount)).toBe(0);
      expect(toPaise(updatedInv!.amountPaid)).toBe(300000);
      expect(updatedInv!.paidDate).not.toBeNull();

      // 2. Verify PaymentAllocation record created
      const allocation = await prisma.paymentAllocation.findFirst({
        where: { receiptId: receipt.id, invoiceId: invoiceA3Id },
      });
      expect(allocation).toBeDefined();
      expect(toPaise(allocation!.allocatedAmount)).toBe(300000);
      expect(toPaise(allocation!.remainingBalance)).toBe(0);

      // 3. Verify PaymentTransaction record
      const txn = await prisma.paymentTransaction.findUnique({
        where: { id: res.body.data.paymentTransactionId },
      });
      expect(txn?.gateway).toBe("CASH");
      expect(txn?.status).toBe("SUCCESS");
      expect(txn?.receiptNo).toBe(receipt.receiptNo);

      // 4. Verify General Ledger Double-Entry Transaction
      const ledgerTxn = await prisma.ledgerTransaction.findFirst({
        where: { schoolId: schoolAId, referenceId: receipt.id },
        include: { LedgerEntry: true },
      });
      expect(ledgerTxn).toBeDefined();
      expect(ledgerTxn?.LedgerEntry.length).toBe(2);

      // Debits must equal Credits
      const totalDebitsPaise = ledgerTxn!.LedgerEntry.reduce((sum, e) => sum + toPaise(e.debitAmount), 0);
      const totalCreditsPaise = ledgerTxn!.LedgerEntry.reduce((sum, e) => sum + toPaise(e.creditAmount), 0);
      expect(totalDebitsPaise).toBe(300000);
      expect(totalCreditsPaise).toBe(300000);
      expect(totalDebitsPaise).toBe(totalCreditsPaise);
    });

    it("records offline payment with excess funds creating StudentAdvanceCredit and advance ledger liability", async () => {
      // Settle both A1 and A2 with excess amount: pay 12,000 for 11,200 dues (800 excess advance)
      const res = await request(app)
        .post("/api/v1/finance/cash/record-payment")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentA1Id,
          amountReceived: 12000,
          paymentMethod: "COUNTER_UPI",
          instrumentNo: "UPI-TXN-77889900",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Invoices A1 and A2 must both be PAID
      const inv1 = await prisma.invoice.findUnique({ where: { id: invoiceA1Id } });
      const inv2 = await prisma.invoice.findUnique({ where: { id: invoiceA2Id } });
      expect(inv1?.status).toBe("PAID");
      expect(inv2?.status).toBe("PAID");

      // Advance credit record must exist with 800 balance
      const advance = res.body.data.advanceCredit;
      expect(advance).toBeDefined();
      expect(toPaise(advance.amount)).toBe(80000); // 800.00
      expect(advance.status).toBe("ACTIVE");

      // General Ledger must have: Debit Bank 12,000; Credit Tuition 11,200; Credit Advance Liability 800
      const receiptId = res.body.data.receipt.id;
      const ledgerTxn = await prisma.ledgerTransaction.findFirst({
        where: { schoolId: schoolAId, referenceId: receiptId },
        include: { LedgerEntry: true },
      });
      expect(ledgerTxn).toBeDefined();

      const totalDebits = ledgerTxn!.LedgerEntry.reduce((sum, e) => sum + toPaise(e.debitAmount), 0);
      const totalCredits = ledgerTxn!.LedgerEntry.reduce((sum, e) => sum + toPaise(e.creditAmount), 0);
      expect(totalDebits).toBe(1200000);
      expect(totalCredits).toBe(1200000);
      expect(totalDebits).toBe(totalCredits);
    });

    it("records cheque payment with pending clearance status", async () => {
      // Create student A3 and invoice
      const studentA3 = await prisma.student.create({
        data: {
          schoolId: schoolAId,
          rollNo: `R-103-${uid}`,
          name: `Cheque Student-${uid}`,
        },
      });

      const inv = await prisma.invoice.create({
        data: {
          schoolId: schoolAId,
          studentId: studentA3.id,
          amount: fromPaise(250000),
          remainingAmount: fromPaise(250000),
          dueDate: new Date("2026-07-01"),
        },
      });

      const res = await request(app)
        .post("/api/v1/finance/cash/record-payment")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentA3.id,
          amountReceived: 2500,
          paymentMethod: "CHEQUE",
          instrumentNo: "CHQ-123456",
          instrumentDate: "2026-06-15",
          issuingBank: "HDFC Bank",
          pendingClearance: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.receipt.status).toBe("PENDING_CLEARANCE");
      expect(res.body.data.receipt.issuingBank).toBe("HDFC Bank");
      expect(res.body.data.receipt.instrumentNo).toBe("CHQ-123456");
    });
  });

  // 5. Official HTML / PDF Receipt & Reprint
  describe("5. Official Receipt Rendering, QR Code & Reprint Audit", () => {
    it("renders printable HTML receipt with school branding and QR verification payload", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/cash/receipts/${issuedReceiptId}/html`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.text).toContain("OFFICIAL FEE RECEIPT");
      expect(res.text).toContain(issuedReceiptNo);
      expect(res.text).toContain("Scan to Verify");
      expect(res.text).toContain("data:image/png;base64,"); // Embedded QR code
    });

    it("reprints receipt, increments reprint count, and logs audit record without duplicating transaction", async () => {
      const beforeReceipt = await prisma.feeReceipt.findUnique({ where: { id: issuedReceiptId } });
      expect(beforeReceipt?.reprintCount).toBe(0);

      const res = await request(app)
        .post(`/api/v1/finance/cash/receipts/${issuedReceiptId}/reprint`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reprintCount).toBe(1);

      // Verify HTML now displays DUPLICATE COPY watermark
      const htmlRes = await request(app)
        .get(`/api/v1/finance/cash/receipts/${issuedReceiptId}/html`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      expect(htmlRes.text).toContain("DUPLICATE COPY");

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: { schoolId: schoolAId, entityId: issuedReceiptId, action: "REPRINT" },
      });
      expect(audit).toBeDefined();
    });
  });

  // 6. Daily Cash Register
  describe("6. Daily Cash Register and Shift Handover", () => {
    it("aggregates daily collections by cashier and payment mode", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .get(`/api/v1/finance/cash/daily-register?date=${todayStr}`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receiptCount).toBeGreaterThanOrEqual(2);
      expect(toPaise(res.body.data.totalCollected)).toBeGreaterThan(0);
      expect(res.body.data.byPaymentMethod).toHaveProperty("CASH");
      expect(res.body.data.byPaymentMethod).toHaveProperty("COUNTER_UPI");
    });
  });

  // 7. Multi-Tenant Isolation & RLS
  describe("7. Multi-Tenant Isolation and Cross-School Security", () => {
    it("denies School A cashier from viewing or collecting fees for School B student", async () => {
      // School A user attempting to search / collect for School B student
      const res = await request(app)
        .get(`/api/v1/finance/cash/students/${studentB1Id}/invoices`)
        .set("Authorization", `Bearer ${accountantAToken}`);

      // Expect 404 Not Found (isolated by schoolId)
      expect(res.status).toBe(404);

      const payRes = await request(app)
        .post("/api/v1/finance/cash/record-payment")
        .set("Authorization", `Bearer ${accountantAToken}`)
        .send({
          studentId: studentB1Id,
          amountReceived: 4000,
          paymentMethod: "CASH",
        });

      expect(payRes.status).toBe(500);
      expect(payRes.body.error).toContain("not found in school");
    });
  });

  // 8. RBAC Enforcement
  describe("8. Role-Based Access Control (RBAC)", () => {
    it("denies unauthorized roles (Teacher) from recording cash payments", async () => {
      const res = await request(app)
        .post("/api/v1/finance/cash/record-payment")
        .set("Authorization", `Bearer ${teacherAToken}`)
        .send({
          studentId: studentA1Id,
          amountReceived: 1000,
          paymentMethod: "CASH",
        });

      expect(res.status).toBe(403);
    });

    it("allows authorized roles (ERP_ADMIN and ACCOUNTANT) to collect fees", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/cash/students?q=Aarav`)
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
