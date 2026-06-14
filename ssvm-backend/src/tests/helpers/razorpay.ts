import crypto from 'crypto';

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
