import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import { LedgerEngine } from "../../lib/ledgerEngine";
import { getEnv } from "../../config/env";

const router = Router();
const env = getEnv();

/**
 * Validates the Razorpay/Stripe webhook signature
 */
function isValidSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

// POST /api/v1/webhooks/payments
router.post("/", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    
    // In production, req.body should be the raw buffer for signature verification.
    // Assuming express.raw() or similar is configured for /webhooks
    const rawBody = JSON.stringify(req.body); 

    if (env.NODE_ENV === "production" && !isValidSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET || "")) {
      logger.warn({ ip: req.ip }, "Invalid webhook signature detected");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const event = req.body;

    // Handle payment.captured event
    if (event.event === "payment.captured") {
      const paymentData = event.payload.payment.entity;
      const invoiceId = paymentData.notes.invoiceId;
      const amountPaid = paymentData.amount / 100; // Razorpay amounts are in paise

      if (!invoiceId) {
        logger.error("Webhook received payment without invoiceId in notes");
        res.status(400).json({ error: "Missing invoiceId" });
        return;
      }

      // 1. Fetch Invoice
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { school: true }
      });

      if (!invoice) {
        logger.error({ invoiceId }, "Webhook received payment for unknown invoice");
        res.status(404).json({ error: "Invoice not found" });
        return;
      }

      // Check if already paid
      if (invoice.status === "PAID") {
        res.status(200).json({ status: "ok", message: "Already processed" });
        return;
      }

      const schoolId = invoice.schoolId;

      // System Accounts mapping (1200: AR, 1000: Cash/Bank)
      const receivableAccount = await prisma.ledgerAccount.findFirst({
        where: { schoolId, category: "ASSET", code: "1200" }
      });
      const bankAccount = await prisma.ledgerAccount.findFirst({
        where: { schoolId, category: "ASSET", code: "1000" } 
      });

      if (!receivableAccount || !bankAccount) {
        logger.error("Missing system ledger accounts for payment processing");
        res.status(500).json({ error: "System configuration error" });
        return;
      }

      // 2. Process Atomically
      await prisma.$transaction(async (tx: any) => {
        // Record Payment Transaction
        await tx.paymentTransaction.create({
          data: {
            invoiceId,
            amountPaid,
            gateway: "RAZORPAY",
            transactionId: paymentData.id,
          }
        });

        // Update Invoice Status
        const newRemaining = invoice.remainingAmount - amountPaid;
        const newStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: invoice.amountPaid + amountPaid,
            remainingAmount: Math.max(0, newRemaining),
            status: newStatus,
            paidDate: newStatus === "PAID" ? new Date() : null,
          }
        });

        // Post to Double-Entry Ledger: Debit Bank, Credit Accounts Receivable
        await LedgerEngine.postTransaction({
          schoolId,
          referenceType: "PAYMENT",
          referenceId: paymentData.id,
          description: `Payment Receipt: Invoice ${invoiceId}`,
          createdBy: "SYSTEM", // Webhook is automated
          entries: [
            {
              accountId: bankAccount.id,
              debitAmount: amountPaid,
              creditAmount: 0,
              description: "Cash/Bank Inflow",
            },
            {
              accountId: receivableAccount.id,
              debitAmount: 0,
              creditAmount: amountPaid,
              description: "Clear Accounts Receivable",
            }
          ]
        });
      });

      logger.info({ invoiceId, amountPaid, transactionId: paymentData.id }, "Payment successfully processed and booked to Ledger");
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    logger.error({ error }, "Error processing payment webhook");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
