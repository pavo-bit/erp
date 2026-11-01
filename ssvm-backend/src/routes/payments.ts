import prisma, { runWithTenantDatabaseTransaction, runWithTrustedDatabaseTransaction } from '../lib/prisma';
import { Router, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { getEnv } from "../config/env";
import { LedgerService } from "../services/ledger.service";
import { paymentIdempotencyMiddleware, computePaymentIdempotencyKey } from "../middleware/idempotency";
import { logSecurityEvent } from "../lib/audit";
import { razorpayCircuitBreaker } from "../lib/circuitBreaker";
import logger from "../lib/logger";

const router = Router();
const env = getEnv();

// Make sure you have RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

const PAYMENT_ADMIN_ROLES = new Set(["ERP_ADMIN", "ACCOUNTANT"]);

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function amountToPaise(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Payment amount must be a finite non-negative INR amount.");
  }
  return Math.round(amount * 100);
}

function outstandingAmountPaise(invoice: {
  amount: number;
  amountPaid: number;
  fineAmount: number;
}): number {
  return amountToPaise(invoice.amount + invoice.fineAmount - invoice.amountPaid);
}

async function mayPayInvoice(user: NonNullable<AuthRequest["user"]>, invoice: {
  schoolId: string;
  studentId: string;
}): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (!user.schoolId || user.schoolId !== invoice.schoolId) return false;
  if (PAYMENT_ADMIN_ROLES.has(user.role)) return true;
  if (user.role === "STUDENT") return user.id === invoice.studentId;
  if (user.role === "PARENT") {
    const guardian = await prisma.guardian.findFirst({
      where: {
        userId: user.id,
        schoolId: invoice.schoolId,
        students: { some: { id: invoice.studentId, schoolId: invoice.schoolId } },
      },
      select: { id: true },
    });
    return guardian !== null;
  }
  return false;
}

