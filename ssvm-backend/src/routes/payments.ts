import { Router, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();
import { AuthRequest, authenticate } from "../middleware/auth";
import { getEnv } from "../config/env";
import { LedgerService } from "../services/ledger.service";
import { paymentIdempotencyMiddleware, computePaymentIdempotencyKey } from "../middleware/idempotency";
import { IdempotencyService } from "../services/idempotency.service";
import { logSecurityEvent } from "../lib/audit";
import { razorpayCircuitBreaker } from "../lib/circuitBreaker";
import logger from "../lib/logger";

const router = Router();
const env = getEnv();

// Make sure you have RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

// ═══════════════════════════════════════════
// POST /api/payments/create-order
// ═══════════════════════════════════════════
router.post("/create-order", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { feeId } = req.body;
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

    // Optional: Add parent/student authorization check here

    const totalAmount = fee.amount + fee.fineAmount;

    // Create Razorpay Order with Circuit Breaker protection
    const options = {
      amount: totalAmount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `rcpt_${fee.id.substring(0, 8)}`,
    };

    let order;
    try {
      order = await razorpayCircuitBreaker.fire(() => razorpay.orders.create(options));
    } catch (cbError: any) {
      if (cbError.message.includes("OPEN")) {
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

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transactionId) {
      res.status(400).json({ success: false, error: "Missing payment details" });
      return;
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: "FAILED" },
      });
      res.status(400).json({ success: false, error: "Invalid signature" });
      return;
    }

    // Compute idempotency key for DB-level dedup
    const idempotencyKey = computePaymentIdempotencyKey(razorpay_order_id, razorpay_payment_id);

    // ── Atomic transaction: update payment + invoice + ledger ──
    const result = await prisma.$transaction(async (tx) => {
      // Check if already processed by gatewayPaymentId (idempotency guard)
      const existingByGateway = await tx.paymentTransaction.findUnique({
        where: { gatewayPaymentId: razorpay_payment_id },
      });

      if (existingByGateway && existingByGateway.status === "SUCCESS") {
        return { alreadyProcessed: true, receiptNo: null };
      }

      // Update transaction status
      const transaction = await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          gatewayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "SUCCESS",
          paidAt: new Date(),
          idempotencyKey,
        },
      });

      // Update Invoice status
      const receiptNo = `REC-${Date.now()}`;
      await tx.invoice.update({
        where: { id: transaction.invoiceId },
        data: {
          status: "PAID",
          paidDate: new Date(),
          receiptNo,
          amountPaid: { increment: transaction.amountPaid },
        },
      });

      return { alreadyProcessed: false, receiptNo, transaction };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (result.alreadyProcessed) {
      res.json({ success: true, message: "Payment already verified" });
      return;
    }

    // ── Ledger posting (outside main transaction to avoid holding serializable lock) ──
    if (result.transaction) {
      const feeRecord = await prisma.invoice.findUnique({ where: { id: result.transaction.invoiceId } });

      if (feeRecord) {
        const bankAcc = await prisma.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId: feeRecord.schoolId, code: "1010-BANK" } },
        });
        const revAcc = await prisma.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId: feeRecord.schoolId, code: "4000-TUIT" } },
        });

        if (bankAcc && revAcc) {
          try {
            await LedgerService.postTransaction({
              schoolId: feeRecord.schoolId,
              referenceType: "PAYMENT",
              referenceId: result.transaction.id,
              sourceModule: "FEES",
              description: `Payment verified for Invoice ${feeRecord.id}`,
              postingDate: new Date(),
              createdBy: req.user?.id || "SYSTEM",
              entries: [
                { accountId: bankAcc.id, debitAmount: result.transaction.amountPaid, creditAmount: 0 },
                { accountId: revAcc.id, debitAmount: 0, creditAmount: result.transaction.amountPaid },
              ],
            });
            logger.info({ transactionId: result.transaction.id }, "[Ledger] Payment posted to Immutable Ledger");
          } catch (ledgerError) {
            logger.error({ err: ledgerError, transactionId: result.transaction.id }, "[Ledger] Failed to post payment");
          }
        }
      }
    }

    res.json({ success: true, message: "Payment verified successfully", receiptNo: result.receiptNo });
  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    res.status(500).json({ success: false, error: "Server error verifying payment" });
  }
});

