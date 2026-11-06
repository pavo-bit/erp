import prisma, { runWithTenantDatabaseTransaction } from '../lib/prisma';
import { Router, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { getEnv } from "../config/env";
import { LedgerService } from "../services/ledger.service";
import { seedDefaultChartOfAccounts } from "../lib/chartOfAccounts";
import { paymentIdempotencyMiddleware, computePaymentIdempotencyKey } from "../middleware/idempotency";
import { IdempotencyService } from "../services/idempotency.service";
import { logSecurityEvent } from "../lib/audit";
import { razorpayCircuitBreaker } from "../lib/circuitBreaker";
import { toPaise, fromPaise } from "../lib/money";
import logger from "../lib/logger";

const router = Router();
const env = getEnv();

const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

const PAYMENT_ADMIN_ROLES = new Set(["SUPER_ADMIN", "ERP_ADMIN", "ACCOUNTANT"]);

export class ChartOfAccountsNotConfiguredError extends Error {
  public readonly code = "CHART_OF_ACCOUNTS_NOT_CONFIGURED";
  constructor(schoolId: string) {
    super(`Required payment ledger accounts are not configured for school ${schoolId}.`);
    this.name = "ChartOfAccountsNotConfiguredError";
  }
}

export class PermanentWebhookError extends Error {
  public readonly isPermanent = true;
  constructor(message: string) {
    super(message);
    this.name = "PermanentWebhookError";
  }
}

function outstandingAmountPaise(invoice: {
  amount: Prisma.Decimal | number | string;
  amountPaid: Prisma.Decimal | number | string;
  fineAmount: Prisma.Decimal | number | string;
}): number {
  const totalDue = toPaise(invoice.amount) + toPaise(invoice.fineAmount);
  const paid = toPaise(invoice.amountPaid);
  return Math.max(0, totalDue - paid);
}

async function mayPayInvoice(
  user: NonNullable<AuthRequest["user"]>,
  invoice: { schoolId: string; studentId: string; student?: { id: string; userId?: string | null } | null },
  client?: Prisma.TransactionClient
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (!user.schoolId || user.schoolId !== invoice.schoolId) return false;
  if (PAYMENT_ADMIN_ROLES.has(user.role)) return true;

  const runner = async (tx: Prisma.TransactionClient) => {
    if (user.role === "STUDENT") {
      const authUserId = user.userId || user.id;
      if (invoice.student?.userId) {
        return invoice.student.userId === authUserId;
      }
      const student = await tx.student.findFirst({
        where: {
          id: invoice.studentId,
          schoolId: invoice.schoolId,
          userId: authUserId,
        },
        select: { id: true },
      });
      return student !== null;
    }
    if (user.role === "PARENT") {
      const guardian = await tx.guardian.findFirst({
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
  };

  if (client) {
    return runner(client);
  }
  return runWithTenantDatabaseTransaction(invoice.schoolId, runner);
}

function verifyHmacSignature(payload: Buffer | string, signature: unknown, secret: string): boolean {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
  const expected = crypto.createHmac("sha256", secret).update(payloadBuffer).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

function isIdempotencyConstraintConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const err = error as { code?: string; meta?: { target?: unknown } };
  if (err.code !== "P2002") return false;
  const target = err.meta?.target;
  const targets = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];
  return targets.some((t) =>
    typeof t === "string" && (
      t.includes("idempotencyKey") ||
      t.includes("gatewayPaymentId")
    )
  );
}

function isPermanentWebhookError(error: unknown): boolean {
  if (error instanceof PermanentWebhookError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("unknown order") ||
      msg.includes("not found") ||
      msg.includes("mismatch") ||
      msg.includes("already settled") ||
      msg.includes("already captured") ||
      msg.includes("already bound") ||
      msg.includes("not payable") ||
      msg.includes("exceeds remaining")
    );
  }
  return false;
}

async function postPaymentLedgerEntry(
  tx: Prisma.TransactionClient,
  invoice: { id: string; schoolId: string },
  transaction: { id: string; amountPaid: Prisma.Decimal | number },
  actorId: string,
) {
  let bankAccount = await tx.ledgerAccount.findUnique({
    where: { schoolId_code: { schoolId: invoice.schoolId, code: "1010-BANK" } },
  });
  let creditAccount = await tx.ledgerAccount.findUnique({
    where: { schoolId_code: { schoolId: invoice.schoolId, code: "4000-TUIT" } },
  });
  if (!creditAccount) {
    creditAccount = await tx.ledgerAccount.findUnique({
      where: { schoolId_code: { schoolId: invoice.schoolId, code: "1200-AR" } },
    });
  }

  if (!bankAccount || !creditAccount) {
    try {
      await seedDefaultChartOfAccounts(tx, invoice.schoolId);
    } catch (seedErr) {
      logger.warn({ seedErr, schoolId: invoice.schoolId }, "Unable to seed default chart of accounts");
    }
    bankAccount = await tx.ledgerAccount.findUnique({
      where: { schoolId_code: { schoolId: invoice.schoolId, code: "1010-BANK" } },
    });
    creditAccount = await tx.ledgerAccount.findUnique({
      where: { schoolId_code: { schoolId: invoice.schoolId, code: "4000-TUIT" } },
    });
    if (!creditAccount) {
      creditAccount = await tx.ledgerAccount.findUnique({
        where: { schoolId_code: { schoolId: invoice.schoolId, code: "1200-AR" } },
      });
    }
  }

  if (!bankAccount || !creditAccount) {
    throw new ChartOfAccountsNotConfiguredError(invoice.schoolId);
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
      { accountId: creditAccount.id, debitAmount: 0, creditAmount: transaction.amountPaid },
    ],
  }, tx);
}

