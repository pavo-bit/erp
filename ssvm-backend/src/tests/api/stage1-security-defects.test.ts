import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from '../helpers/testApp';
import { Role, Prisma } from '@prisma/client';
import { generateBiometricHardwareToken } from '../../routes/attendance';
import fs from 'fs';
import path from 'path';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Stage 1 — Security Fixes Verification Suite', () => {
  let schoolAId: string;
  let schoolBId: string;
  let erpAdminAToken: string;
  let accountantAToken: string;
  let parentAToken: string;
  let studentAToken: string;
  let superAdminToken: string;
  let studentAId: string;
  let invoiceAId: string;
  let invoiceBId: string;

  beforeEach(async () => {
    const schoolA = await createTestSchool();
    const schoolB = await createTestSchool();
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    const uAdminA = await createTestUser(Role.ERP_ADMIN, schoolAId);
    erpAdminAToken = uAdminA.token;

    const uAccountantA = await createTestUser(Role.ACCOUNTANT, schoolAId);
    accountantAToken = uAccountantA.token;

    const uParentA = await createTestUser(Role.PARENT, schoolAId);
    parentAToken = uParentA.token;

    const uStudentA = await createTestUser(Role.STUDENT, schoolAId);
    studentAToken = uStudentA.token;
    const studentA = await prisma.student.findFirst({
      where: { userId: uStudentA.user.id, schoolId: schoolAId },
    });
    studentAId = studentA!.id;

    const uSuper = await createTestUser(Role.SUPER_ADMIN);
    superAdminToken = uSuper.token;

    // Create Invoice in School A
    const invA = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        studentId: studentAId,
        amount: new Prisma.Decimal(1000),
        remainingAmount: new Prisma.Decimal(1000),
        amountPaid: new Prisma.Decimal(0),
        dueDate: new Date(Date.now() + 86400000),
        status: 'PENDING',
      },
    });
    invoiceAId = invA.id;

    // Create Invoice in School B
    const uStudentB = await createTestUser(Role.STUDENT, schoolBId);
    const studentB = await prisma.student.findFirst({
      where: { userId: uStudentB.user.id, schoolId: schoolBId },
    });
    const invB = await prisma.invoice.create({
      data: {
        schoolId: schoolBId,
        studentId: studentB!.id,
        amount: new Prisma.Decimal(500),
        remainingAmount: new Prisma.Decimal(500),
        amountPaid: new Prisma.Decimal(0),
        dueDate: new Date(Date.now() + 86400000),
        status: 'PENDING',
      },
    });
    invoiceBId = invB.id;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 1.1 — Invoice payment hole
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Task 1.1: Invoice payment authorization & cashier pipeline', () => {
    it('parent gets 403 on PUT /api/v1/invoices/:id/pay', async () => {
      const res = await request(app)
        .put(`/api/v1/invoices/${invoiceAId}/pay`)
        .set('Authorization', `Bearer ${parentAToken}`)
        .send({ amountPaid: 1000 });
      expect(res.status).toBe(403);
    });

    it('student gets 403 on PUT /api/v1/invoices/:id/pay', async () => {
      const res = await request(app)
        .put(`/api/v1/invoices/${invoiceAId}/pay`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({ amountPaid: 1000 });
      expect(res.status).toBe(403);
    });

    it('another school\'s invoice returns 404', async () => {
      const res = await request(app)
        .put(`/api/v1/invoices/${invoiceBId}/pay`)
        .set('Authorization', `Bearer ${erpAdminAToken}`)
        .send({ amountPaid: 500 });
      expect(res.status).toBe(404);
    });

    it('staff payment creates a receipt number and a ledger entry', async () => {
      const res = await request(app)
        .put(`/api/v1/invoices/${invoiceAId}/pay`)
        .set('Authorization', `Bearer ${accountantAToken}`)
        .send({ amountPaid: 1000, gateway: 'CASH' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.receipt).toBeDefined();
      expect(res.body.receipt.receiptNo).toMatch(/^REC-\d{4}-\d{6}$/);

      // Verify invoice reaches PAID with a PaymentTransaction that is SUCCESS
      const updatedInv = await prisma.invoice.findUnique({
        where: { id: invoiceAId },
        include: { transactions: true },
      });
      expect(updatedInv?.status).toBe('PAID');
      expect(updatedInv?.transactions.length).toBeGreaterThan(0);
      expect(updatedInv?.transactions[0].status).toBe('SUCCESS');

      // Verify Ledger Transaction was posted
      const ledgerTx = await prisma.ledgerTransaction.findFirst({
        where: { schoolId: schoolAId, referenceId: res.body.receipt.id },
        include: { LedgerEntry: true },
      });
      expect(ledgerTx).toBeDefined();
      expect(ledgerTx?.status).toBe('POSTED');
      expect(ledgerTx?.LedgerEntry.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 1.2 — Biometric backdoor
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Task 1.2: Biometric hardware token verification', () => {
    it('old test tokens bio:test: and bio:valid-token get 401', async () => {
      const res1 = await request(app)
        .post('/api/v1/attendance/biometric/event')
        .set('x-device-token', 'bio:test:sample-token')
        .send({
          deviceId: 'DEV-01',
          schoolId: schoolAId,
          events: [{ eventId: 'EVT-1', employeeId: 'EMP-1', timestamp: new Date().toISOString() }],
        });
      expect(res1.status).toBe(401);

      const res2 = await request(app)
        .post('/api/v1/attendance/biometric/event')
        .set('x-device-token', 'bio:valid-token')
        .send({
          deviceId: 'DEV-01',
          schoolId: schoolAId,
          events: [{ eventId: 'EVT-2', employeeId: 'EMP-1', timestamp: new Date().toISOString() }],
        });
      expect(res2.status).toBe(401);
    });

    it('a valid token for school A cannot post attendance for school B', async () => {
      const tokenA = generateBiometricHardwareToken('DEV-01', schoolAId);
      const res = await request(app)
        .post('/api/v1/attendance/biometric/event')
        .set('x-device-token', tokenA)
        .send({
          deviceId: 'DEV-01',
          schoolId: schoolBId,
          events: [{ eventId: 'EVT-CROSS', employeeId: 'EMP-1', timestamp: new Date().toISOString() }],
        });
      expect([401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 1.3 — Client-controlled tenant headers
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Task 1.3: Tenant header spoofing rejection', () => {
    it('a forged x-school-id header changes nothing and school A user cannot access school B state', async () => {
      const res = await request(app)
        .get('/api/v1/schools/me/modules')
        .set('Authorization', `Bearer ${erpAdminAToken}`)
        .set('x-school-id', schoolBId)
        .set('x-tenant-id', schoolBId);

      expect(res.status).toBe(200);
      expect(res.body.data.schoolId).toBe(schoolAId);
      expect(res.body.data.schoolId).not.toBe(schoolBId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 1.4 — First-school fallback & silent class creation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Task 1.4: Fail-closed student creation', () => {
    it('user without school gets 400', async () => {
      const userNoSchool = await createTestUser(Role.ERP_ADMIN);
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${userNoSchool.token}`)
        .send({ name: 'Orphan Student', className: 'Class 1' });
      expect(res.status).toBe(400);
    });

    it('unknown class gets 400 and creates no new class/session rows', async () => {
      const initialClasses = await prisma.class.count({ where: { schoolId: schoolAId } });
      const initialSessions = await prisma.academicSession.count({ where: { schoolId: schoolAId } });

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${erpAdminAToken}`)
        .send({ name: 'Jane Doe', className: 'NonExistentClass999' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('does not exist');

      const finalClasses = await prisma.class.count({ where: { schoolId: schoolAId } });
      const finalSessions = await prisma.academicSession.count({ where: { schoolId: schoolAId } });

      expect(finalClasses).toBe(initialClasses);
      expect(finalSessions).toBe(initialSessions);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 1.5 — Weak credentials & SequenceCounter admission numbers
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Task 1.5: SequenceCounter and invitation flow', () => {
    it('no Math.random remains in the specified task files', () => {
      const files = [
        'src/services/admissions-bulk/admission-registration-service.ts',
        'src/routes/admissions.ts',
        'src/routes/bulk.ts',
        'src/routes/auth.ts',
        'src/routes/students.ts',
      ];
      for (const relPath of files) {
        const fullPath = path.resolve(__dirname, '../../..', relPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content).not.toMatch(/Math\.random/);
      }
    });

    it('student cannot log in until password setup invitation is used', async () => {
      // 1. Create class and section
      const session = await prisma.academicSession.create({
        data: {
          schoolId: schoolAId,
          name: '2026-2027',
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
        },
      });
      const cls = await prisma.class.create({
        data: { schoolId: schoolAId, name: 'Grade 10', sessionId: session.id },
      });
      const sec = await prisma.section.create({
        data: { classId: cls.id, name: 'A' },
      });

      // 2. Create student
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${erpAdminAToken}`)
        .send({
          name: 'Invited Student',
          className: 'Grade 10',
          section: 'A',
        });

      expect(res.status).toBe(201);
      const studentData = res.body.data;
      expect(studentData.admissionNo).toMatch(/^ADM-\d{4}-\d{4}$/);
      expect(studentData.password).toBeUndefined();

      // 3. Verify user created with mustChangePassword=true
      const user = await prisma.user.findUnique({
        where: { id: studentData.userId },
      });
      expect(user?.mustChangePassword).toBe(true);

      // 4. Verify passwordSetupToken created
      const setupToken = await prisma.passwordSetupToken.findFirst({
        where: { userId: user!.id, schoolId: schoolAId, usedAt: null },
      });
      expect(setupToken).toBeDefined();

      // 5. Attempt login with guessed or default password -> must fail 401
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user!.email, password: 'Password@123' });
      expect(loginRes.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 1.7 — Finance reconcile stub
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Task 1.7: Finance reconcile validation', () => {
    it('empty statement lines returns HTTP 400 with "statement lines are required"', async () => {
      const res = await request(app)
        .post('/api/v1/finance/governance/reconcile')
        .set('Authorization', `Bearer ${erpAdminAToken}`)
        .send({ accountId: 'acc-1', statementDate: '2026-11-01', statementBalance: 1000 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('statement lines are required');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 1.8 — Honest provider status
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Task 1.8: Honest provider status without Math.random', () => {
    it('unconfigured provider returns UNAVAILABLE without Math.random', async () => {
      const res = await request(app)
        .post('/api/v1/communications/dispatch')
        .set('Authorization', `Bearer ${erpAdminAToken}`)
        .send({
          channel: 'SMS',
          recipientNum: '+919999999999',
          type: 'ALERT',
          content: 'Urgent notice regarding tomorrow classes',
        });

      // Provider credentials are not configured in test environment
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('UNAVAILABLE');

      const log = await prisma.communicationLog.findUnique({
        where: { id: res.body.data.logId },
      });
      expect(log?.status).toBe('UNAVAILABLE');
    });
  });
});
