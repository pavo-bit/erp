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
  invoice: { schoolId: string; studentId: string },
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (!user.schoolId || user.schoolId !== invoice.schoolId) return false;
  if (PAYMENT_ADMIN_ROLES.has(user.role)) return true;
  if (user.role === "STUDENT") {
    const student = await client.student.findFirst({
      where: {
        id: invoice.studentId,
        schoolId: invoice.schoolId,
        OR: [
          { userId: user.id },
          { id: user.id }
        ]
      },
      select: { id: true },
    });
    return student !== null;
  }
  if (user.role === "PARENT") {
    const guardian = await client.guardian.findFirst({
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

function verifyHmacSignature(payload: Buffer | string, signature: unknown, secret: string): boolean {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
  const expected = crypto.createHmac("sha256", secret).update(payloadBuffer).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
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
    await seedDefaultChartOfAccounts(tx, invoice.schoolId);
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
}

async function applyCapturedPayment(
  tx: Prisma.TransactionClient,
  input: CapturePaymentInput,
): Promise<{ alreadyProcessed: boolean; receiptNo: string | null; transaction?: any }> {
  const existingByGateway = await tx.paymentTransaction.findUnique({
    where: { gatewayPaymentId: input.gatewayPaymentId },
  });
  if (existingByGateway) {
    if (existingByGateway.transactionId === input.orderId && existingByGateway.status === "SUCCESS") {
      return { alreadyProcessed: true, receiptNo: null, transaction: existingByGateway };
    }
    throw new Error("Gateway payment is already bound to another transaction.");
  }

  const transaction = await tx.paymentTransaction.findFirst({
    where: { transactionId: input.orderId },
  });
  if (!transaction) throw new Error("Payment order was not found.");
  if (transaction.status === "SUCCESS") {
    if (transaction.gatewayPaymentId === input.gatewayPaymentId) {
      return { alreadyProcessed: true, receiptNo: null, transaction };
    }
    throw new Error("Payment transaction has already been captured.");
  }
  if (transaction.status !== "CREATED") {
    throw new Error("Payment transaction is not payable.");
  }

  const invoice = await tx.invoice.findUnique({
    where: { id: transaction.invoiceId },
  });
  if (!invoice) throw new Error("Invoice not found.");

  const currentPaidPaise = toPaise(invoice.amountPaid);
  const paymentPaise = toPaise(transaction.amountPaid);
  const totalDuePaise = toPaise(invoice.amount) + toPaise(invoice.fineAmount);
  const newPaidPaise = currentPaidPaise + paymentPaise;
  const remainingPaise = Math.max(0, totalDuePaise - newPaidPaise);
  const newStatus = remainingPaise === 0 ? "PAID" : "PARTIAL";

  const receiptNo = `REC-${Date.now()}`;

  const updatedTx = await tx.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      gatewayPaymentId: input.gatewayPaymentId,
      razorpaySignature: input.signature,
      status: "SUCCESS",
      paidAt: new Date(),
      idempotencyKey: input.idempotencyKey,
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
        res.json({ success: true, message: "Payment already verified" });
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
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    res.json({
      success: true,
      message: result.alreadyProcessed ? "Payment already verified" : "Payment verified successfully",
      receiptNo: result.receiptNo,
    });
  } catch (error) {
    logger.error({ err: error }, "Razorpay Verify Error");
    const message = error instanceof Error ? error.message : "";
    if (message.includes("already bound") || message.includes("already processed") || message.includes("not payable")) {
      res.status(409).json({ success: false, error: "Payment cannot be applied to the current invoice balance" });
      return;
    }
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

    const result = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // Check if fine rule is configured for school
      const fineRule = await tx.fineRule.findFirst({
        where: { schoolId, isActive: true },
      });
      const fineAmount = fineRule ? fineRule.fineAmount : new Prisma.Decimal(50);

      const overdueFees = await tx.invoice.findMany({
        where: {
          schoolId,
          status: "PENDING",
          dueDate: { lt: new Date() },
          fineAmount: new Prisma.Decimal(0),
        },
      });

      let count = 0;
      for (const fee of overdueFees) {
        const newRemaining = fee.remainingAmount.add(fineAmount);
        await tx.invoice.update({
          where: { id: fee.id, schoolId },
          data: {
            fineAmount,
            remainingAmount: newRemaining,
            status: "OVERDUE",
          },
        });
        count++;
      }
      return count;
    });

    res.json({ success: true, message: `Updated ${result} overdue fees with late fines.` });
  } catch (error) {
    logger.error({ err: error }, "Late Fines Execution Error");
    res.status(500).json({ success: false, error: "Failed to process late fines" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook (Razorpay Webhooks)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/webhook", async (req: import("express").Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody;
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
        res.status(200).json({ success: true, message: "Ignored — no payment entity" });
        return;
      }

      const gatewayPaymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const razorpayEventId = req.headers["x-razorpay-event-id"] as string;

      const idempotencyKey = razorpayEventId
        ? crypto.createHash("sha256").update(razorpayEventId).digest("hex")
        : crypto.createHash("sha256").update(payloadBuffer).digest("hex");

      const lockAcquired = await IdempotencyService.acquireLock("system", idempotencyKey);
      if (!lockAcquired) {
        logger.info({ idempotencyKey, gatewayPaymentId }, "Webhook duplicate detected (Redis lock)");
        res.status(200).json({ success: true, message: "Already processed" });
        return;
      }

      const [resolved] = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
        `SELECT resolve_payment_school($1) AS resolve_payment_school`,
        orderId
      );
      const schoolId = resolved?.resolve_payment_school;

      if (!schoolId) {
        logger.warn({ orderId }, "Transaction not found for webhook orderId");
        res.status(200).json({ success: true, message: "Transaction not found, acknowledged" });
        return;
      }

      const result = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        return applyCapturedPayment(tx, {
          orderId,
          gatewayPaymentId,
          idempotencyKey,
          actorId: "RAZORPAY_WEBHOOK",
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
        const [resolved] = await prisma.$queryRawUnsafe<Array<{ resolve_payment_school: string | null }>>(
          `SELECT resolve_payment_school($1) AS resolve_payment_school`,
          orderId
        );
        if (resolved?.resolve_payment_school) {
          await runWithTenantDatabaseTransaction(resolved.resolve_payment_school, async (tx) => {
            await tx.paymentTransaction.updateMany({
              where: { transactionId: orderId, status: "CREATED" },
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
    logger.error({ err: error }, "Razorpay Webhook Error");
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "P2002") {
      res.status(200).json({ success: true, message: "Already processed" });
      return;
    }
    res.status(500).json({ success: false, error: "Processing error" });
  }
});

export default router;