interface CapturePaymentInput {
  orderId: string;
  gatewayPaymentId: string;
  signature?: string;
  idempotencyKey: string;
  actorId: string;
  amountInPaise?: number;
  currency?: string;
}

async function applyCapturedPayment(
  tx: Prisma.TransactionClient,
  input: CapturePaymentInput,
): Promise<{ alreadyProcessed: boolean; receiptNo: string | null; transaction?: unknown }> {
  const existingByGateway = await tx.paymentTransaction.findUnique({
    where: { gatewayPaymentId: input.gatewayPaymentId },
  });
  if (existingByGateway) {
    if (existingByGateway.transactionId === input.orderId && existingByGateway.status === "SUCCESS") {
      return { alreadyProcessed: true, receiptNo: existingByGateway.receiptNo, transaction: existingByGateway };
    }
    throw new PermanentWebhookError("Gateway payment is already bound to another transaction.");
  }

  const transaction = await tx.paymentTransaction.findFirst({
    where: { transactionId: input.orderId },
  });
  if (!transaction) throw new PermanentWebhookError("Payment order was not found.");
  if (transaction.status === "SUCCESS") {
    if (transaction.gatewayPaymentId === input.gatewayPaymentId) {
      return { alreadyProcessed: true, receiptNo: transaction.receiptNo, transaction };
    }
    throw new PermanentWebhookError("Payment transaction has already been captured.");
  }
  if (transaction.status !== "CREATED") {
    throw new PermanentWebhookError("Payment transaction is not payable.");
  }

  // Currency validation
  if (input.currency && input.currency.toUpperCase() !== "INR") {
    throw new PermanentWebhookError(`Currency mismatch: expected INR, got ${input.currency}`);
  }

  // Amount validation
  const paymentPaise = toPaise(transaction.amountPaid);
  if (input.amountInPaise !== undefined && input.amountInPaise !== paymentPaise) {
    throw new PermanentWebhookError(`Amount mismatch: expected ${paymentPaise} paise, got ${input.amountInPaise} paise`);
  }

  const invoice = await tx.invoice.findUnique({
    where: { id: transaction.invoiceId },
  });
  if (!invoice) throw new PermanentWebhookError("Invoice not found.");

  const currentPaidPaise = toPaise(invoice.amountPaid);
  const totalDuePaise = toPaise(invoice.amount) + toPaise(invoice.fineAmount);
  const currentRemainingPaise = Math.max(0, totalDuePaise - currentPaidPaise);

  if (currentRemainingPaise === 0 || invoice.status === "PAID") {
    throw new PermanentWebhookError("Invoice is already settled.");
  }
  if (paymentPaise > currentRemainingPaise) {
    throw new PermanentWebhookError("Payment amount exceeds remaining balance.");
  }

  const newPaidPaise = currentPaidPaise + paymentPaise;
  const remainingPaise = Math.max(0, totalDuePaise - newPaidPaise);
  const newStatus = remainingPaise === 0 ? "PAID" : "PARTIAL";

  // Per-school sequential receipt numbering via SequenceCounter in the same transaction
  const schoolId = invoice.schoolId;
  const currentYear = new Date().getFullYear();
  const counterKey = `RECEIPT_${currentYear}`;
  const counter = await tx.sequenceCounter.upsert({
    where: { schoolId_key: { schoolId, key: counterKey } },
    update: { currentValue: { increment: 1 } },
    create: { schoolId, key: counterKey, currentValue: 1 },
  });
  const receiptNo = `REC-${currentYear}-${String(counter.currentValue).padStart(6, "0")}`;

  const updatedTx = await tx.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      gatewayPaymentId: input.gatewayPaymentId,
      razorpaySignature: input.signature,
      status: "SUCCESS",
      paidAt: new Date(),
      idempotencyKey: input.idempotencyKey,
      receiptNo,
    },
  });

  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: fromPaise(newPaidPaise),
      remainingAmount: fromPaise(remainingPaise),
      status: newStatus,
      paidDate: newStatus === "PAID" ? new Date() : null,
      receiptNo,
    },
  });

  // Post to double-entry ledger within the same transaction context
  await postPaymentLedgerEntry(tx, invoice, transaction, input.actorId);

  return { alreadyProcessed: false, receiptNo, transaction: updatedTx };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order
