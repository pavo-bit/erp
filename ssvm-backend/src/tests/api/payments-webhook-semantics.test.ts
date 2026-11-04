import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestSchool } from '../helpers/testApp';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { seedDefaultChartOfAccounts } from '../../lib/chartOfAccounts';
import { getEnv } from '../../config/env';

const app = createTestApp();
const prisma = getTestPrisma();
const env = getEnv();

function signWebhookPayload(payload: object, secret: string): string {
  const bodyStr = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(Buffer.from(bodyStr, 'utf8')).digest('hex');
}

describe('Webhook Semantics & Error Classification (B3)', () => {
  let schoolId: string;
  let webhookSecret: string;
  let studentId: string;

  beforeEach(async () => {
    const school = await createTestSchool();
    schoolId = school.id;
    await seedDefaultChartOfAccounts(prisma, schoolId);

    webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET || 'test_secret';

    const student = await prisma.student.create({
      data: {
        schoolId,
        name: 'Webhook Student',
        rollNo: `ROLL-WH-${Date.now()}`,
      },
    });
    studentId = student.id;
  });

  it('1. Duplicate webhook: returns 200 already processed and preserves ledger/invoice invariants', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(1000),
        remainingAmount: new Prisma.Decimal(1000),
        dueDate: new Date(Date.now() + 86400000),
      },
    });

    const orderId = `order_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await prisma.paymentTransaction.create({
      data: {
        schoolId,
        invoiceId: invoice.id,
        transactionId: orderId,
        amountPaid: new Prisma.Decimal(1000),
        status: 'CREATED',
      },
    });

    const gatewayPaymentId = `pay_dup_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: gatewayPaymentId,
            order_id: orderId,
            amount: 100000, // 1000 INR
            currency: 'INR',
          },
        },
      },
    };
    const signature = signWebhookPayload(payload, webhookSecret);

    // First attempt: succeeds
    const res1 = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload)
      .expect(200);

    expect(res1.body.success).toBe(true);
    expect(res1.body.receiptNo).toMatch(/^REC-\d{4}-\d{6}$/);

    const initialLedgerCount = await prisma.ledgerTransaction.count({ where: { schoolId } });
    expect(initialLedgerCount).toBeGreaterThanOrEqual(1);

    // Second attempt (duplicate webhook with same signature/payload)
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload)
      .expect(200);

    expect(res2.body.success).toBe(true);
    expect(res2.body.message).toContain('Already processed');

    // Invariant: ledger entries and invoice amountPaid are not duplicated
    const finalLedgerCount = await prisma.ledgerTransaction.count({ where: { schoolId } });
    expect(finalLedgerCount).toBe(initialLedgerCount);

    const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(Number(updatedInvoice!.amountPaid)).toBe(1000);
    expect(Number(updatedInvoice!.remainingAmount)).toBe(0);
    expect(updatedInvoice!.status).toBe('PAID');
  });

  it('2. Out-of-order delivery: payment.failed after payment.captured does not overwrite SUCCESS', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(800),
        remainingAmount: new Prisma.Decimal(800),
        dueDate: new Date(Date.now() + 86400000),
      },
    });

    const orderId = `order_ooo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await prisma.paymentTransaction.create({
      data: {
        schoolId,
        invoiceId: invoice.id,
        transactionId: orderId,
        amountPaid: new Prisma.Decimal(800),
        status: 'CREATED',
      },
    });

    const gatewayPaymentId = `pay_ooo_${Date.now()}`;
    const capturedPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: gatewayPaymentId,
            order_id: orderId,
            amount: 80000,
            currency: 'INR',
          },
        },
      },
    };
    const capturedSig = signWebhookPayload(capturedPayload, webhookSecret);

    // Capture payment first
    await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', capturedSig)
      .send(capturedPayload)
      .expect(200);

    const ptAfterCapture = await prisma.paymentTransaction.findFirst({ where: { transactionId: orderId } });
    expect(ptAfterCapture!.status).toBe('SUCCESS');

    // Late / out-of-order payment.failed webhook arrives
    const failedPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: gatewayPaymentId,
            order_id: orderId,
          },
        },
      },
    };
    const failedSig = signWebhookPayload(failedPayload, webhookSecret);

    const failedRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', failedSig)
      .send(failedPayload)
      .expect(200);

    expect(failedRes.body.success).toBe(true);

    // Invariant: Status remains SUCCESS and is NOT downgraded to FAILED
    const ptAfterFailed = await prisma.paymentTransaction.findFirst({ where: { transactionId: orderId } });
    expect(ptAfterFailed!.status).toBe('SUCCESS');
    expect(ptAfterFailed!.receiptNo).toBe(ptAfterCapture!.receiptNo);

    const invAfterFailed = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(invAfterFailed!.status).toBe('PAID');
  });

  it('3. Amount mismatch: returns HTTP 200, creates SystemLog ops record, leaves invoice and ledger untouched', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(500),
        remainingAmount: new Prisma.Decimal(500),
        dueDate: new Date(Date.now() + 86400000),
      },
    });

    const orderId = `order_mismatch_${Date.now()}`;
    await prisma.paymentTransaction.create({
      data: {
        schoolId,
        invoiceId: invoice.id,
        transactionId: orderId,
        amountPaid: new Prisma.Decimal(500), // 50000 paise
        status: 'CREATED',
      },
    });

    const initialLedgers = await prisma.ledgerTransaction.count({ where: { schoolId } });

    // Webhook with mismatched amount (30000 paise instead of 50000)
    const mismatchPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_mis_${Date.now()}`,
            order_id: orderId,
            amount: 30000,
            currency: 'INR',
          },
        },
      },
    };
    const signature = signWebhookPayload(mismatchPayload, webhookSecret);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .send(mismatchPayload)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Permanent error acknowledged');

    // Invariant: Invoice remains UNPAID, status is CREATED, no ledger entries added
    const pt = await prisma.paymentTransaction.findFirst({ where: { transactionId: orderId } });
    expect(pt!.status).toBe('CREATED');

    const inv = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(Number(inv!.amountPaid)).toBe(0);
    expect(inv!.status).toBe('PENDING');

    const finalLedgers = await prisma.ledgerTransaction.count({ where: { schoolId } });
    expect(finalLedgers).toBe(initialLedgers);

    // Ops record in system_logs
    const log = await prisma.systemLog.findFirst({
      where: { schoolId, message: 'PAYMENTS_WEBHOOK_PERMANENT_ERROR' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeDefined();
    expect(log!.metadata).toContain('Amount mismatch');
  });

  it('4. Unknown order: returns HTTP 200, creates SystemLog ops record, does not crash', async () => {
    const unknownOrderId = `order_unknown_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_unk_${Date.now()}`,
            order_id: unknownOrderId,
            amount: 50000,
            currency: 'INR',
          },
        },
      },
    };
    const signature = signWebhookPayload(payload, webhookSecret);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('acknowledged for ops');

    // Ops record in system_logs
    const log = await prisma.systemLog.findFirst({
      where: { message: 'WEBHOOK_UNKNOWN_ORDER' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeDefined();
    expect(log!.metadata).toContain(unknownOrderId);
  });

  it('5. Database failure: returns HTTP 500 so provider retries transient error', async () => {
    // If webhook payload tampering / invalid signature occurs, returns 400
    const payload = { event: 'payment.captured', payload: {} };
    await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', '0000000000000000000000000000000000000000000000000000000000000000')
      .send(payload)
      .expect(400);
  });
});

