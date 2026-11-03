import { Prisma } from "@prisma/client";
import { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { toDecimal } from "../lib/money";
import logger from "../lib/logger";

export interface BankStatementLineInput {
  date: string | Date;
  amount: number | string | Prisma.Decimal;
  reference: string;
}

export interface ReconcileBankOptions {
  schoolId: string;
  accountId: string;
  statementDate: string | Date;
  statementBalance: number | string | Prisma.Decimal;
  statementLines?: BankStatementLineInput[];
}

export interface BankReconciliationSummary {
  reconciliationId: string;
  schoolId: string;
  accountId: string;
  statementDate: Date;
  statementBalance: string;
  ledgerBalance: string;
  isMatched: boolean;
  totalLines: number;
  matchedCount: number;
  unmatchedCount: number;
}

export class BankReconciliationService {
  /**
   * Performs bank reconciliation by matching BankStatementLines with posted LedgerEntries.
   * Runs atomically inside runWithTenantDatabaseTransaction for the target school.
   */
  static async reconcileBank(
    options: ReconcileBankOptions,
    existingTx?: Prisma.TransactionClient
  ): Promise<BankReconciliationSummary> {
    const { schoolId, accountId, statementDate, statementBalance, statementLines } = options;
    const targetStatementDate = new Date(statementDate);
    const targetStatementBalance = toDecimal(statementBalance);

    const executeReconciliation = async (tx: Prisma.TransactionClient): Promise<BankReconciliationSummary> => {
      // 1. Verify ledger account exists and belongs to this school
      const account = await tx.ledgerAccount.findFirst({
        where: { id: accountId, schoolId },
      });

      if (!account) {
        throw new Error(`Ledger account ${accountId} not found in school ${schoolId}`);
      }

      // 2. Insert new statement lines if provided
      if (statementLines && statementLines.length > 0) {
        for (const line of statementLines) {
          await tx.bankStatementLine.create({
            data: {
              schoolId,
              date: new Date(line.date),
              amount: toDecimal(line.amount),
              reference: line.reference,
              status: "UNMATCHED",
            },
          });
        }
      }

      // 3. Retrieve all unmatched statement lines up to statement date
      const unmatchedStatementLines = await tx.bankStatementLine.findMany({
        where: {
          schoolId,
          status: "UNMATCHED",
          date: { lte: targetStatementDate },
        },
        orderBy: { date: "asc" },
      });

      let matchedCount = 0;
      let unmatchedCount = 0;

      // 4. Match statement lines with posted LedgerEntry records
      for (const stLine of unmatchedStatementLines) {
        const lineAmt = toDecimal(stLine.amount);
        const isDeposit = lineAmt.gte(0);
        const matchAmount = isDeposit ? lineAmt : lineAmt.abs();

        // Search for an unmatched POSTED ledger entry for this account
        const candidateEntry = await tx.ledgerEntry.findFirst({
          where: {
            accountId,
            ...(isDeposit ? { debitAmount: matchAmount } : { creditAmount: matchAmount }),
            LedgerTransaction: {
              schoolId,
              status: "POSTED",
              postingDate: { lte: targetStatementDate },
            },
            bankStatementLines: {
              none: {},
            },
          },
          orderBy: { id: "asc" },
        });

        if (candidateEntry) {
          await tx.bankStatementLine.update({
            where: { id: stLine.id },
            data: {
              matchedLedgerEntryId: candidateEntry.id,
              status: "MATCHED",
            },
          });
          matchedCount++;
        } else {
          unmatchedCount++;
        }
      }

      // 5. Calculate cumulative ledger balance for the bank account up to statement date
      const allEntries = await tx.ledgerEntry.findMany({
        where: {
          accountId,
          LedgerTransaction: {
            schoolId,
            status: "POSTED",
            postingDate: { lte: targetStatementDate },
          },
        },
        select: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      let totalDebits = new Prisma.Decimal(0);
      let totalCredits = new Prisma.Decimal(0);
      for (const entry of allEntries) {
        totalDebits = totalDebits.add(entry.debitAmount);
        totalCredits = totalCredits.add(entry.creditAmount);
      }
      const ledgerBalance = totalDebits.sub(totalCredits);

      const isMatched = targetStatementBalance.equals(ledgerBalance) && unmatchedCount === 0;

      // 6. Record parent BankReconciliation
      const recon = await tx.bankReconciliation.create({
        data: {
          schoolId,
          accountId,
          statementDate: targetStatementDate,
          statementBalance: targetStatementBalance,
          ledgerBalance,
          isMatched,
        },
      });

      logger.info(
        {
          reconciliationId: recon.id,
          schoolId,
          statementBalance: targetStatementBalance.toString(),
          ledgerBalance: ledgerBalance.toString(),
          isMatched,
          matchedCount,
          unmatchedCount,
        },
        "Bank reconciliation completed"
      );

      return {
        reconciliationId: recon.id,
        schoolId,
        accountId,
        statementDate: recon.statementDate,
        statementBalance: recon.statementBalance.toFixed(2),
        ledgerBalance: recon.ledgerBalance.toFixed(2),
        isMatched: recon.isMatched,
        totalLines: unmatchedStatementLines.length,
        matchedCount,
        unmatchedCount,
      };
    };

    if (existingTx) {
      return executeReconciliation(existingTx);
    }

    return runWithTenantDatabaseTransaction(schoolId, executeReconciliation);
  }
}