// ─────────────────────────────────────────────────────────────────────────────
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

    const fee = await prisma.invoice.findUnique({
      where: { id: feeId },
      include: { student: true }
    });

    if (!fee) {
      res.status(404).json({ success: false, error: "Fee not found" });
      return;
    }

    // Caller authorization check
    const authorized = await mayPayInvoice(req.user!, fee);
    if (!authorized) {
      res.status(403).json({ success: false, error: "Not authorized to pay this fee" });
      return;
    }

    if (fee.isVoided) {
      res.status(409).json({ success: false, error: "Invoice has been voided" });
      return;
    }

    const outstandingPaise = outstandingAmountPaise(fee);
    if (outstandingPaise <= 0 || fee.status === "PAID") {
      res.status(409).json({ success: false, error: "Invoice has already been paid in full" });
      return;
    }

    // Create Razorpay Order with Circuit Breaker protection
    const options = {
      amount: outstandingPaise, // in paise
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

    // Save transaction to DB using tenant transaction
    const transaction = await runWithTenantDatabaseTransaction(fee.schoolId, async (tx) => {
      return tx.paymentTransaction.create({
        data: {
          invoiceId: fee.id,
          transactionId: order.id,
          amountPaid: fromPaise(outstandingPaise),
          status: "CREATED",
          schoolId: fee.schoolId,
        },
      });
    });

    res.json({ success: true, order, transactionId: transaction.id });
  } catch (error) {
    logger.error({ err: error }, "Razorpay Create Order Error");
    res.status(500).json({ success: false, error: "Server error creating order" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify (with idempotency)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify", authenticate, paymentIdempotencyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;
    const effectiveTxId = transactionId || razorpay_order_id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !effectiveTxId) {
      res.status(400).json({ success: false, error: "Missing payment details" });
      return;
    }

    const secret = env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      res.status(503).json({ success: false, error: "Payment gateway is not configured" });
      return;
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isAuthentic = verifyHmacSignature(payload, razorpay_signature, secret);

    if (!isAuthentic) {
      // Resolve school to update transaction status to FAILED safely
      const [resolved] = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
        `SELECT resolve_payment_school($1) AS resolve_payment_school`,
        effectiveTxId
      );
      if (resolved?.resolve_payment_school) {
        await runWithTenantDatabaseTransaction(resolved.resolve_payment_school, async (tx) => {
          await tx.paymentTransaction.updateMany({
            where: {
              OR: [{ id: effectiveTxId }, { transactionId: effectiveTxId }],
            },
            data: { status: "FAILED" },
          });
        });
      }
      res.status(400).json({ success: false, error: "Invalid signature" });
      return;
    }

    // Resolve transaction and invoice
    const [resolved] = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
      `SELECT resolve_payment_school($1) AS resolve_payment_school`,
      effectiveTxId
    );
    const schoolId = resolved?.resolve_payment_school;
    if (!schoolId) {
      res.status(404).json({ success: false, error: "Payment transaction not found" });
      return;
    }

    const paymentTx = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      return tx.paymentTransaction.findFirst({
        where: {
          OR: [{ id: effectiveTxId }, { transactionId: effectiveTxId }],
        },
        include: { invoice: true },
      });
    });

    if (!paymentTx) {
      res.status(404).json({ success: false, error: "Payment transaction not found" });
      return;
    }

    // Ownership check
    const authorized = await mayPayInvoice(req.user!, paymentTx.invoice);
    if (!authorized) {
      res.status(403).json({ success: false, error: "Not authorized to verify this payment" });
      return;
    }

    if (paymentTx.status === "SUCCESS") {
      if (paymentTx.gatewayPaymentId === razorpay_payment_id) {
        res.json({ success: true, message: "Payment already verified", receiptNo: paymentTx.receiptNo });
      } else {
        res.status(409).json({ success: false, error: "Payment transaction has already been processed" });
      }
      return;
    }

    if (paymentTx.status !== "CREATED") {
      res.status(409).json({ success: false, error: "Payment transaction is not payable" });
      return;
    }

    // Verify against Razorpay provider API if razorpay client is initialized
    if (razorpay) {
      try {
        const gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);
        if (
          gatewayPayment.order_id !== razorpay_order_id ||
          gatewayPayment.amount !== toPaise(paymentTx.amountPaid) ||
          gatewayPayment.currency !== "INR" ||
          gatewayPayment.status !== "captured"
        ) {
          res.status(400).json({ success: false, error: "Payment does not match the stored order" });
          return;
        }
      } catch (fetchErr) {
        logger.warn({ fetchErr, razorpay_payment_id }, "Gateway payment verification warning");
      }
    }

    const idempotencyKey = computePaymentIdempotencyKey(razorpay_order_id, razorpay_payment_id);

    const result = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      return applyCapturedPayment(tx, {
        orderId: razorpay_order_id,
        gatewayPaymentId: razorpay_payment_id,
        signature: razorpay_signature,
        idempotencyKey,
        actorId: req.user?.id || "SYSTEM",
      });
    });

    res.json({
      success: true,
      message: result.alreadyProcessed ? "Payment already verified" : "Payment verified successfully",
      receiptNo: result.receiptNo,
    });
  } catch (error) {
    const errCode = typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
    if (error instanceof ChartOfAccountsNotConfiguredError || errCode === "CHART_OF_ACCOUNTS_NOT_CONFIGURED") {
      res.status(422).json({
        success: false,
        error: (error as Error).message,
        code: "CHART_OF_ACCOUNTS_NOT_CONFIGURED",
      });
      return;
    }
    logger.error({ err: error }, "Razorpay Verify Error");
    res.status(500).json({ success: false, error: "Server error verifying payment" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/trigger-late-fines
// ─────────────────────────────────────────────────────────────────────────────
router.post("/trigger-late-fines", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: "School scope is required" });
      return;
    }
    const { applyLateFinesForSchool } = await import("../jobs/lateFines");
    const result = await runWithTenantDatabaseTransaction(schoolId, (tx) => applyLateFinesForSchool(tx, schoolId));
    if (result.noRule) {
      res.json({ success: true, message: "no fine rule", count: 0 });
      return;
    }
    res.json({ success: true, message: `Updated ${result.appliedCount} overdue fees with late fines.`, count: result.appliedCount });
  } catch (error) {
    logger.error({ err: error }, "Late Fines Execution Error");
    res.status(500).json({ success: false, error: "Failed to process late fines" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook (Razorpay Webhooks)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/webhook", async (req: import("express").Request, res: Response) => {
  let webhookOrderId: string | undefined;
  let webhookSchoolId: string | undefined;
  let webhookGatewayPaymentId: string | undefined;

  try {
    const rawBody = (req as import("express").Request & { rawBody?: Buffer | string }).rawBody;
    const signature = req.headers["x-razorpay-signature"] as string;
    const secret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      res.status(503).json({ success: false, error: "Payment webhook is not configured" });
      return;
    }

    const payloadBuffer = rawBody
      ? (Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8"))
      : Buffer.from(JSON.stringify(req.body), "utf8");

    if (!verifyHmacSignature(payloadBuffer, signature, secret)) {
      await logSecurityEvent({
        userId: "SYSTEM",
        eventType: "WEBHOOK_TAMPERING",
        severity: "CRITICAL",
        ipAddress: typeof req.ip === "string" ? req.ip : undefined,
        metadata: { receivedSignature: signature?.substring(0, 16) + "..." },
      });
      res.status(400).json({ success: false, error: "Invalid signature" });
      return;
    }

    const webhookBody = req.body;
    if (webhookBody.event === "payment.captured" || webhookBody.event === "order.paid") {
      const paymentEntity = webhookBody.payload?.payment?.entity;
      if (!paymentEntity) {
        res.status(200).json({ success: true, message: "Ignored - no payment entity" });
        return;
      }

      const gatewayPaymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const currency = paymentEntity.currency;
      const amount = paymentEntity.amount; // paise
      webhookOrderId = orderId;
      webhookGatewayPaymentId = gatewayPaymentId;

      if (!orderId) {
        logger.error({ gatewayPaymentId }, "Permanent webhook error: missing orderId");
        await logSecurityEvent({
          userId: "SYSTEM",
          eventType: "WEBHOOK_UNKNOWN_ORDER",
          severity: "HIGH",
          metadata: { reason: "Missing order_id in webhook payload", gatewayPaymentId },
        });
        res.status(200).json({ success: true, message: "Unknown order, acknowledged for ops" });
        return;
      }

      // 1. Resolve school first via resolve_payment_school
      const [resolved] = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
        `SELECT resolve_payment_school($1) AS resolve_payment_school`,
        orderId
      );
      const schoolId = resolved?.resolve_payment_school;

      if (!schoolId) {
        // Unknown order is a permanent error: HTTP 200 + logger.error + ops record
        logger.error({ orderId, gatewayPaymentId }, "Permanent webhook error: unknown order");
        await logSecurityEvent({
          userId: "SYSTEM",
          eventType: "WEBHOOK_UNKNOWN_ORDER",
          severity: "HIGH",
          metadata: { orderId, gatewayPaymentId, reason: "Order not found in database" },
        });
        res.status(200).json({ success: true, message: "Transaction not found, acknowledged for ops" });
        return;
      }

      webhookSchoolId = schoolId;

      // 2. Remove "system" idempotency key: scope Redis key by school after resolve_payment_school
      const razorpayEventId = req.headers["x-razorpay-event-id"] as string;
      const idempotencyKey = razorpayEventId
        ? crypto.createHash("sha256").update(razorpayEventId).digest("hex")
        : crypto.createHash("sha256").update(payloadBuffer).digest("hex");

      const lockAcquired = await IdempotencyService.acquireLock(schoolId, idempotencyKey);
      if (!lockAcquired) {
        logger.info({ schoolId, idempotencyKey, gatewayPaymentId }, "Webhook duplicate detected (Redis lock)");
        res.status(200).json({ success: true, message: "Already processed" });
        return;
      }

      // 3. Process captured payment in tenant serializable transaction
      const result = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        return applyCapturedPayment(tx, {
          orderId,
          gatewayPaymentId,
          currency,
          amountInPaise: typeof amount === "number" ? amount : undefined,
          idempotencyKey,
          actorId: "RAZORPAY_WEBHOOK",
        });
      });

      res.status(200).json({
        success: true,
        message: result.alreadyProcessed ? "Already processed" : "Payment captured",
        receiptNo: result.receiptNo,
      });
      return;
    }

    if (webhookBody.event === "payment.failed") {
      const paymentEntity = webhookBody.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        webhookOrderId = orderId;
        const [resolved] = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
          `SELECT resolve_payment_school($1) AS resolve_payment_school`,
          orderId
        );
        const schoolId = resolved?.resolve_payment_school;
        if (schoolId) {
          webhookSchoolId = schoolId;
          await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
            const txRecord = await tx.paymentTransaction.findFirst({
              where: { transactionId: orderId, schoolId },
            });
            // Out of order: if already SUCCESS, preserve terminal captured state!
            if (txRecord?.status === "SUCCESS") {
              logger.warn({ orderId, schoolId }, "Ignoring payment.failed for already captured transaction");
              return;
            }
            await tx.paymentTransaction.updateMany({
              where: { transactionId: orderId, schoolId, status: "CREATED" },
              data: { status: "FAILED" },
            });
          });
        }
      }
      res.status(200).json({ success: true, message: "Payment failed event recorded" });
      return;
    }

    // All other webhook events
    res.status(200).json({ success: true, message: "Event ignored" });
  } catch (error) {
    // P2002 duplicate matching only for idempotencyKey / gatewayPaymentId
    if (isIdempotencyConstraintConflict(error)) {
      res.status(200).json({ success: true, message: "Already processed" });
      return;
    }

    // Permanent error classification (unknown order, invoice not found, amount mismatch, already settled)
    if (isPermanentWebhookError(error)) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, orderId: webhookOrderId, schoolId: webhookSchoolId }, `Permanent webhook error: ${errMsg}`);
      try {
        await logSecurityEvent({
          schoolId: webhookSchoolId,
          userId: "SYSTEM",
          eventType: "PAYMENTS_WEBHOOK_PERMANENT_ERROR",
          severity: "HIGH",
          metadata: {
            orderId: webhookOrderId,
            gatewayPaymentId: webhookGatewayPaymentId,
            reason: errMsg,
          },
        });
      } catch (logErr) {
        logger.warn({ logErr }, "Failed to persist security event for webhook permanent error");
      }
      res.status(200).json({ success: true, message: `Permanent error acknowledged: ${errMsg}` });
      return;
    }

    // Transient errors (DB connection, Redis timeout, network) return 5xx
    logger.error({ err: error, orderId: webhookOrderId, schoolId: webhookSchoolId }, "Transient webhook error");
    res.status(500).json({ success: false, error: "Processing error" });
  }
});

export default router;
