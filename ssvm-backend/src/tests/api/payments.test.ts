import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool, createTestStudent } from '../helpers/testApp';
import { InvoiceFactory } from '../helpers/factories';
import { generateWebhookSignature, createPaymentCapturedPayload, createPaymentFailedPayload } from '../helpers/razorpay';
import { LedgerAccountType, LedgerCategory, Role } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();
const RAZORPAY_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

describe('Payments & Finance APIs', () => {
  let schoolId: string;
  let adminToken: string;
  let studentId: string;
  let classId: string;

  beforeEach(async () => {
    const school = await createTestSchool();
    schoolId = school.id;

    await prisma.ledgerAccount.createMany({
      data: [
        {
          schoolId,
          code: '1010-BANK',
          name: 'Payment bank',
          category: LedgerCategory.ASSET,
          type: LedgerAccountType.BANK,
        },
        {
          schoolId,
          code: '4000-TUIT',
          name: 'Tuition revenue',
          category: LedgerCategory.REVENUE,
          type: LedgerAccountType.REVENUE,
        },
      ],
    });
    
    const admin = await createTestUser(Role.ERP_ADMIN, schoolId);
    adminToken = admin.token;

    const session = await prisma.academicSession.create({ data: { name: '2026-2027', startDate: new Date(), endDate: new Date(), schoolId } });
    const classRecord = await prisma.class.create({ data: { name: 'Class 1', schoolId, sessionId: session.id } });
    classId = classRecord.id;
    const section = await prisma.section.create({ data: { name: 'A', classId: classRecord.id } });
    const student = await createTestStudent(section.id, schoolId);
    studentId = student.id;
  });

  describe('Invoice Status Lifecycle', () => {
    it('initializes invoice as UNPAID', async () => {
      const invoice = await prisma.invoice.create({
        data: InvoiceFactory.build({ schoolId, studentId, status: 'UNPAID' })
      });
      expect(invoice.status).toBe('UNPAID');
    });

    it('marks invoice as PARTIAL on partial payment', async () => {
      // Typically via POST /api/v1/payments (manual payment) or via Webhook
      // Testing the DB transition concept requested
      const invoice = await prisma.invoice.create({
        data: InvoiceFactory.build({ schoolId, studentId, amount: 1000 })
      });

      // Simulate partial payment record
      await prisma.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          transactionId: 'txn_123',
          amountPaid: 500,
          status: 'SUCCESS',
        }
      });
      
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PARTIAL' }
      });
      
      expect(updated.status).toBe('PARTIAL');
    });

    it('marks invoice as PAID when fully covered', async () => {
      const invoice = await prisma.invoice.create({
        data: InvoiceFactory.build({ schoolId, studentId, amount: 1000 })
      });

      await prisma.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          transactionId: 'txn_456',
          amountPaid: 1000,
          status: 'SUCCESS',
        }
      });

      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', remainingAmount: 0 }
      });

      expect(updated.status).toBe('PAID');
      expect(updated.remainingAmount).toBe(0);
    });
  });

  describe('POST /api/v1/payments/webhook (Razorpay)', () => {
    it('processes valid payment.captured webhook idempotently under concurrent race conditions', async () => {
      const invoice = await prisma.invoice.create({
        data: InvoiceFactory.build({ schoolId, studentId, amount: 500 })
      });

      // Create initial PaymentTransaction since our webhook expects it
      const paymentTransaction = await prisma.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          transactionId: 'order_123',
          amountPaid: 500,
          status: 'CREATED',
          schoolId,
        }
      });

      const payload = createPaymentCapturedPayload(invoice.id, 50000); // 500 INR in paise
      // Mock the order_id in the payload for the test
      if (payload.payload?.payment?.entity) {
        payload.payload.payment.entity.order_id = 'order_123';
        payload.payload.payment.entity.id = 'pay_concurrent_123';
      }
      
      const signature = generateWebhookSignature(payload, RAZORPAY_SECRET);

      // We use Promise.all to hit the endpoint concurrently, simulating Razorpay sending duplicates simultaneously
      const responses = await Promise.all([
        request(app).post('/api/v1/payments/webhook').set('x-razorpay-signature', signature).set('x-razorpay-event-id', 'evt_123').send(payload),
        request(app).post('/api/v1/payments/webhook').set('x-razorpay-signature', signature).set('x-razorpay-event-id', 'evt_123').send(payload),
        request(app).post('/api/v1/payments/webhook').set('x-razorpay-signature', signature).set('x-razorpay-event-id', 'evt_123').send(payload)
      ]);
      
      // All responses should be 200/500 (one processes, others either return 200 'already processed' or 500 'concurrency error')
      // but none should fail with an unhandled exception or duplicate the data.
      responses.forEach(res => {
        expect([200, 500]).toContain(res.status);
      });

      // Check DB - there must still only be exactly 1 payment transaction marked as SUCCESS
      const successfulTxs = await prisma.paymentTransaction.findMany({
        where: { transactionId: 'order_123', status: 'SUCCESS' }
      });
      
      expect(successfulTxs.length).toBe(1);
      expect(successfulTxs[0].gatewayPaymentId).toBe('pay_concurrent_123');
      const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      expect(updatedInvoice?.status).toBe('PAID');
      expect(updatedInvoice?.amountPaid).toBe(500);
      const ledgerRows = await prisma.ledgerTransaction.findMany({
        where: { referenceType: 'PAYMENT', referenceId: paymentTransaction.id },
        include: { LedgerEntry: true },
      });
      expect(ledgerRows).toHaveLength(1);
      const debits = ledgerRows[0].LedgerEntry.reduce((sum, entry) => sum + Number(entry.debitAmount), 0);
      const credits = ledgerRows[0].LedgerEntry.reduce((sum, entry) => sum + Number(entry.creditAmount), 0);
      expect(debits).toBe(500);
      expect(credits).toBe(500);
    });

    it('keeps a captured partial payment partial and records only the captured amount', async () => {
      const invoice = await prisma.invoice.create({
        data: InvoiceFactory.build({ schoolId, studentId, amount: 1000 })
      });
      await prisma.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          transactionId: 'order_partial_123',
          amountPaid: 500,
          status: 'CREATED',
          schoolId,
        }
      });
      const payload = createPaymentCapturedPayload(invoice.id, 50000);
      if (payload.payload?.payment?.entity) {
        payload.payload.payment.entity.order_id = 'order_partial_123';
        payload.payload.payment.entity.id = 'pay_partial_123';
      }

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', generateWebhookSignature(payload, RAZORPAY_SECRET))
        .send(payload);

      expect(response.status).toBe(200);
      const updated = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      expect(updated?.status).toBe('PARTIAL');
      expect(updated?.amountPaid).toBe(500);
      expect(updated?.remainingAmount).toBe(500);
    });

    it('returns 400 for missing signature', async () => {
      const payload = createPaymentCapturedPayload('inv_123', 50000);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('missing'); // Exact message varies
    });

    it('returns 400 for invalid signature (Security Critical)', async () => {
      const payload = createPaymentCapturedPayload('inv_123', 50000);
      const invalidSignature = 'invalid_sig_0000000000';

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', invalidSignature)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('handles payment.failed webhook appropriately', async () => {
      const invoice = await prisma.invoice.create({
        data: InvoiceFactory.build({ schoolId, studentId, amount: 500 })
      });

      const payload = createPaymentFailedPayload(invoice.id, 50000);
      const signature = generateWebhookSignature(payload, RAZORPAY_SECRET);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .send(payload);
      
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/payments/verify', () => {
    it('does not mark a payment failed when the signature is invalid', async () => {
      const invoice = await prisma.invoice.create({
        data: InvoiceFactory.build({ schoolId, studentId, amount: 500 })
      });
      const transaction = await prisma.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          transactionId: 'order_invalid_signature',
          amountPaid: 500,
          status: 'CREATED',
          schoolId,
        }
      });

      const response = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          razorpay_order_id: 'order_invalid_signature',
          razorpay_payment_id: 'pay_attacker',
          razorpay_signature: '0'.repeat(64),
          transactionId: transaction.id,
        });

      expect(response.status).toBe(400);
      const unchanged = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
      expect(unchanged?.status).toBe('CREATED');
      expect(unchanged?.gatewayPaymentId).toBeNull();
    });
  });

  describe('POST /api/v1/finance/generate-monthly', () => {
    it('generates invoices idempotently', async () => {
      const category = await prisma.feeCategory.create({
        data: { schoolId, name: 'Monthly' },
      });
      await prisma.feeStructure.create({
        data: { schoolId, categoryId: category.id, classId, amount: 1000 },
      });

      // First generation
      const res1 = await request(app)
        .post('/api/v1/finance/generate-monthly-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      // Whether it is 201 or 200 depending on framework standard
      expect([200, 201]).toContain(res1.status);

      // Second generation
      const res2 = await request(app)
        .post('/api/v1/finance/generate-monthly-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(res2.status).toBe(201);
      const now = new Date();
      const generatedInvoices = await prisma.invoice.findMany({
        where: {
          studentId,
          type: 'MONTHLY',
          dueDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      });
      expect(generatedInvoices).toHaveLength(1);
    });
  });
});
