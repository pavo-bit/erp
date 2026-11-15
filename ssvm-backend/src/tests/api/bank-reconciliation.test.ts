import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from '../helpers/testApp';
import { Role, Prisma } from '@prisma/client';
import { LedgerService } from '../../services/ledger.service';
import { seedDefaultChartOfAccounts } from '../../lib/chartOfAccounts';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Bank Reconciliation Engine (FIN-REC-01)', () => {
  let schoolId: string;
  let accountantToken: string;
  let bankAccountId: string;

  beforeEach(async () => {
    const school = await createTestSchool();
    schoolId = school.id;
    await seedDefaultChartOfAccounts(prisma, schoolId);

    const accountant = await createTestUser(Role.ACCOUNTANT, schoolId);
    accountantToken = accountant.token;

    // Retrieve the standard seeded bank account (1010-BANK)
    const bankAccount = await prisma.ledgerAccount.findUnique({
      where: { schoolId_code: { schoolId, code: '1010-BANK' } },
    });
    expect(bankAccount).toBeDefined();
    bankAccountId = bankAccount!.id;
  });

  it('rejects empty placeholder statements with 400', async () => {
    const res = await request(app)
      .post('/api/v1/finance/governance/reconcile')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        schoolId,
        accountId: bankAccountId,
        statementDate: new Date().toISOString(),
        statementBalance: 1000,
        lines: [],
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: 'statement lines are required',
    });
  });

  it('matches BankStatementLine with posted LedgerEntry and creates BankReconciliation record', async () => {
    // 1. Post a ledger transaction debiting Bank account for 5000.00
    const revenueAccount = await prisma.ledgerAccount.findUnique({
      where: { schoolId_code: { schoolId, code: '4000-TUIT' } },
    });
    expect(revenueAccount).toBeDefined();

    const postDate = new Date();
    await LedgerService.postTransaction({
      schoolId,
      referenceType: 'PAYMENT',
      referenceId: `txn_recon_${Date.now()}`,
      sourceModule: 'FEES',
      description: 'Tuition payment received via bank transfer',
      postingDate: postDate,
      createdBy: 'test-accountant',
      entries: [
        { accountId: bankAccountId, debitAmount: 5000, creditAmount: 0 },
        { accountId: revenueAccount!.id, debitAmount: 0, creditAmount: 5000 },
      ],
    });

    // 2. Submit bank reconciliation with a matching statement line of 5000.00
    const res = await request(app)
      .post('/api/v1/finance/governance/reconcile')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        schoolId,
        accountId: bankAccountId,
        statementDate: postDate.toISOString(),
        statementBalance: 5000,
        statementLines: [
          {
            date: postDate.toISOString(),
            amount: 5000,
            reference: 'NEFT-FEE-PAYMENT-1',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.matchedCount).toBe(1);
    expect(res.body.data.unmatchedCount).toBe(0);
    expect(res.body.data.isMatched).toBe(true);
    expect(res.body.data.statementBalance).toBe('5000.00');
    expect(res.body.data.ledgerBalance).toBe('5000.00');

    // 3. Verify BankStatementLine was updated in the database
    const lines = await prisma.bankStatementLine.findMany({
      where: { schoolId, reference: 'NEFT-FEE-PAYMENT-1' },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].status).toBe('MATCHED');
    expect(lines[0].matchedLedgerEntryId).not.toBeNull();

    // 4. Verify parent BankReconciliation record exists in the database
    const recon = await prisma.bankReconciliation.findUnique({
      where: { id: res.body.data.reconciliationId },
    });
    expect(recon).not.toBeNull();
    expect(recon!.isMatched).toBe(true);
  });

  it('marks reconciliation as unmatched when statement lines do not match ledger entries', async () => {
    const statementDate = new Date();
    const res = await request(app)
      .post('/api/v1/finance/governance/reconcile')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        schoolId,
        accountId: bankAccountId,
        statementDate: statementDate.toISOString(),
        statementBalance: 9999,
        statementLines: [
          {
            date: statementDate.toISOString(),
            amount: 9999,
            reference: 'UNMATCHED-UNKNOWN-DEPOSIT',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.matchedCount).toBe(0);
    expect(res.body.data.unmatchedCount).toBe(1);
    expect(res.body.data.isMatched).toBe(false);

    const line = await prisma.bankStatementLine.findFirst({
      where: { schoolId, reference: 'UNMATCHED-UNKNOWN-DEPOSIT' },
    });
    expect(line!.status).toBe('UNMATCHED');
    expect(line!.matchedLedgerEntryId).toBeNull();
  });

  it('rejects unauthenticated or unauthorized users', async () => {
    const student = await createTestUser(Role.STUDENT, schoolId);

    const res = await request(app)
      .post('/api/v1/finance/governance/reconcile')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        schoolId,
        accountId: bankAccountId,
        statementDate: new Date().toISOString(),
        statementBalance: 1000,
        statementLines: [{ date: new Date().toISOString(), amount: 1000, reference: 'STMT-1' }],
      });

    expect(res.status).toBe(403);
  });
});
