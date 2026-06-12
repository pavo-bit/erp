import { Router, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate } from "../middleware/auth";
import { getEnv } from "../config/env";

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
      await prisma.invoice.update({
        where: { id: transaction.invoiceId },
        data: {
          status: "PAID",
          paidDate: new Date(),
          receiptNo,
        },
      });

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

export default router;