function verifyHmacSignature(payload: Buffer, signature: unknown, secret: string): boolean {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

async function postPaymentLedgerEntry(
  tx: Prisma.TransactionClient,
  invoice: { id: string; schoolId: string },
  transaction: { id: string; amountPaid: number },
  actorId: string,
) {
  const bankAccount = await tx.ledgerAccount.findUnique({
    where: { schoolId_code: { schoolId: invoice.schoolId, code: "1010-BANK" } },
  });
  const revenueAccount = await tx.ledgerAccount.findUnique({
    where: { schoolId_code: { schoolId: invoice.schoolId, code: "4000-TUIT" } },
  });
  if (!bankAccount || !revenueAccount) {
    throw new Error(`Required payment ledger accounts are not configured for school ${invoice.schoolId}.`);
  }

  return LedgerService.postTransaction({
    schoolId: invoice.schoolId,
    referenceType: "PAYMENT",
    referenceId: transaction.id,
    sourceModule: "FEES",
    description: `Payment received for Invoice ${invoice.id}`,
    postingDate: new Date(),
    createdBy: actorId,
    entries: [
      { accountId: bankAccount.id, debitAmount: transaction.amountPaid, creditAmount: 0 },
      { accountId: revenueAccount.id, debitAmount: 0, creditAmount: transaction.amountPaid },
    ],
  }, tx);
}

interface CapturePaymentInput {
  orderId: string;
  gatewayPaymentId: string;
  signature?: string;
  idempotencyKey: string;
  actorId: string;
}

async function applyCapturedPayment(
  tx: Prisma.TransactionClient,
  input: CapturePaymentInput,
): Promise<{ alreadyProcessed: boolean; receiptNo: string | null }> {
  const existingByGateway = await tx.paymentTransaction.findUnique({
    where: { gatewayPaymentId: input.gatewayPaymentId },
  });
  if (existingByGateway) {
    if (existingByGateway.transactionId === input.orderId && existingByGateway.status === "SUCCESS") {
      return { alreadyProcessed: true, receiptNo: null };
    }
    throw new Error("Gateway payment is already bound to another transaction.");
  }

  const transaction = await tx.paymentTransaction.findFirst({
    where: { transactionId: input.orderId },
    include: { invoice: true },
  });
  if (!transaction) throw new Error("Payment order was not found.");
  if (transaction.status === "SUCCESS") {
    if (transaction.gatewayPaymentId === input.gatewayPaymentId) {
      return { alreadyProcessed: true, receiptNo: transaction.invoice.receiptNo };
    }
    throw new Error("Payment transaction was already processed with another payment.");
  }
  if (transaction.status !== "CREATED") throw new Error("Payment transaction is not payable.");

  const invoice = await tx.invoice.findUnique({ where: { id: transaction.invoiceId } });
  if (!invoice || invoice.isVoided) throw new Error("Invoice is not payable.");
  const paymentPaise = amountToPaise(transaction.amountPaid);
  const balancePaise = outstandingAmountPaise(invoice);
  if (paymentPaise <= 0 || paymentPaise > balancePaise) {
    throw new Error("Stored order amount exceeds the current invoice balance.");
  }
  const nextBalancePaise = balancePaise - paymentPaise;
  const paidAt = new Date();
  const receiptNo = nextBalancePaise === 0 ? `REC-${crypto.randomUUID()}` : null;

  const transition = await tx.paymentTransaction.updateMany({
    where: { id: transaction.id, status: "CREATED", transactionId: input.orderId },
    data: {
      gatewayPaymentId: input.gatewayPaymentId,
      razorpaySignature: input.signature,
      status: "SUCCESS",
      paidAt,
      processedAt: paidAt,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (transition.count !== 1) throw new Error("Payment transaction changed while being processed.");

  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      status: nextBalancePaise === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL,
      paidDate: nextBalancePaise === 0 ? paidAt : null,
      receiptNo,
      amountPaid: { increment: paymentPaise / 100 },
      remainingAmount: nextBalancePaise / 100,
    },
  });
  await postPaymentLedgerEntry(tx, invoice, transaction, input.actorId);

  return { alreadyProcessed: false, receiptNo };
}

// ═══════════════════════════════════════════
// POST /api/payments/create-order
// ═══════════════════════════════════════════
router.post("/create-order", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { feeId } = req.body;
    if (!razorpay) {
      res.status(503).json({ success: false, error: "Payment gateway is not configured" });
      return;
    }
    if (!feeId) {
      res.status(400).json({ success: false, error: "Fee ID is required" });
      return;
    }

    const fee = await prisma.invoice.findUnique({ where: { id: feeId } });

    if (!fee) {
      res.status(404).json({ success: false, error: "Fee not found" });
      return;
    }

    if (!(await mayPayInvoice(req.user!, fee))) {
      res.status(404).json({ success: false, error: "Fee not found" });
      return;
    }

    const totalAmountPaise = outstandingAmountPaise(fee);
    if (totalAmountPaise <= 0 || fee.status === InvoiceStatus.PAID || fee.isVoided) {
      res.status(409).json({ success: false, error: "Invoice has no payable balance" });
      return;
    }
    const totalAmount = totalAmountPaise / 100;

    // Create Razorpay Order with Circuit Breaker protection
    const options = {
      amount: totalAmountPaise,
      currency: "INR",
      receipt: `rcpt_${fee.id.substring(0, 8)}`,
    };

    let order;
    try {
      order = await razorpayCircuitBreaker.fire(() => razorpay.orders.create(options));
    } catch (cbError: unknown) {
      if (cbError instanceof Error && cbError.message.includes("OPEN")) {
        res.status(503).json({ success: false, error: "Payment gateway is currently unavailable. Please try again later." });
        return;
      }
      throw cbError;
    }

    if (!order) {
      res.status(500).json({ success: false, error: "Failed to create Razorpay order" });
      return;
    }

    // Save transaction to DB
    const transaction = await prisma.paymentTransaction.create({
      data: {
        invoiceId: fee.id,
        transactionId: order.id,
        amountPaid: totalAmount,
        status: "CREATED",
        schoolId: fee.schoolId,
      },
    });

    res.json({ success: true, order, transactionId: transaction.id });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).json({ success: false, error: "Server error creating order" });
  }
});

