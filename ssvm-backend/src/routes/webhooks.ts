import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireSchoolAccess, requireRole, AuthRequest } from "../middleware/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import { webhookProcessingTotal } from "../middleware/metrics";

const prisma = new PrismaClient();
const router = Router();

// Webhook creation validator
const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  enabled: z.boolean().optional(),
});

/**
 * @route GET /api/v1/webhooks
 * @desc Get all webhooks for a school
 */
router.get("/", authenticate, requireSchoolAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { schoolId },
    });

    res.json({ webhooks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

/**
 * @route POST /api/v1/webhooks
 * @desc Create a new webhook endpoint
 */
router.post(
  "/",
  authenticate,
  requireSchoolAccess,
  requireRole(Role.ERP_ADMIN, Role.SUPER_ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({ error: "School ID is required" });
      }

      const parsed = webhookSchema.parse(req.body);
      const secret = "ssvm_wh_" + crypto.randomBytes(32).toString("hex");

      const webhook = await prisma.webhookEndpoint.create({
        data: {
          schoolId,
          url: parsed.url,
          secret,
          events: parsed.events,
          enabled: parsed.enabled !== false,
        },
      });

      res.status(201).json({
        message: "Webhook created successfully",
        webhook,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create webhook" });
    }
  }
);

/**
 * @route DELETE /api/v1/webhooks/:id
 * @desc Delete a webhook endpoint
 */
router.delete(
  "/:id",
  authenticate,
  requireSchoolAccess,
  requireRole(Role.ERP_ADMIN, Role.SUPER_ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.schoolId;
      const { id } = req.params;

      const webhook = await prisma.webhookEndpoint.findFirst({
        where: { id: id as string, schoolId },
      });

      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      await prisma.webhookEndpoint.delete({ where: { id: id as string } });

      res.json({ message: "Webhook deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  }
);

/**
 * @route POST /api/v1/webhooks/razorpay
 * @desc Enterprise-grade Razorpay Webhook listener with Signature Validation
 */
router.post("/razorpay", async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    webhookProcessingTotal.labels("razorpay", "error_config", "unknown").inc();
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    webhookProcessingTotal.labels("razorpay", "error_missing_signature", "unknown").inc();
    return res.status(400).json({ error: "Missing signature" });
  }

  try {
    const bodyString = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyString)
      .digest("hex");

    const eventType = req.body?.event || "unknown";

    if (expectedSignature !== signature) {
      webhookProcessingTotal.labels("razorpay", "error_signature", eventType).inc();
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;
    console.log(`[Webhook] Received Razorpay event: ${event.event}`);

    // Process event (e.g. payment.captured)
    if (event.event === "payment.captured") {
      const paymentData = event.payload.payment.entity;
      const invoiceId = paymentData.notes?.invoiceId;
      const amountPaid = paymentData.amount / 100; // Razorpay amounts are in paise

      if (!invoiceId) {
        console.error("Webhook received payment without invoiceId in notes");
        webhookProcessingTotal.labels("razorpay", "error_missing_invoice_id", eventType).inc();
        return res.status(400).json({ error: "Missing invoiceId" });
      }

      // 1. Fetch Invoice
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { school: true }
      });

      if (!invoice) {
        console.error({ invoiceId }, "Webhook received payment for unknown invoice");
        webhookProcessingTotal.labels("razorpay", "error_invoice_not_found", eventType).inc();
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Check if already paid
      if (invoice.status === "PAID") {
        webhookProcessingTotal.labels("razorpay", "success_duplicate", eventType).inc();
        return res.status(200).json({ status: "ok", message: "Already processed" });
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
        console.error("Missing system ledger accounts for payment processing");
        webhookProcessingTotal.labels("razorpay", "error_ledger_config", eventType).inc();
        return res.status(500).json({ error: "System configuration error" });
      }

      const { LedgerEngine } = await import("../lib/ledgerEngine");

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

      console.log(`Payment successfully processed and booked to Ledger for invoice ${invoiceId}`);
    }
    webhookProcessingTotal.labels("razorpay", "success", eventType).inc();
    res.json({ success: true, message: "Webhook processed securely" });
  } catch (error) {
    const eventType = req.body?.event || "unknown";
    webhookProcessingTotal.labels("razorpay", "error_processing", eventType).inc();
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
