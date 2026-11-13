import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ChartOfAccountsNotConfiguredError } from '../../routes/payments';
import { LedgerService } from '../../services/ledger.service';
import { toPaise, fromPaise } from '../../lib/money';
import { Prisma, LedgerReferenceType, LedgerModule } from '@prisma/client';

describe('Finance Invariants & Money Math Audits (B8)', () => {
  const financeFiles = [
    'src/routes/payments.ts',
    'src/services/ledger.service.ts',
    'src/services/BankReconciliationService.ts',
    'src/routes/invoices.ts',
  ];

  it('verifies finance source files contain zero parseFloat or unsafe Number money math', () => {
    const root = path.resolve(__dirname, '../../../');
    const violations: { file: string; line: number; match: string }[] = [];

    for (const relPath of financeFiles) {
      const fullPath = path.join(root, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Strip line comments
        const clean = line.replace(/\/\/.*$/, '').trim();

        // Check for parseFloat
        if (clean.includes('parseFloat(')) {
          violations.push({ file: relPath, line: idx + 1, match: clean });
        }

        // Check for Number() math on financial fields
        if (
          /Number\s*\(\s*(amount|due|paid|fee|fine|balance|rate|debit|credit|subtotal|total|val)/i.test(clean) &&
          !clean.includes('Number.isInteger') &&
          !clean.includes('Number(counter')
        ) {
          violations.push({ file: relPath, line: idx + 1, match: clean });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('enforces ChartOfAccountsNotConfiguredError metadata code', () => {
    const err = new ChartOfAccountsNotConfiguredError('school_test_123');
    expect(err.code).toBe('CHART_OF_ACCOUNTS_NOT_CONFIGURED');
    expect(err.message).toContain('school_test_123');
    expect(err.name).toBe('ChartOfAccountsNotConfiguredError');
  });

  it('validates integer paise conversions without floating point precision drift', () => {
    // 0.1 + 0.2 floating inaccuracy
    const d1 = new Prisma.Decimal('0.10');
    const d2 = new Prisma.Decimal('0.20');
    const p1 = toPaise(d1);
    const p2 = toPaise(d2);
    expect(p1).toBe(10);
    expect(p2).toBe(20);
    expect(p1 + p2).toBe(30);

    const backToDec = fromPaise(p1 + p2);
    expect(backToDec.toString()).toBe('0.3');
  });

  it('rejects unbalanced ledger transaction in LedgerService (debits != credits)', async () => {
    const unbalancedTxData = {
      schoolId: 'sch_test',
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: 'ref_123',
      sourceModule: LedgerModule.FEES,
      description: 'Test entry',
      postingDate: new Date(),
      createdBy: 'test_user',
      entries: [
        { accountId: 'acc_debit', debitAmount: 100, creditAmount: 0 },
        { accountId: 'acc_credit', debitAmount: 0, creditAmount: 90 }, // Unbalanced by 10
      ],
    };

    await expect(LedgerService.postTransaction(unbalancedTxData)).rejects.toThrow(
      /Ledger Imbalance: Debits.*do not equal Credits/i
    );
  });
});
