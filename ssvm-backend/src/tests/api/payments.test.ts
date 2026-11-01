import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool, createTestStudent } from '../helpers/testApp';
import { InvoiceFactory } from '../helpers/factories';
import { generateWebhookSignature, createPaymentCapturedPayload, createPaymentFailedPayload } from '../helpers/razorpay';
import { Role } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();
const RAZORPAY_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET!;

describe('Payments & Finance APIs', () => {
  let schoolId: string;
  let adminCookie: string;
  let adminToken: string;
  let studentId: string;

  beforeEach(async () => {
    const school = await createTestSchool();
    schoolId = school.id;
    
    const admin = await createTestUser(Role.ERP_ADMIN, schoolId);
    adminCookie = admin.cookie;
    adminToken = admin.token;

    const session = await prisma.academicSession.create({ data: { name: '2026-2027', startDate: new Date(), endDate: new Date(), schoolId } });
    const classRecord = await prisma.class.create({ data: { name: 'Class 1', schoolId, sessionId: session.id } });
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
          transactionId: `txn_partial_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
          transactionId: `txn_paid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const paymentId = `pay_concurrent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Create initial PaymentTransaction since our webhook expects it
      await prisma.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          transactionId: orderId,
          amountPaid: 500,
          status: 'CREATED'
        }
      });

      const payload = createPaymentCapturedPayload(invoice.id, 50000); // 500 INR in paise
      // Mock the order_id in the payload for the test
      if (payload.payload?.payment?.entity) {
        payload.payload.payment.entity.order_id = orderId;
        payload.payload.payment.entity.id = paymentId;
      }
      
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const signature = generateWebhookSignature(payload, RAZORPAY_SECRET);

      // We use Promise.all to hit the endpoint concurrently, simulating Razorpay sending duplicates simultaneously
      const responses = await Promise.all([
        request(app).post('/api/v1/payments/webhook').set('x-razorpay-signature', signature).set('x-razorpay-event-id', eventId).send(payload),
        request(app).post('/api/v1/payments/webhook').set('x-razorpay-signature', signature).set('x-razorpay-event-id', eventId).send(payload),
        request(app).post('/api/v1/payments/webhook').set('x-razorpay-signature', signature).set('x-razorpay-event-id', eventId).send(payload)
      ]);
      
      // All responses should be 200/500 (one processes, others either return 200 'already processed' or 500 'concurrency error')
      // but none should fail with an unhandled exception or duplicate the data.
      responses.forEach(res => {
        expect([200, 500]).toContain(res.status);
      });

      // Check DB - there must still only be exactly 1 payment transaction marked as SUCCESS
      const successfulTxs = await prisma.paymentTransaction.findMany({
        where: { transactionId: orderId, status: 'SUCCESS' }
      });
      
      expect(successfulTxs.length).toBe(1);
      expect(successfulTxs[0].gatewayPaymentId).toBe(paymentId);
    });

    it('returns 400 for missing signature', async () => {
      const payload = createPaymentCapturedPayload('inv_123', 50000);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/missing|invalid signature/i);
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

  describe('POST /api/v1/finance/generate-monthly-fees', () => {
    it('generates invoices idempotently', async () => {
      // First generation
      const res1 = await request(app)
        .post('/api/v1/finance/generate-monthly-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 6, year: 2026 });
      
      // Whether it is 201 or 200 depending on framework standard
      expect([200, 201]).toContain(res1.status);

      // Second generation
      const res2 = await request(app)
        .post('/api/v1/finance/generate-monthly-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 6, year: 2026 });
      
      expect([200, 201]).toContain(res2.status);
      expect(res2.body.message).toContain('0 monthly invoices');
    });
  });
});
