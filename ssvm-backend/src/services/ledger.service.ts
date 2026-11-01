import prisma from '../lib/prisma';
import { LedgerReferenceType, LedgerModule, LedgerSource, FinancialEntityType, FinancialAuditAction, Prisma, SystemDomainEventType } from '@prisma/client';
import * as crypto from 'crypto';
import { EventStoreService } from './eventStore.service';


export interface LedgerEntryInput {
  accountId: string;
  dimensionValueId?: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export interface PostTransactionInput {
  schoolId: string;
  referenceType: LedgerReferenceType;
  referenceId: string;
  sourceModule?: LedgerModule;
  description: string;
  source?: LedgerSource;
  postingDate: Date;
  accountingPeriodId?: string;
  createdBy: string;
  entries: LedgerEntryInput[];
}

export class LedgerService {
  /**
   * Enterprise-Grade Transaction Posting
   * 
   * Validations:
   * 1. Double-Entry: Debits MUST strictly equal Credits.
   * 2. Hash-Chaining: Transaction is immutably hashed to the previous transaction.
   * 3. Immutability: Event and Audit logs are published simultaneously.
   */
  static async postTransaction(
    input: PostTransactionInput,
    existingTransaction?: Prisma.TransactionClient,
  ) {
    // 1. Double-Entry Arithmetic Validation
    const totalDebits = input.entries.reduce((sum, entry) => sum + entry.debitAmount, 0);
    const totalCredits = input.entries.reduce((sum, entry) => sum + entry.creditAmount, 0);

    // Using epsilon to avoid JS floating point errors
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new Error(`Ledger Imbalance: Debits (${totalDebits}) do not equal Credits (${totalCredits}).`);
    }

    if (totalDebits <= 0) {
      throw new Error(`Invalid Ledger Entry: Total transaction amount must be greater than zero.`);
    }

    const postWithClient = async (tx: Prisma.TransactionClient) => {
      // 2. Fetch Previous Hash for the Hash Chain
      // To ensure strict linearity, we lock or fetch the latest transaction chronologically
      const lastTx = await tx.ledgerTransaction.findFirst({
        where: { schoolId: input.schoolId },
        orderBy: { postingDate: 'desc' },
      });

      const previousHash = lastTx?.hash || 'GENESIS_HASH';

      // 3. Generate Transaction Number
      const counter = await tx.sequenceCounter.upsert({
        where: { schoolId_key: { schoolId: input.schoolId, key: 'LEDGER_TXN' } },
        update: { currentValue: { increment: 1 } },
        create: { schoolId: input.schoolId, key: 'LEDGER_TXN', currentValue: 1 },
      });
      const txnNumber = `LED-${new Date().getFullYear()}-${String(counter.currentValue).padStart(6, '0')}`;

      // 4. Construct Transaction Payload for Hashing
      const payloadString = JSON.stringify({
        txnNumber,
        schoolId: input.schoolId,
        referenceId: input.referenceId,
        entries: input.entries,
        previousHash,
      });

      const currentHash = crypto.createHash('sha256').update(payloadString).digest('hex');

      // 5. Insert Ledger Transaction and Entries
      const ledgerTxn = await tx.ledgerTransaction.create({
        data: {
          schoolId: input.schoolId,
          transactionNumber: txnNumber,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          sourceModule: input.sourceModule,
          description: input.description,
          source: input.source || LedgerSource.SYSTEM,
          postingDate: input.postingDate,
          accountingPeriodId: input.accountingPeriodId,
          previousHash: previousHash,
          hash: currentHash,
          createdBy: input.createdBy,
          eventPublished: true, // We are publishing within the transaction
          LedgerEntry: {
            create: input.entries.map(e => ({
              accountId: e.accountId,
              dimensionValueId: e.dimensionValueId,
              debitAmount: e.debitAmount,
              creditAmount: e.creditAmount,
              description: e.description,
            })),
          },
        },
        include: { LedgerEntry: true },
      });

      // 6. Create Audit Trail
      await tx.financialAudit.create({
        data: {
          schoolId: input.schoolId,
          ledgerTransactionId: ledgerTxn.id,
          entityType: FinancialEntityType.FEE, // Example mapped type
          entityId: input.referenceId,
          action: FinancialAuditAction.PAYMENT_CREATED,
          newState: JSON.parse(JSON.stringify(ledgerTxn)),
          reason: input.description,
          performedBy: input.createdBy,
        },
      });

      // 7. Emit Universal Domain Event (Outbox Pattern)
      await EventStoreService.publishEvent(tx, {
        schoolId: input.schoolId,
        aggregateId: ledgerTxn.id,
        aggregateType: 'LedgerTransaction',
        eventType: SystemDomainEventType.PAYMENT_POSTED,
        payload: JSON.parse(JSON.stringify(ledgerTxn)),
        publishedBy: input.createdBy
      });

      return ledgerTxn;
    };

    if (existingTransaction) return postWithClient(existingTransaction);
    return prisma.$transaction(postWithClient, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Strict locking to prevent hash forks
    });
  }

  /**
   * Verifies the integrity of the ledger chain for a school.
   */
  static async verifyHashChain(schoolId: string): Promise<{ isValid: boolean; brokenAt?: string }> {
    const transactions = await prisma.ledgerTransaction.findMany({
      where: { schoolId },
      orderBy: { postingDate: 'asc' }, // Ascending to recalculate forward
      include: { LedgerEntry: true },
    });

    let expectedPreviousHash = 'GENESIS_HASH';

    for (const txn of transactions) {
      if (txn.previousHash !== expectedPreviousHash) {
        return { isValid: false, brokenAt: txn.transactionNumber };
      }

      // Reconstruct payload
      const payloadString = JSON.stringify({
        txnNumber: txn.transactionNumber,
        schoolId: txn.schoolId,
        referenceId: txn.referenceId,
        entries: txn.LedgerEntry.map((e) => ({
          accountId: e.accountId,
          dimensionValueId: e.dimensionValueId,
          debitAmount: Number(e.debitAmount),
          creditAmount: Number(e.creditAmount),
          description: e.description,
        })),
        previousHash: txn.previousHash,
      });

      const calculatedHash = crypto.createHash('sha256').update(payloadString).digest('hex');

      if (txn.hash !== calculatedHash) {
        return { isValid: false, brokenAt: txn.transactionNumber };
      }

      expectedPreviousHash = calculatedHash;
    }

    return { isValid: true };
  }
}
