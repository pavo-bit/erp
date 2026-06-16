import { Router, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();
import { AuthRequest, authenticate } from "../middleware/auth";
import { getEnv } from "../config/env";
import { LedgerService } from "../services/ledger.service";

const router = Router();
const env = getEnv();

// Make sure you have RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

// POST /api/payments/create-order
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

    // Create Razorpay Order
    const options = {
      amount: totalAmount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `rcpt_${fee.id.substring(0, 8)}`,
    };

    const order = await razorpay.orders.create(options);

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
      },
    });

    res.json({ success: true, order, transactionId: transaction.id });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).json({ success: false, error: "Server error creating order" });
  }
});

// POST /api/payments/verify
router.post("/verify", authenticate, async (req: AuthRequest, res: Response) => {
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

    if (isAuthentic) {
      // Update transaction status
      const transaction = await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          transactionId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "SUCCESS",
        },
      });

      // Update Fee status
      const receiptNo = `REC-${Date.now()}`;
      const feeRecord = await prisma.invoice.findUnique({ where: { id: transaction.invoiceId } });

      await prisma.invoice.update({
        where: { id: transaction.invoiceId },
        data: {
          status: "PAID",
          paidDate: new Date(),
          receiptNo,
        },
      });

      // --- ENTERPRISE LEDGER INTERCEPTION ---
      if (feeRecord) {
        const bankAcc = await prisma.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId: feeRecord.schoolId, code: '1010-BANK' } } });
        const revAcc = await prisma.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId: feeRecord.schoolId, code: '4000-TUIT' } } });

        if (bankAcc && revAcc) {
          try {
            await LedgerService.postTransaction({
              schoolId: feeRecord.schoolId,
              referenceType: "PAYMENT",
              referenceId: transaction.id,
              sourceModule: "FEES",
              description: `Payment verified for Invoice ${feeRecord.id}`,
              postingDate: new Date(),
              createdBy: req.user?.id || "SYSTEM",
              entries: [
                { accountId: bankAcc.id, debitAmount: transaction.amountPaid, creditAmount: 0 },
                { accountId: revAcc.id, debitAmount: 0, creditAmount: transaction.amountPaid }
              ]
            });
            console.log(`[Ledger] Successfully posted Payment ${transaction.id} to Immutable Ledger`);
          } catch (ledgerError) {
            console.error(`[Ledger Error] Failed to post payment to ledger:`, ledgerError);
          }
        }
      }
      // --------------------------------------

      res.json({ success: true, message: "Payment verified successfully", receiptNo });
    } else {
      await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: "FAILED" },
      });
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    res.status(500).json({ success: false, error: "Server error verifying payment" });
  }
});

// POST /api/payments/trigger-late-fines
// This should ideally be protected by a CRON_SECRET or Admin auth
router.post("/trigger-late-fines", async (req: AuthRequest, res: Response) => {
  try {
    // 1. Find all PENDING fees where dueDate < now
    const overdueFees = await prisma.invoice.findMany({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    });

    let updatedCount = 0;

    for (const fee of overdueFees) {
      // Logic for late fine: e.g., flat 50 Rs fine if past due date, or a daily accumulating fine.
      // We will set a flat 50 Rs fine if fineAmount is currently 0.
      if (fee.fineAmount === 0) {
        await prisma.invoice.update({
          where: { id: fee.id },
          data: {
            fineAmount: 50,
            status: "OVERDUE", // Change status to OVERDUE
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

// POST /api/payments/webhook
router.post("/webhook", async (req: import("express").Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookBody = req.body;

    // 1. Validate Signature using HMAC SHA256
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
    const payloadString = JSON.stringify(webhookBody);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");

    if (expectedSignature !== signature) {
      const { logSecurityEvent } = await import("../lib/audit");
      await logSecurityEvent({
        userId: "SYSTEM",
        eventType: "WEBHOOK_TAMPERING",
        severity: "CRITICAL",
        ipAddress: typeof req.ip === "string" ? req.ip : undefined,
        metadata: { signature, expectedSignature }
      });
      res.status(400).json({ success: false, error: "Invalid signature" });
      return;
    }

    // 2. Webhook Replay Protection (5-minute window)
    const createdAt = webhookBody.created_at;
    if (createdAt) {
      const now = Math.floor(Date.now() / 1000);
      if (now - createdAt > 300) {
        res.status(400).json({ success: false, error: "Webhook replay detected" });
        return;
      }
    }

    // 3. Payment Idempotency and Processing
    if (webhookBody.event === "payment.captured" || webhookBody.event === "order.paid") {
      const paymentEntity = webhookBody.payload?.payment?.entity;
      if (!paymentEntity) {
        res.status(200).json({ success: true, message: "Ignored" });
        return;
      }

      const gatewayPaymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const idempotencyKey = (req.headers["x-razorpay-event-id"] as string) || crypto.createHash("sha256").update(payloadString).digest("hex");

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Idempotency check with Serializable isolation
          const existingByEvent = await tx.paymentTransaction.findFirst({
            where: { idempotencyKey }
          });

          if (existingByEvent) {
            return { alreadyProcessed: true };
          }

          const existingByGateway = await tx.paymentTransaction.findUnique({
            where: { gatewayPaymentId }
          });

          if (existingByGateway) {
            return { alreadyProcessed: true };
          }

          const transaction = await tx.paymentTransaction.findUnique({
            where: { transactionId: orderId }
          });

          if (!transaction) {
            throw new Error("Transaction not found for orderId: " + orderId);
          }

          if (transaction.status === "SUCCESS") {
            return { alreadyProcessed: true };
          }

          // Mark Paid and lock with idempotencyKey
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              gatewayPaymentId,
              status: "SUCCESS",
              idempotencyKey
            }
          });

          await tx.invoice.update({
            where: { id: transaction.invoiceId },
            data: {
              status: "PAID",
              paidDate: new Date(),
              receiptNo: `REC-${Date.now()}`
            }
          });

          return { alreadyProcessed: false };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });

        if (result.alreadyProcessed) {
          res.status(200).json({ success: true, message: "Already processed" });
          return;
        }

      } catch (txError) {
        console.error("Transaction Error in Webhook:", txError);
        // If it's a serialization failure, we return 500 to let Razorpay retry
        res.status(500).json({ success: false, error: "Concurrency error, retry later" });
        return;
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay Webhook Error:", error);
    res.status(500).json({ success: false });
  }
});

export default router;