// ═══════════════════════════════════════════
// POST /api/payments/verify (with idempotency)
// ═══════════════════════════════════════════
router.post("/verify", authenticate, paymentIdempotencyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      typeof transactionId !== "string"
    ) {
      res.status(400).json({ success: false, error: "Missing payment details" });
      return;
    }

    const secret = env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      res.status(503).json({ success: false, error: "Payment gateway is not configured" });
      return;
    }
    const signaturePayload = Buffer.from(`${razorpay_order_id}|${razorpay_payment_id}`, "utf8");
    if (!verifyHmacSignature(signaturePayload, razorpay_signature, secret)) {
      res.status(400).json({ success: false, error: "Invalid signature" });
      return;
    }

    if (!razorpay) {
      res.status(503).json({ success: false, error: "Payment gateway is not configured" });
      return;
    }

    const paymentTransaction = await prisma.paymentTransaction.findFirst({
      where: { id: transactionId, transactionId: razorpay_order_id },
      include: { invoice: true },
    });
    if (!paymentTransaction || !(await mayPayInvoice(req.user!, paymentTransaction.invoice))) {
      res.status(404).json({ success: false, error: "Payment transaction not found" });
      return;
    }

    if (paymentTransaction.status === "SUCCESS") {
      if (paymentTransaction.gatewayPaymentId === razorpay_payment_id) {
        res.json({ success: true, message: "Payment already verified" });
      } else {
        res.status(409).json({ success: false, error: "Payment transaction has already been processed" });
      }
      return;
    }
    if (paymentTransaction.status !== "CREATED") {
      res.status(409).json({ success: false, error: "Payment transaction is not payable" });
      return;
    }

    const gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (
      gatewayPayment.order_id !== razorpay_order_id ||
      gatewayPayment.amount !== amountToPaise(paymentTransaction.amountPaid) ||
      gatewayPayment.currency !== "INR" ||
      gatewayPayment.status !== "captured" ||
      gatewayPayment.captured !== true
    ) {
      res.status(400).json({ success: false, error: "Payment does not match the stored order" });
      return;
    }

    const idempotencyKey = computePaymentIdempotencyKey(razorpay_order_id, razorpay_payment_id);
    const result = await prisma.$transaction(async (tx) => {
      return applyCapturedPayment(tx, {
        orderId: razorpay_order_id,
        gatewayPaymentId: razorpay_payment_id,
        signature: razorpay_signature,
        idempotencyKey,
        actorId: req.user?.id || "SYSTEM",
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (result.alreadyProcessed) {
      res.json({ success: true, message: "Payment already verified" });
      return;
    }

    res.json({ success: true, message: "Payment verified successfully", receiptNo: result.receiptNo });
  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("already bound") || message.includes("already processed") || message.includes("not payable") || message.includes("current invoice balance")) {
      res.status(409).json({ success: false, error: "Payment cannot be applied to the current invoice balance" });
      return;
    }
    res.status(500).json({ success: false, error: "Server error verifying payment" });
  }
});

// ═══════════════════════════════════════════
// POST /api/payments/trigger-late-fines
// ═══════════════════════════════════════════
// Manual execution is restricted to school finance administrators and is scoped to
// their authenticated school. Cross-school jobs belong in an explicitly authorized worker.
router.post("/trigger-late-fines", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: "School scope is required" });
      return;
    }
    const overdueFees = await prisma.invoice.findMany({
      where: {
        schoolId,
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    });

    let updatedCount = 0;

    for (const fee of overdueFees) {
      if (fee.fineAmount === 0) {
        await prisma.invoice.update({
          where: { id: fee.id, schoolId, fineAmount: 0 },
          data: {
            fineAmount: 50,
            status: "OVERDUE",
          },
        });
        updatedCount++;
      }
    }

    res.json({ success: true, message: `Updated ${updatedCount} overdue fees with late fines.` });
  } catch (error) {
    console.error("Late Fines Cron Error:", error);
    res.status(500).json({ success: false, error: "Failed to process late fines" });
  }
});

