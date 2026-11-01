import crypto from 'node:crypto';
import type Razorpay from 'razorpay';
import { vi } from 'vitest';

type RazorpayClient = InstanceType<typeof Razorpay>;
type RazorpayOrderResponse = Awaited<ReturnType<RazorpayClient['orders']['create']>>;
type RazorpayPaymentResponse = Awaited<ReturnType<RazorpayClient['payments']['fetch']>>;

type OrderFixture = Pick<
  RazorpayOrderResponse,
  'id' | 'entity' | 'amount' | 'amount_paid' | 'amount_due' | 'currency' | 'status' | 'attempts' | 'created_at'
>;
type PaymentFixture = Pick<
  RazorpayPaymentResponse,
  'id' | 'entity' | 'order_id' | 'amount' | 'currency' | 'status' | 'captured'
>;

export function createRazorpayFake() {
  const order: OrderFixture = {
    id: 'order_mock123',
    entity: 'order',
    amount: 1000,
    amount_paid: 0,
    amount_due: 1000,
    currency: 'INR',
    status: 'created',
    attempts: 0,
    created_at: 1_767_225_600,
  };
  const payment: PaymentFixture = {
    id: 'pay_mock123',
    entity: 'payment',
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    status: 'captured',
    captured: true,
  };

  return {
    orders: {
      create: vi.fn(async (..._args: Parameters<RazorpayClient['orders']['create']>) => order),
    },
    payments: {
      fetch: vi.fn(async (..._args: Parameters<RazorpayClient['payments']['fetch']>) => payment),
    },
  };
}

/**
 * Generates a valid HMAC SHA256 signature for Razorpay webhooks.
 */
export function generateWebhookSignature(body: string | object, secret: string): string {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Creates a mock Razorpay `payment.captured` webhook payload.
 */
export function createPaymentCapturedPayload(invoiceId: string, amountInPaise: number, transactionId: string = `txn_${Date.now()}`) {
  return {
    entity: 'event',
    account_id: 'acc_mock123',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: transactionId,
          entity: 'payment',
          amount: amountInPaise,
          currency: 'INR',
          status: 'captured',
          order_id: `order_${Date.now()}`,
          notes: {
            invoiceId,
          }
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  };
}

/**
 * Creates a mock Razorpay `payment.failed` webhook payload.
 */
export function createPaymentFailedPayload(invoiceId: string, amountInPaise: number, transactionId: string = `txn_${Date.now()}`) {
  return {
    entity: 'event',
    account_id: 'acc_mock123',
    event: 'payment.failed',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: transactionId,
          entity: 'payment',
          amount: amountInPaise,
          currency: 'INR',
          status: 'failed',
          order_id: `order_${Date.now()}`,
          notes: {
            invoiceId,
          },
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Payment failed due to insufficient funds',
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  };
}