// ═══════════════════════════════════════════
// POST /api/payments/trigger-late-fines
// ═══════════════════════════════════════════
// This should ideally be protected by a CRON_SECRET or Admin auth
router.post("/trigger-late-fines", async (req: AuthRequest, res: Response) => {
  try {
    const overdueFees = await prisma.invoice.findMany({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    });

    let updatedCount = 0;

    for (const fee of overdueFees) {
      if (fee.fineAmount === 0) {
        await prisma.invoice.update({
          where: { id: fee.id },
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
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookBody = req.body;

    // ── 1. HMAC Signature Validation ──
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
    const payloadString = JSON.stringify(webhookBody);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");

    if (expectedSignature !== signature) {
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

    // ── 2. Replay Protection (5-minute window) ──
    const createdAt = webhookBody.created_at;
    if (createdAt) {
      const now = Math.floor(Date.now() / 1000);
      if (now - createdAt > 300) {
        logger.warn({ createdAt, now }, "Webhook replay detected — stale event");
        // Still return 200 so Razorpay stops retrying
        res.status(200).json({ success: true, message: "Stale event ignored" });
        return;
      }
    }

    // ── 3. Process Payment Events ──
    if (webhookBody.event === "payment.captured" || webhookBody.event === "order.paid") {
      const paymentEntity = webhookBody.payload?.payment?.entity;
      if (!paymentEntity) {
        res.status(200).json({ success: true, message: "Ignored — no payment entity" });
        return;
      }

      const gatewayPaymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const razorpayEventId = req.headers["x-razorpay-event-id"] as string;

      // Compute deterministic idempotency key
      const idempotencyKey = razorpayEventId
        ? crypto.createHash("sha256").update(razorpayEventId).digest("hex")
        : crypto.createHash("sha256").update(payloadString).digest("hex");

      // Fast-path: Redis SETNX Idempotency Lock
      // Use 'system' as schoolId if we don't have it parsed yet
      const lockAcquired = await IdempotencyService.acquireLock("system", idempotencyKey);
      if (!lockAcquired) {
        logger.info({ idempotencyKey, gatewayPaymentId }, "Webhook duplicate detected (Redis lock)");
        res.status(200).json({ success: true, message: "Already processed" });
        return;
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // ── Idempotency Check 1: By idempotency key ──
          const existingByEvent = await tx.paymentTransaction.findFirst({
            where: { idempotencyKey },
          });

          if (existingByEvent) {
            logger.info({ idempotencyKey, gatewayPaymentId }, "Webhook duplicate detected (idempotency key)");
            return { alreadyProcessed: true };
          }

          // ── Idempotency Check 2: By gateway payment ID ──
          const existingByGateway = await tx.paymentTransaction.findUnique({
            where: { gatewayPaymentId },
          });

          if (existingByGateway) {
            logger.info({ gatewayPaymentId }, "Webhook duplicate detected (gateway payment ID)");
            // Log to SystemLog for monitoring
            await tx.systemLog.create({
              data: {
                level: "WARN",
                module: "PAYMENT_WEBHOOK",
                message: `Duplicate webhook for payment ${gatewayPaymentId}`,
                metadata: JSON.stringify({ event: webhookBody.event, razorpayEventId }),
              },
            });
            return { alreadyProcessed: true };
          }

          // ── Find the original transaction by Razorpay order ID ──
          const transaction = await tx.paymentTransaction.findUnique({
            where: { transactionId: orderId },
          });

          if (!transaction) {
            logger.error({ orderId }, "Transaction not found for webhook orderId");
            // Create a SystemLog entry for manual investigation
            await tx.systemLog.create({
              data: {
                level: "ERROR",
                module: "PAYMENT_WEBHOOK",
                message: `No transaction found for orderId: ${orderId}`,
                metadata: JSON.stringify({ gatewayPaymentId, event: webhookBody.event }),
              },
            });
            // Still return 200 to Razorpay (don't retry what we can't process)
            return { alreadyProcessed: true, notFound: true };
          }

          if (transaction.status === "SUCCESS") {
            return { alreadyProcessed: true };
          }

          // ── Atomically update payment + invoice ──
          const receiptNo = `REC-${Date.now()}`;

          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              gatewayPaymentId,
              status: "SUCCESS",
              paidAt: new Date(),
              idempotencyKey,
            },
          });

          await tx.invoice.update({
            where: { id: transaction.invoiceId },
            data: {
              status: "PAID",
              paidDate: new Date(),
              receiptNo,
              amountPaid: { increment: transaction.amountPaid },
            },
          });

          // ── Post to ledger within the same transaction context ──
          const invoice = await tx.invoice.findUnique({ where: { id: transaction.invoiceId } });

          if (invoice) {
            const bankAcc = await tx.ledgerAccount.findUnique({
              where: { schoolId_code: { schoolId: invoice.schoolId, code: "1010-BANK" } },
            });
            const revAcc = await tx.ledgerAccount.findUnique({
              where: { schoolId_code: { schoolId: invoice.schoolId, code: "4000-TUIT" } },
            });

            if (bankAcc && revAcc) {
              // Generate transaction number
              const counter = await tx.sequenceCounter.upsert({
                where: { schoolId_key: { schoolId: invoice.schoolId, key: "LEDGER_TXN" } },
                update: { currentValue: { increment: 1 } },
                create: { schoolId: invoice.schoolId, key: "LEDGER_TXN", currentValue: 1 },
              });

              const txnNumber = `LED-${new Date().getFullYear()}-${String(counter.currentValue).padStart(6, "0")}`;

              // Hash chain
              const lastTx = await tx.ledgerTransaction.findFirst({
                where: { schoolId: invoice.schoolId },
                orderBy: { postingDate: "desc" },
              });

              const previousHash = lastTx?.hash || "GENESIS_HASH";
              const entries = [
                { accountId: bankAcc.id, debitAmount: transaction.amountPaid, creditAmount: 0 },
                { accountId: revAcc.id, debitAmount: 0, creditAmount: transaction.amountPaid },
              ];

              const payloadForHash = JSON.stringify({
                txnNumber,
                schoolId: invoice.schoolId,
                referenceId: transaction.id,
                entries,
                previousHash,
              });

              const currentHash = crypto.createHash("sha256").update(payloadForHash).digest("hex");

              await tx.ledgerTransaction.create({
                data: {
                  schoolId: invoice.schoolId,
                  transactionNumber: txnNumber,
                  referenceType: "PAYMENT",
                  referenceId: transaction.id,
                  sourceModule: "FEES",
                  description: `Webhook payment for Invoice ${invoice.id}`,
                  source: "SYSTEM",
                  postingDate: new Date(),
                  previousHash,
                  hash: currentHash,
                  createdBy: "WEBHOOK_SYSTEM",
                  eventPublished: true,
                  LedgerEntry: {
                    create: entries.map((e) => ({
                      accountId: e.accountId,
                      debitAmount: e.debitAmount,
                      creditAmount: e.creditAmount,
                    })),
                  },
                },
              });

              logger.info({ transactionId: transaction.id, txnNumber }, "[Webhook] Ledger entry posted atomically");
            }
          }

          return { alreadyProcessed: false };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        if (result.alreadyProcessed) {
          // Razorpay requires 200 for duplicates
          res.status(200).json({ success: true, message: "Already processed" });
          return;
        }
      } catch (txError: any) {
        // Serialization failure → tell Razorpay to retry
        if (txError.code === "P2034" || txError.message?.includes("serialization")) {
          logger.warn({ err: txError, gatewayPaymentId }, "Serialization conflict in webhook — Razorpay will retry");
          await IdempotencyService.releaseLock("system", idempotencyKey);
          res.status(500).json({ success: false, error: "Concurrency error, retry later" });
          return;
        }

        // Unique constraint violation → duplicate (race condition handled gracefully)
        if (txError.code === "P2002") {
          logger.info({ gatewayPaymentId }, "Duplicate caught by unique constraint");
          res.status(200).json({ success: true, message: "Already processed" });
          return;
        }

        logger.error({ err: txError, gatewayPaymentId }, "Webhook transaction error");
        await IdempotencyService.releaseLock("system", idempotencyKey);
        res.status(500).json({ success: false, error: "Processing error" });
        return;
      }
    }

    // For all other event types, acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Razorpay Webhook Error");
    res.status(500).json({ success: false });
  }
});

export default router;
