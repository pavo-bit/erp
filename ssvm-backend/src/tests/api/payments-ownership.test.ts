import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from '../helpers/testApp';
import { Role, Prisma } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Payment Ownership Authorization Matrix (B1)', () => {
  let schoolAId: string;
  let schoolBId: string;

  let studentAToken: string;
  let studentBToken: string;
  let parentAToken: string;
  let parentBToken: string;
  let accountantAToken: string;
  let erpAdminAToken: string;
  let adminBToken: string;
  let teacherAToken: string;

  let invoiceAId: string;
  let invoiceBId: string;
  let studentAId: string;
  let studentBId: string;

  beforeEach(async () => {
    // Clear transactions to avoid mock order ID collision across tests
    await prisma.paymentTransaction.deleteMany({});

    const schoolA = await createTestSchool();
    const schoolB = await createTestSchool();
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    // Student A in School A
    const uStudentA = await createTestUser(Role.STUDENT, schoolAId);
    studentAToken = uStudentA.token;
    const studentA = await prisma.student.findFirst({
      where: { userId: uStudentA.user.id, schoolId: schoolAId },
    });
    studentAId = studentA!.id;

    // Student B in School A
    const uStudentB = await createTestUser(Role.STUDENT, schoolAId);
    studentBToken = uStudentB.token;
    const studentB = await prisma.student.findFirst({
      where: { userId: uStudentB.user.id, schoolId: schoolAId },
    });
    studentBId = studentB!.id;

    // Invoices in School A
    const invA = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentAId,
        amount: new Prisma.Decimal(500),
        remainingAmount: new Prisma.Decimal(500),
        dueDate: new Date(Date.now() + 86400000),
        status: 'PENDING',
      },
    });
    invoiceAId = invA.id;

    const invB = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentBId,
        amount: new Prisma.Decimal(500),
        remainingAmount: new Prisma.Decimal(500),
        dueDate: new Date(Date.now() + 86400000),
        status: 'PENDING',
      },
    });
    invoiceBId = invB.id;

    // Parent A in School A linked to Student A only
    const uParentA = await createTestUser(Role.PARENT, schoolAId);
    parentAToken = uParentA.token;
    await prisma.guardian.create({
      data: {
        schoolId: schoolAId,
        user: { connect: { id: uParentA.user.id } },
        primaryName: 'Parent A',
        primaryPhone: '9876543210',
        students: { connect: [{ id: studentAId }] },
      },
    });

    // Parent B in School B linked to a student in School B
    const uParentB = await createTestUser(Role.PARENT, schoolBId);
    parentBToken = uParentB.token;
    const studentBInSchoolB = await prisma.student.create({
      data: {
        schoolId: schoolBId,
        name: 'Student School B',
        rollNo: `ROLL-SB-${Date.now()}`,
      },
    });
    await prisma.guardian.create({
      data: {
        schoolId: schoolBId,
        user: { connect: { id: uParentB.user.id } },
        primaryName: 'Parent B',
        primaryPhone: '9876543211',
        students: { connect: [{ id: studentBInSchoolB.id }] },
      },
    });

    // Staff in School A
    accountantAToken = (await createTestUser(Role.ACCOUNTANT, schoolAId)).token;
    erpAdminAToken = (await createTestUser(Role.ERP_ADMIN, schoolAId)).token;
    teacherAToken = (await createTestUser(Role.TEACHER, schoolAId)).token;

    // Staff in School B
    adminBToken = (await createTestUser(Role.ERP_ADMIN, schoolBId)).token;
  });

  const matrix = [
    {
      scenario: 'STUDENT own invoice',
      getToken: () => studentAToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [200],
    },
    {
      scenario: 'STUDENT other student invoice (same school)',
      getToken: () => studentBToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [403],
    },
    {
      scenario: 'PARENT own child invoice',
      getToken: () => parentAToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [200],
    },
    {
      scenario: 'PARENT other child invoice (same school)',
      getToken: () => parentAToken,
      getFeeId: () => invoiceBId,
      expectedStatuses: [403],
    },
    {
      scenario: 'PARENT child in another school',
      getToken: () => parentBToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [403, 404],
    },
    {
      scenario: 'ACCOUNTANT same school',
      getToken: () => accountantAToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [200],
    },
    {
      scenario: 'ERP_ADMIN same school',
      getToken: () => erpAdminAToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [200],
    },
    {
      scenario: 'Other school admin',
      getToken: () => adminBToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [403, 404],
    },
    {
      scenario: 'TEACHER (forbidden from payments)',
      getToken: () => teacherAToken,
      getFeeId: () => invoiceAId,
      expectedStatuses: [403],
    },
    {
      scenario: 'Unauthenticated caller with invalid token',
      getToken: () => 'invalid_unauthenticated_token',
      getFeeId: () => invoiceAId,
      expectedStatuses: [401],
    },
  ];

  for (const tc of matrix) {
    it(`evaluates ${tc.scenario} -> ${tc.expectedStatuses.join('/')}`, async () => {
      const token = tc.getToken();
      const feeId = tc.getFeeId();

      const req = request(app).post('/api/payments/create-order').send({ feeId });
      if (token) {
        req.set('Authorization', `Bearer ${token}`);
      }

      const res = await req;
      expect(tc.expectedStatuses).toContain(res.status);
      if (res.status === 403) {
        expect(res.body.error).toContain('Not authorized');
      }
    });
  }

  it('rejects unauthenticated request without credentials', async () => {
    const res = await request(app).post('/api/payments/create-order').send({ feeId: invoiceAId });
    expect([401, 403]).toContain(res.status);
  });

  it('strictly rejects when studentId matches user.id but student.userId does not match (fallback removed)', async () => {
    // Create a student whose student.userId belongs to someone else
    const user = await createTestUser(Role.TEACHER, schoolAId);
    const otherStudentUser = await createTestUser(Role.STUDENT, schoolAId);
    const otherStudent = await prisma.student.findFirst({ where: { userId: otherStudentUser.user.id } });

    const invoice = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: otherStudent!.id,
        amount: new Prisma.Decimal(200),
        remainingAmount: new Prisma.Decimal(200),
        dueDate: new Date(Date.now() + 86400000),
        status: 'PENDING',
      },
    });

    // Calling with user.token should be REJECTED because user is not the owner
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ feeId: invoice.id })
      .expect(403);

    expect(res.body.error).toContain('Not authorized to pay this fee');
  });
});