// ═══════════════════════════════════════════
// POST /api/payments/webhook (Razorpay Webhooks)
// ═══════════════════════════════════════════
// GAP 1: Full idempotency with atomic DB transaction.
// Razorpay requires 200 on duplicates — never return 4xx/5xx for already-processed events.
router.post("/webhook", async (req: import("express").Request, res: Response) => {
  try {
    const rawBody = req.rawBody;
    const signature = req.get("x-razorpay-signature");
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      res.status(503).json({ success: false, error: "Payment webhook is not configured" });
      return;
    }
    if (!rawBody || !verifyHmacSignature(rawBody, signature, secret)) {
      await logSecurityEvent({
        userId: "SYSTEM",
        eventType: "WEBHOOK_TAMPERING",
        severity: "CRITICAL",
        ipAddress: typeof req.ip === "string" ? req.ip : undefined,
        metadata: { reason: rawBody ? "invalid_signature" : "raw_body_missing" },
      });
      res.status(400).json({ success: false, error: "Invalid signature or missing raw body" });
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as unknown;
    } catch {
      res.status(400).json({ success: false, error: "Invalid JSON payload" });
      return;
    }
    const body = asObject(payload);
    const payloadObject = body ? asObject(body.payload) : null;
    const paymentObject = payloadObject ? asObject(payloadObject.payment) : null;
    const payment = paymentObject ? asObject(paymentObject.entity) : null;
    if (!body || !payment || typeof payment.id !== "string" || typeof payment.order_id !== "string") {
      res.status(400).json({ success: false, error: "Webhook payment details are incomplete" });
      return;
    }

    if (body.event !== "payment.captured" && body.event !== "order.paid") {
      // A failed attempt does not close the order: Razorpay may capture another
      // attempt against it. Only a verified capture changes our payment state.
      res.status(200).json({ success: true, message: "Event acknowledged" });
      return;
    }
    if (payment.status !== "captured" || payment.currency !== "INR" || !Number.isInteger(payment.amount)) {
      res.status(400).json({ success: false, error: "Webhook capture details are invalid" });
      return;
    }

    const orderId = payment.order_id;
    const gatewayPaymentId = payment.id;
    const razorpayEventId = req.get("x-razorpay-event-id");
    const idempotencyKey = crypto.createHash("sha256")
      .update(razorpayEventId || rawBody)
      .digest("hex");
    const requestId = crypto.randomUUID();

    const order = await runWithTrustedDatabaseTransaction({
      purpose: "payment_webhook",
      requestId,
      route: "POST /api/v1/payments/webhook",
    }, async () => prisma.paymentTransaction.findUnique({
      where: { transactionId: orderId },
      select: { id: true, transactionId: true, amountPaid: true, status: true, invoice: { select: { schoolId: true } } },
    }));
    if (!order?.transactionId || !order.invoice.schoolId) {
      logger.warn({ orderId }, "Verified payment webhook has no matching school order");
      res.status(200).json({ success: true, message: "Unknown order acknowledged" });
      return;
    }

    const result = await runWithTenantDatabaseTransaction(order.invoice.schoolId, async () => {
      const current = await prisma.paymentTransaction.findUnique({
        where: { id: order.id },
        include: { invoice: true },
      });
      if (!current || current.transactionId !== orderId) throw new Error("Payment order changed during webhook processing.");
      if (payment.amount !== amountToPaise(current.amountPaid)) {
        throw new Error("Captured amount does not match the stored payment order.");
      }
      return prisma.$transaction(async (tx) => applyCapturedPayment(tx, {
        orderId,
        gatewayPaymentId,
        idempotencyKey,
        actorId: "RAZORPAY_WEBHOOK",
      }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    });

    res.status(200).json({
      success: true,
      message: result.alreadyProcessed ? "Already processed" : "Payment captured",
      receiptNo: result.receiptNo,
    });
  } catch (error) {
    logger.error({ err: error }, "Razorpay Webhook Error");
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "P2002") {
      res.status(200).json({ success: true, message: "Already processed" });
      return;
    }
    res.status(500).json({ success: false, error: "Payment processing failed; retry delivery" });
  }
});

export default router;
