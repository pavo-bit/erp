import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import crypto from "crypto";
import webhooksRouter from "../../routes/webhooks";
import { IdempotencyService } from "../../services/idempotency.service";
import prisma from "../../lib/prisma";

// Mock Idempotency Service
vi.mock("../../services/idempotency.service", () => ({
  IdempotencyService: {
    acquireLock: vi.fn(),
  }
}));

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  default: {
    invoice: { findUnique: vi.fn(), update: vi.fn() },
    ledgerAccount: { findFirst: vi.fn() },
    failedWebhook: { create: vi.fn() },
    $transaction: vi.fn((callback) => callback(prisma)),
    paymentTransaction: { create: vi.fn() },
  }
}));

// Mock LedgerEngine
vi.mock("../../lib/ledgerEngine", () => ({
  LedgerEngine: {
    postTransaction: vi.fn(),
  }
}));

const app = express();
app.use(express.json());
app.use("/api/v1/webhooks", webhooksRouter);

describe("Razorpay Webhooks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_secret";
  });

  const generateSignature = (payload: any) => {
    return crypto.createHmac("sha256", "test_secret").update(JSON.stringify(payload)).digest("hex");
  };

  it("should process payment.captured successfully", async () => {
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test123",
            amount: 10000, // 100 INR
            notes: { invoiceId: "inv_123" }
          }
        }
      }
    };

    // Simulate Idempotency lock acquired successfully
    vi.mocked(IdempotencyService.acquireLock).mockResolvedValue(true);

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv_123",
      schoolId: "school_1",
      amountPaid: 0,
      remainingAmount: 100,
      status: "PENDING"
    } as any);

    vi.mocked(prisma.ledgerAccount.findFirst).mockResolvedValue({ id: "acc_1" } as any);

    // Provide expected event ID via header
    const response = await request(app)
      .post("/api/v1/webhooks/razorpay")
      .set("x-razorpay-signature", generateSignature(payload))
      .set("x-razorpay-event-id", "evt_123")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(IdempotencyService.acquireLock).toHaveBeenCalledWith("RAZORPAY_WEBHOOK", "evt_123");
    expect(prisma.paymentTransaction.create).toHaveBeenCalled();
    expect(prisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "inv_123" },
      data: expect.objectContaining({ status: "PAID" })
    }));
  });

  it("should block duplicate webhook using idempotency lock", async () => {
    const payload = { event: "payment.captured", payload: { payment: { entity: { id: "pay_dup" } } } };

    // Simulate lock NOT acquired (already locked)
    vi.mocked(IdempotencyService.acquireLock).mockResolvedValue(false);

    const response = await request(app)
      .post("/api/v1/webhooks/razorpay")
      .set("x-razorpay-signature", generateSignature(payload))
      .set("x-razorpay-event-id", "evt_dup")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Duplicate event suppressed");
    
    // Ensure business logic is NOT called
    expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  it("should handle payment.failed event by routing to DLQ", async () => {
    const payload = {
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_fail123",
            error_description: "Insufficient funds"
          }
        }
      }
    };

    vi.mocked(IdempotencyService.acquireLock).mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/webhooks/razorpay")
      .set("x-razorpay-signature", generateSignature(payload))
      .send(payload);

    expect(response.status).toBe(200);
    expect((prisma as any).failedWebhook.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        errorMessage: "Insufficient funds"
      })
    }));
  });

  it("should reject webhook with invalid signature", async () => {
    const payload = { event: "payment.captured" };

    const response = await request(app)
      .post("/api/v1/webhooks/razorpay")
      .set("x-razorpay-signature", "invalid_sig")
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid signature");
  });
});
