import { describe, it, expect } from 'vitest';
import { calculateFine, InvoiceData, FineRuleData } from '../../lib/fineCalculation';

describe('Fine Calculation Logic', () => {
  const baseInvoice: InvoiceData = {
    amount: 1000,
    status: 'OVERDUE',
    dueDate: new Date('2026-06-01T00:00:00Z'),
  };

  const flatFineRule: FineRuleData = {
    graceDays: 5,
    fineAmount: 100,
    isPercentage: false,
  };

  const percentageFineRule: FineRuleData = {
    graceDays: 5,
    fineAmount: 10, // 10%
    isPercentage: true,
  };

  it('returns 0 if invoice is already PAID', () => {
    const paidInvoice: InvoiceData = { ...baseInvoice, status: 'PAID' };
    const fine = calculateFine(paidInvoice, flatFineRule, new Date('2026-06-10T00:00:00Z'));
    expect(fine).toBe(0);
  });

  it('returns 0 if fine rule is null', () => {
    const fine = calculateFine(baseInvoice, null, new Date('2026-06-10T00:00:00Z'));
    expect(fine).toBe(0);
  });

  it('returns 0 if within the grace period', () => {
    // Due date is Jun 1, grace is 5 days (until Jun 6)
    const currentDate = new Date('2026-06-05T00:00:00Z');
    const fine = calculateFine(baseInvoice, flatFineRule, currentDate);
    expect(fine).toBe(0);
  });

  it('applies flat fine after grace period', () => {
    // Jun 7 is past the 5 day grace period
    const currentDate = new Date('2026-06-07T00:00:00Z');
    const fine = calculateFine(baseInvoice, flatFineRule, currentDate);
    expect(fine).toBe(100);
  });

  it('applies percentage fine after grace period', () => {
    // 10% of 1000 = 100
    const currentDate = new Date('2026-06-07T00:00:00Z');
    const fine = calculateFine(baseInvoice, percentageFineRule, currentDate);
    expect(fine).toBe(100);
  });

  it('returns 0 if exactly on the last second of grace period', () => {
    const currentDate = new Date('2026-06-06T00:00:00Z'); // Exactly due + 5 days
    const fine = calculateFine(baseInvoice, flatFineRule, currentDate);
    expect(fine).toBe(0);
  });
});
