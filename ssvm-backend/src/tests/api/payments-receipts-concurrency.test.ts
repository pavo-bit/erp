import { describe, it, expect, beforeEach } from 'vitest';
import { getTestPrisma, createTestSchool } from '../helpers/testApp';
import { Prisma } from '@prisma/client';
import { runWithTenantDatabaseTransaction } from '../../lib/prisma';
import crypto from 'crypto';
import { seedDefaultChartOfAccounts } from '../../lib/chartOfAccounts';

const prisma = getTestPrisma();

describe('Receipts Sequential Numbering & Concurrency (B5)', () => {
  let schoolAId: string;
  let schoolBId: string;

  beforeEach(async () => {
    const schoolA = await createTestSchool();
    const schoolB = await createTestSchool();
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;
    await seedDefaultChartOfAccounts(prisma, schoolAId);
    await seedDefaultChartOfAccounts(prisma, schoolBId);
  });

  it('generates unique, strictly increasing receipts across 50 concurrent payments in 2 schools', async () => {
    const currentYear = new Date().getFullYear();
    const countPerSchool = 25; // 25 + 25 = 50 concurrent payments across 2 schools

    // Create 25 student & invoice fixtures in School A
    const schoolAOrders: Array<{ orderId: string; invoiceId: string; amountPaise: number }> = [];
    for (let i = 0; i < countPerSchool; i++) {
      const student = await prisma.student.create({
        data: {
          schoolId: schoolAId,
          name: `Student A${i}`,
          rollNo: `ROLL-A-${Date.now()}-${i}`,
        },
      });
      const invoice = await prisma.invoice.create({
        data: {
          schoolId: schoolAId,
          studentId: student.id,
          amount: new Prisma.Decimal(500),
          remainingAmount: new Prisma.Decimal(500),
          dueDate: new Date(Date.now() + 86400000),
        },
      });
      const orderId = `order_A_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      await prisma.paymentTransaction.create({
        data: {
          schoolId: schoolAId,
          invoiceId: invoice.id,
          transactionId: orderId,
          amountPaid: new Prisma.Decimal(500),
          status: 'CREATED',
        },
      });
      schoolAOrders.push({ orderId, invoiceId: invoice.id, amountPaise: 50000 });
    }

    // Create 25 student & invoice fixtures in School B
    const schoolBOrders: Array<{ orderId: string; invoiceId: string; amountPaise: number }> = [];
    for (let i = 0; i < countPerSchool; i++) {
      const student = await prisma.student.create({
        data: {
          schoolId: schoolBId,
          name: `Student B${i}`,
          rollNo: `ROLL-B-${Date.now()}-${i}`,
        },
      });
      const invoice = await prisma.invoice.create({
        data: {
          schoolId: schoolBId,
          studentId: student.id,
          amount: new Prisma.Decimal(750),
          remainingAmount: new Prisma.Decimal(750),
          dueDate: new Date(Date.now() + 86400000),
        },
      });
      const orderId = `order_B_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      await prisma.paymentTransaction.create({
        data: {
          schoolId: schoolBId,
          invoiceId: invoice.id,
          transactionId: orderId,
          amountPaid: new Prisma.Decimal(750),
          status: 'CREATED',
        },
      });
      schoolBOrders.push({ orderId, invoiceId: invoice.id, amountPaise: 75000 });
    }

    // Simulate 50 concurrent payment executions across School A and School B with serialization retry
    const executePayment = async (schoolId: string, orderId: string, idx: number) => {
      const gatewayPaymentId = `pay_${schoolId.substring(0, 4)}_${idx}_${crypto.randomBytes(8).toString('hex')}`;
      const idempotencyKey = crypto.createHash('sha256').update(`${schoolId}_${orderId}_${gatewayPaymentId}`).digest('hex');

      let attempt = 0;
      while (true) {
        try {
          return await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
            // Find transaction
            const pt = await tx.paymentTransaction.findFirst({
              where: { transactionId: orderId, schoolId },
            });
            expect(pt).toBeDefined();

            // Increment sequence counter
            const counterKey = `RECEIPT_${currentYear}`;
            const counter = await tx.sequenceCounter.upsert({
              where: { schoolId_key: { schoolId, key: counterKey } },
              update: { currentValue: { increment: 1 } },
              create: { schoolId, key: counterKey, currentValue: 1 },
            });
            const receiptNo = `REC-${currentYear}-${String(counter.currentValue).padStart(6, '0')}`;

            // Update transaction and invoice
            await tx.paymentTransaction.update({
              where: { id: pt!.id },
              data: {
                gatewayPaymentId,
                status: 'SUCCESS',
                paidAt: new Date(),
                idempotencyKey,
                receiptNo,
              },
            });

            await tx.invoice.update({
              where: { id: pt!.invoiceId },
              data: {
                status: 'PAID',
                amountPaid: pt!.amountPaid,
                remainingAmount: new Prisma.Decimal(0),
                paidDate: new Date(),
                receiptNo,
              },
            });

            return { schoolId, receiptNo, seq: counter.currentValue };
          });
        } catch (err: unknown) {
          const errCode = typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: unknown }).code : undefined;
          if ((errCode === 'P2034' || String(err).includes('write conflict') || String(err).includes('deadlock')) && attempt < 15) {
            attempt++;
            await new Promise((r) => setTimeout(r, Math.random() * 50 + 10));
            continue;
          }
          throw err;
        }
      }
    };

    const paymentTasks = [
      ...schoolAOrders.map((o, idx) => executePayment(schoolAId, o.orderId, idx)),
      ...schoolBOrders.map((o, idx) => executePayment(schoolBId, o.orderId, idx)),
    ];

    // Concurrently await all 50 payments
    const results = await Promise.all(paymentTasks);
    expect(results).toHaveLength(50);

    const schoolAResults = results.filter((r) => r.schoolId === schoolAId);
    const schoolBResults = results.filter((r) => r.schoolId === schoolBId);

    expect(schoolAResults).toHaveLength(countPerSchool);
    expect(schoolBResults).toHaveLength(countPerSchool);

    // 1. Verify no duplicate receipt numbers across the entire run
    const allReceipts = results.map((r) => `${r.schoolId}:${r.receiptNo}`);
    const uniqueReceipts = new Set(allReceipts);
    expect(uniqueReceipts.size).toBe(50);

    // 2. Verify School A numbers are unique, valid format, and increasing (1..25)
    const schoolASeqs = schoolAResults.map((r) => r.seq).sort((a, b) => a - b);
    expect(schoolASeqs).toEqual(Array.from({ length: countPerSchool }, (_, i) => i + 1));
    for (const res of schoolAResults) {
      expect(res.receiptNo).toMatch(new RegExp(`^REC-${currentYear}-\\d{6}$`));
    }

    // 3. Verify School B numbers are unique, valid format, and increasing (1..25)
    const schoolBSeqs = schoolBResults.map((r) => r.seq).sort((a, b) => a - b);
    expect(schoolBSeqs).toEqual(Array.from({ length: countPerSchool }, (_, i) => i + 1));
    for (const res of schoolBResults) {
      expect(res.receiptNo).toMatch(new RegExp(`^REC-${currentYear}-\\d{6}$`));
    }

    // 4. Verify DB persistence and unique constraint adherence
    const schoolAPTs = await prisma.paymentTransaction.findMany({
      where: { schoolId: schoolAId, status: 'SUCCESS' },
    });
    expect(schoolAPTs).toHaveLength(countPerSchool);
    const dbReceiptsA = new Set(schoolAPTs.map((pt) => pt.receiptNo));
    expect(dbReceiptsA.size).toBe(countPerSchool);
  }, 30000);
});
