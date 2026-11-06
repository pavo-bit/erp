import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from '../helpers/testApp';
import { Role, Prisma } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Late Fines Engine (B4)', () => {
  let schoolId: string;
  let adminToken: string;
  let studentId: string;

  beforeEach(async () => {
    const school = await createTestSchool();
    schoolId = school.id;
    const admin = await createTestUser(Role.ERP_ADMIN, schoolId);
    adminToken = admin.token;

    const student = await prisma.student.create({
      data: {
        schoolId,
        name: 'Late Student',
        rollNo: `ROLL-LATE-${Date.now()}`,
      },
    });
    studentId = student.id;
  });

  it('1. No hardcoded fallback: reports "no fine rule" and preserves payment amounts/status without an active FineRule', async () => {
    // Overdue invoice exists
    const overdueDate = new Date(Date.now() - 15 * 86400000); // 15 days ago
    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(1000),
        remainingAmount: new Prisma.Decimal(1000),
        dueDate: overdueDate,
        status: 'PENDING',
      },
    });

    const res = await request(app)
      .post('/api/payments/trigger-late-fines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ schoolId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('no fine rule');
    expect(res.body.count).toBe(0);

    // Invariant: invoice remains completely untouched
    const freshInv = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(Number(freshInv!.fineAmount)).toBe(0);
    expect(Number(freshInv!.remainingAmount)).toBe(1000);
    expect(freshInv!.status).toBe('PENDING');
    expect(freshInv!.isOverdue).toBe(true);
  });

  it('2. Respects grace days: only invoices past dueDate + graceDays are fined', async () => {
    // FineRule: 7 grace days, 100 INR fixed fine, ONCE
    await prisma.fineRule.create({
      data: {
        schoolId,
        code: 'LATE_FEE_TEST',
        name: 'Test Late Fine',
        graceDays: 7,
        fineAmount: new Prisma.Decimal(100),
        isPercentage: false,
        frequency: 'ONCE',
        isActive: true,
      },
    });

    // Invoice within grace period (due 3 days ago, grace is 7)
    const invWithinGrace = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(500),
        remainingAmount: new Prisma.Decimal(500),
        dueDate: new Date(Date.now() - 3 * 86400000),
        status: 'PENDING',
      },
    });

    // Invoice past grace period (due 10 days ago, grace is 7)
    const invPastGrace = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(500),
        remainingAmount: new Prisma.Decimal(500),
        dueDate: new Date(Date.now() - 10 * 86400000),
        status: 'PENDING',
      },
    });

    const res = await request(app)
      .post('/api/payments/trigger-late-fines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ schoolId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);

    const checkWithin = await prisma.invoice.findUnique({ where: { id: invWithinGrace.id } });
    expect(Number(checkWithin!.fineAmount)).toBe(0);
    expect(checkWithin!.status).toBe('PENDING');

    const checkPast = await prisma.invoice.findUnique({ where: { id: invPastGrace.id } });
    expect(Number(checkPast!.fineAmount)).toBe(100);
    expect(Number(checkPast!.remainingAmount)).toBe(600); // 500 + 100
    expect(checkPast!.status).toBe('PENDING');
    expect(checkPast!.isOverdue).toBe(true);
  });

  it('3. Supports percentage fine, DAILY frequency scaling, and cap invariant', async () => {
    // 10% daily fine, 0 grace days
    await prisma.fineRule.create({
      data: {
        schoolId,
        code: 'PERCENT_DAILY',
        name: 'Daily 10%',
        graceDays: 0,
        fineAmount: new Prisma.Decimal(10), // 10%
        isPercentage: true,
        frequency: 'DAILY',
        isActive: true,
      },
    });

    // 5 days overdue: base fine = 100 (10% of 1000), daily * 5 = 500
    const inv = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(1000),
        remainingAmount: new Prisma.Decimal(1000),
        dueDate: new Date(Date.now() - 5 * 86400000),
        status: 'PENDING',
      },
    });

    await request(app)
      .post('/api/payments/trigger-late-fines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ schoolId })
      .expect(200);

    const updated = await prisma.invoice.findUnique({ where: { id: inv.id } });
    expect(Number(updated!.fineAmount)).toBe(500);
    expect(Number(updated!.remainingAmount)).toBe(1500);
  });

  it('4. Includes both PENDING and PARTIAL overdue invoices, and is strictly idempotent on re-run', async () => {
    await prisma.fineRule.create({
      data: {
        schoolId,
        code: 'ONCE_50',
        name: 'Flat 50 Late Fee',
        graceDays: 0,
        fineAmount: new Prisma.Decimal(50),
        isPercentage: false,
        frequency: 'ONCE',
        isActive: true,
      },
    });

    // Pending overdue invoice
    const pendingInv = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(1000),
        remainingAmount: new Prisma.Decimal(1000),
        dueDate: new Date(Date.now() - 2 * 86400000),
        status: 'PENDING',
      },
    });

    // Partial overdue invoice (paid 300 of 1000)
    const partialInv = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount: new Prisma.Decimal(1000),
        amountPaid: new Prisma.Decimal(300),
        remainingAmount: new Prisma.Decimal(700),
        dueDate: new Date(Date.now() - 2 * 86400000),
        status: 'PARTIAL',
      },
    });

    // First execution: updates both invoices
    const res1 = await request(app)
      .post('/api/payments/trigger-late-fines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ schoolId })
      .expect(200);

    expect(res1.body.count).toBe(2);

    const checkPending1 = await prisma.invoice.findUnique({ where: { id: pendingInv.id } });
    expect(Number(checkPending1!.fineAmount)).toBe(50);
    expect(Number(checkPending1!.remainingAmount)).toBe(1050);
    expect(checkPending1!.status).toBe('PENDING');
    expect(checkPending1!.isOverdue).toBe(true);

    const checkPartial1 = await prisma.invoice.findUnique({ where: { id: partialInv.id } });
    expect(Number(checkPartial1!.fineAmount)).toBe(50);
    expect(Number(checkPartial1!.remainingAmount)).toBe(750);
    expect(checkPartial1!.status).toBe('PARTIAL');
    expect(checkPartial1!.isOverdue).toBe(true);

    // Second execution (re-run): idempotent! 0 invoices updated, amounts unchanged!
    const res2 = await request(app)
      .post('/api/payments/trigger-late-fines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ schoolId })
      .expect(200);

    expect(res2.body.count).toBe(0);

    const checkPending2 = await prisma.invoice.findUnique({ where: { id: pendingInv.id } });
    expect(Number(checkPending2!.fineAmount)).toBe(50);
    expect(Number(checkPending2!.remainingAmount)).toBe(1050);

    const checkPartial2 = await prisma.invoice.findUnique({ where: { id: partialInv.id } });
    expect(Number(checkPartial2!.fineAmount)).toBe(50);
    expect(Number(checkPartial2!.remainingAmount)).toBe(750);
  });
});

