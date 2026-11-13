import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Role, School, User, Student, Invoice, PaymentTransaction } from "@prisma/client";
import { createTestApp, getTestPrisma } from "../helpers/testApp";
import { generateAccessToken } from "../../lib/tokens";
import { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { seedDefaultChartOfAccounts } from "../../lib/chartOfAccounts";
import { randomUUID } from "crypto";

const app = createTestApp();
const fixturePrisma = getTestPrisma();

describe("P0 Finance: Refund Lifecycle and Ledger Reversals", () => {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  let schoolA: School;
  let schoolB: School;

  let accountantA: User;
  let accountantB: User;
  let accountantAToken: string;
  let accountantBToken: string;

  let studentA: Student;
  let invoiceA: Invoice;
  let paymentTxA: PaymentTransaction;

  beforeAll(async () => {
    // 1. Create two independent test schools
    schoolA = await fixturePrisma.school.create({
      data: { id: `sch_rf_a_${suffix}`, name: `Refund School A ${suffix}`, code: `RFA${suffix}` },
    });
    schoolB = await fixturePrisma.school.create({
      data: { id: `sch_rf_b_${suffix}`, name: `Refund School B ${suffix}`, code: `RFB${suffix}` },
    });

    // 2. Seed Default Chart of Accounts for both schools
    await runWithTenantDatabaseTransaction(schoolA.id, (tx) => seedDefaultChartOfAccounts(tx, schoolA.id));
    await runWithTenantDatabaseTransaction(schoolB.id, (tx) => seedDefaultChartOfAccounts(tx, schoolB.id));

    // 3. Create accountants
    accountantA = await runWithTenantDatabaseTransaction(schoolA.id, (tx) =>
      tx.user.create({
        data: {
          id: `usr_acc_a_${suffix}`,
          schoolId: schoolA.id,
          email: `acc_a_${suffix}@school.edu`,
          name: "Accountant A",
          role: "ACCOUNTANT",
          passwordHash: "argon2id_mock_hash",
          isActive: true,
        },
      }),
    );
    accountantAToken = generateAccessToken({
      userId: accountantA.id,
      email: accountantA.email,
      name: accountantA.name,
      role: "ACCOUNTANT",
      schoolId: schoolA.id,
      branchId: null,
      sid: "test-sid-a",
      impersonated: false,
    }).token;

    accountantB = await runWithTenantDatabaseTransaction(schoolB.id, (tx) =>
      tx.user.create({
        data: {
          id: `usr_acc_b_${suffix}`,
          schoolId: schoolB.id,
          email: `acc_b_${suffix}@school.edu`,
          name: "Accountant B",
          role: "ACCOUNTANT",
          passwordHash: "argon2id_mock_hash",
          isActive: true,
        },
      }),
    );
    accountantBToken = generateAccessToken({
      userId: accountantB.id,
      email: accountantB.email,
      name: accountantB.name,
      role: "ACCOUNTANT",
      schoolId: schoolB.id,
      branchId: null,
      sid: "test-sid-b",
      impersonated: false,
    }).token;

    // 4. Create Student in School A
    studentA = await runWithTenantDatabaseTransaction(schoolA.id, (tx) =>
      tx.student.create({
        data: {
          id: `std_rf_a_${suffix}`,
          schoolId: schoolA.id,
          name: "Refund Student A",
          rollNo: `ROLL-${suffix}`,
          admissionNo: `ADM-${suffix}`,
        },
      }),
    );

    // 5. Create Invoice and Successful Payment in School A
    invoiceA = await runWithTenantDatabaseTransaction(schoolA.id, (tx) =>
      tx.invoice.create({
        data: {
          id: `inv_rf_a_${suffix}`,
          schoolId: schoolA.id,
          studentId: studentA.id,
          amount: 5000,
          amountPaid: 5000,
          remainingAmount: 0,
          status: "PAID",
          dueDate: new Date(),
          paidDate: new Date(),
          receiptNo: `REC-2026-000001`,
        },
      }),
    );

    paymentTxA = await runWithTenantDatabaseTransaction(schoolA.id, (tx) =>
      tx.paymentTransaction.create({
        data: {
          id: `pt_rf_a_${suffix}`,
          schoolId: schoolA.id,
          invoiceId: invoiceA.id,
          amountPaid: 5000,
          gateway: "RAZORPAY",
          status: "SUCCESS",
          transactionId: `order_rf_${suffix}`,
          gatewayPaymentId: `pay_rf_${suffix}`,
          paidAt: new Date(),
        },
      }),
    );
  });

  afterAll(async () => {
    // Cleanup fixtures safely (handling immutable ledger records)
    try {
      await fixturePrisma.paymentTransaction.deleteMany({
        where: { schoolId: { in: [schoolA.id, schoolB.id] } },
      });
      await fixturePrisma.invoice.deleteMany({
        where: { schoolId: { in: [schoolA.id, schoolB.id] } },
      });
      await fixturePrisma.student.deleteMany({
        where: { schoolId: { in: [schoolA.id, schoolB.id] } },
      });
      await fixturePrisma.user.deleteMany({
        where: { schoolId: { in: [schoolA.id, schoolB.id] } },
      });
      await fixturePrisma.ledgerAccount.deleteMany({
        where: { schoolId: { in: [schoolA.id, schoolB.id] } },
      });
      await fixturePrisma.school.deleteMany({
        where: { id: { in: [schoolA.id, schoolB.id] } },
      });
    } catch {
      // Posted ledger records are protected by database immutability triggers
    }
  });

  it("rejects unauthenticated refund request with 401 or 403", async () => {
    const res = await request(app)
      .post("/api/v1/payments/refund")
      .send({ paymentTransactionId: paymentTxA.id, reason: "Accidental double pay" });

    expect([401, 403]).toContain(res.status);
  });

  it("rejects cross-school refund attempt (School B accountant cannot refund School A payment) with 403 or 404", async () => {
    const res = await request(app)
      .post("/api/v1/payments/refund")
      .set("Authorization", `Bearer ${accountantBToken}`)
      .send({ paymentTransactionId: paymentTxA.id, reason: "Malicious cross-tenant refund attempt" });

    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("rejects refund for nonexistent transaction with 404", async () => {
    const res = await request(app)
      .post("/api/v1/payments/refund")
      .set("Authorization", `Bearer ${accountantAToken}`)
      .send({ paymentTransactionId: "nonexistent_payment_id", reason: "Test invalid ID" });

    expect(res.status).toBe(404);
  });

  it("rejects refund with amount exceeding payment amount with 400", async () => {
    const res = await request(app)
      .post("/api/v1/payments/refund")
      .set("Authorization", `Bearer ${accountantAToken}`)
      .send({
        paymentTransactionId: paymentTxA.id,
        amount: 6000, // 5000 was paid
        reason: "Excessive refund request",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("between 1 paise");
  });

  it("executes partial refund (2000 of 5000), reverses ledger, and updates invoice to PARTIAL", async () => {
    const res = await request(app)
      .post("/api/v1/payments/refund")
      .set("Authorization", `Bearer ${accountantAToken}`)
      .send({
        paymentTransactionId: paymentTxA.id,
        amount: 2000,
        reason: "Partial fee waiver adjustment",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.refundAmount)).toBe(2000);
    expect(res.body.data.invoiceStatus).toBe("PARTIAL");
    expect(Number(res.body.data.remainingAmount)).toBe(2000);

    // Verify invoice state in database
    const updatedInv = await fixturePrisma.invoice.findUnique({ where: { id: invoiceA.id } });
    expect(Number(updatedInv?.amountPaid)).toBe(3000);
    expect(Number(updatedInv?.remainingAmount)).toBe(2000);
    expect(updatedInv?.status).toBe("PARTIAL");

    // Verify refund payment transaction row
    const refundTx = await fixturePrisma.paymentTransaction.findUnique({
      where: { id: res.body.data.refundTransactionId },
    });
    expect(refundTx?.status).toBe("REFUNDED");
    expect(Number(refundTx?.amountPaid)).toBe(2000);

    // Verify double-entry ledger reversal was posted and balanced
    const ledgerTx = await fixturePrisma.ledgerTransaction.findFirst({
      where: { referenceId: refundTx?.id, schoolId: schoolA.id },
      include: { LedgerEntry: true },
    });
    expect(ledgerTx).toBeDefined();
    expect(ledgerTx?.status).toBe("POSTED");
    expect(ledgerTx?.LedgerEntry).toHaveLength(2);

    const debits = ledgerTx?.LedgerEntry.reduce((sum, e) => sum + Number(e.debitAmount), 0);
    const credits = ledgerTx?.LedgerEntry.reduce((sum, e) => sum + Number(e.creditAmount), 0);
    expect(debits).toBe(2000);
    expect(credits).toBe(2000);
  });

  it("rejects subsequent refund that would exceed original payment amount with 400", async () => {
    // 2000 was already refunded; only 3000 remains refundable
    const res = await request(app)
      .post("/api/v1/payments/refund")
      .set("Authorization", `Bearer ${accountantAToken}`)
      .send({
        paymentTransactionId: paymentTxA.id,
        amount: 3500, // 3500 + 2000 = 5500 > 5000
        reason: "Excessive second refund",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Cumulative refund exceeds payment amount");
  });

  it("executes remaining refund (3000), completing full refund and setting invoice to UNPAID", async () => {
    const res = await request(app)
      .post("/api/v1/payments/refund")
      .set("Authorization", `Bearer ${accountantAToken}`)
      .send({
        paymentTransactionId: paymentTxA.id,
        amount: 3000,
        reason: "Final settlement of refund",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceStatus).toBe("UNPAID");
    expect(Number(res.body.data.remainingAmount)).toBe(5000);

    const updatedInv = await fixturePrisma.invoice.findUnique({ where: { id: invoiceA.id } });
    expect(Number(updatedInv?.amountPaid)).toBe(0);
    expect(Number(updatedInv?.remainingAmount)).toBe(5000);
    expect(updatedInv?.status).toBe("UNPAID");
  });
});
