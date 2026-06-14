import { PrismaClient, Prisma } from '@prisma/client';
import { LedgerService } from './ledger.service';

const prisma = new PrismaClient();

export class InterCompanyService {
  /**
   * Phase 11: Execute an Inter-Company Loan from Campus A to Campus B
   * This guarantees a dual-ledger handshake. It posts a transaction in 
   * Campus A's ledger and Campus B's ledger in the same database transaction.
   */
  static async recordInterCompanyLoan(
    fromSchoolId: string, 
    toSchoolId: string, 
    amount: number, 
    description: string, 
    createdBy: string
  ) {
    if (fromSchoolId === toSchoolId) throw new Error("Cannot transfer to the same campus");
    if (amount <= 0) throw new Error("Amount must be positive");

    // 1. Find the necessary Inter-Company Clearing Accounts for both schools
    // School A needs an "Inter-Company Receivable" (Asset) and "Bank" (Asset)
    const fromSchoolReceivable = await prisma.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId: fromSchoolId, code: '1300-ICR' } } });
    const fromSchoolBank = await prisma.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId: fromSchoolId, code: '1010-BANK' } } });

    // School B needs an "Inter-Company Payable" (Liability) and "Bank" (Asset)
    const toSchoolPayable = await prisma.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId: toSchoolId, code: '2300-ICP' } } });
    const toSchoolBank = await prisma.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId: toSchoolId, code: '1010-BANK' } } });

    if (!fromSchoolReceivable || !fromSchoolBank || !toSchoolPayable || !toSchoolBank) {
      throw new Error("Missing mandatory Inter-Company Chart of Accounts (1300-ICR or 2300-ICP) in one or both campuses.");
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Create the overarching InterCompany Transaction Record
      const icTransaction = await tx.interCompanyTransaction.create({
        data: {
          fromSchoolId,
          toSchoolId,
          amount,
          type: 'LOAN',
          status: 'SETTLED'
        }
      });

      // 3. Post to Campus A's Ledger (Debit IC Receivable, Credit Bank)
      const txFrom = await LedgerService.postTransaction({
        schoolId: fromSchoolId,
        referenceType: 'INTERCOMPANY' as any,
        referenceId: icTransaction.id,
        sourceModule: 'FINANCE' as any,
        description: `Loan to Campus B: ${description}`,
        postingDate: new Date(),
        createdBy,
        entries: [
          { accountId: fromSchoolReceivable.id, debitAmount: amount, creditAmount: 0 },
          { accountId: fromSchoolBank.id, debitAmount: 0, creditAmount: amount }
        ]
      });

      // 4. Post to Campus B's Ledger (Debit Bank, Credit IC Payable)
      const txTo = await LedgerService.postTransaction({
        schoolId: toSchoolId,
        referenceType: 'INTERCOMPANY' as any,
        referenceId: icTransaction.id,
        sourceModule: 'FINANCE' as any,
        description: `Loan from Campus A: ${description}`,
        postingDate: new Date(),
        createdBy,
        entries: [
          { accountId: toSchoolBank.id, debitAmount: amount, creditAmount: 0 },
          { accountId: toSchoolPayable.id, debitAmount: 0, creditAmount: amount }
        ]
      });

      // 5. Update the InterCompany Record with the dual Ledger IDs
      await tx.interCompanyTransaction.update({
        where: { id: icTransaction.id },
        data: {
          ledgerTxIdFrom: txFrom.id,
          ledgerTxIdTo: txTo.id
        }
      });

      return icTransaction;
    });
  }
}
