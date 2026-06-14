export interface InvoiceData {
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL' | 'UNPAID';
  dueDate: Date;
}

export interface FineRuleData {
  graceDays: number;
  fineAmount: number;
  isPercentage: boolean;
}

/**
 * Pure function to calculate fine for an invoice.
 */
export function calculateFine(
  invoice: InvoiceData,
  fineRule: FineRuleData | null,
  currentDate: Date
): number {
  if (invoice.status === 'PAID') {
    return 0;
  }

  if (!fineRule) {
    return 0;
  }

  const dueDateMs = new Date(invoice.dueDate).getTime();
  const currentDateMs = currentDate.getTime();
  
  // Convert grace days to ms
  const graceMs = fineRule.graceDays * 24 * 60 * 60 * 1000;
  
  // If within grace period or before due date
  if (currentDateMs <= dueDateMs + graceMs) {
    return 0;
  }

  // After grace period
  if (fineRule.isPercentage) {
    return (invoice.amount * fineRule.fineAmount) / 100;
  } else {
    return fineRule.fineAmount;
  }
}
