import prisma from "./prisma";
import logger from "./logger";
import crypto from "crypto";

export interface LedgerEntryInput {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export interface PostTransactionInput {
  schoolId: string;
  referenceType: "INVOICE" | "PAYMENT" | "REVERSAL" | "SALARY" | "TRANSPORT" | "LIBRARY" | "INVENTORY" | "ADMISSION" | "OPENING_BALANCE";
  referenceId: string;
  description: string;
  entries: LedgerEntryInput[];
  createdBy: string;
}

/**
 * Enterprise Double-Entry Ledger Engine
 */
export class LedgerEngine {
  /**
   * Posts a mathematically balanced, cryptographically chained transaction to the General Ledger.
   */
  static async postTransaction(input: PostTransactionInput) {
    const { schoolId, referenceType, referenceId, description, entries, createdBy } = input;

    // 1. Double-Entry Mathematical Validation
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (entry.debitAmount < 0 || entry.creditAmount < 0) {
        throw new Error("Negative amounts are strictly forbidden in double-entry accounting.");
      }
      if (entry.debitAmount > 0 && entry.creditAmount > 0) {
        throw new Error("A single entry cannot have both debit and credit amounts.");
      }
      totalDebit += entry.debitAmount;
      totalCredit += entry.creditAmount;
    }

    // Precise floating point comparison (to 2 decimal places)
    const debitRounded = Math.round(totalDebit * 100);
    const creditRounded = Math.round(totalCredit * 100);

    if (debitRounded !== creditRounded) {
      throw new Error(`Transaction Unbalanced: Debits (${totalDebit}) do not equal Credits (${totalCredit}). Post rejected.`);
    }

    if (debitRounded === 0) {
      throw new Error("Zero-value transactions are not permitted.");
    }

    // 2. Cryptographic Hash Chaining
    // To ensure the ledger is tamper-proof, each transaction hash includes the hash of the previous transaction.
    const lastTx = await prisma.ledgerTransaction.findFirst({
      where: { schoolId },
      orderBy: { postingDate: 'desc' },
      select: { hash: true }
    });

    const previousHash = lastTx?.hash || "GENESIS_BLOCK";

    // 3. Post to Database via Interactive Transaction
    return await prisma.$transaction(async (tx: any) => {
      // Generate standard transaction number
      const transactionNumber = `JRNL-${schoolId.substring(0, 4).toUpperCase()}-${Date.now()}`;

      // Calculate new hash based on transaction details + previous hash
      const hashPayload = JSON.stringify({
        schoolId,
        transactionNumber,
        referenceType,
        referenceId,
        entries,
        previousHash,
      });
      const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

      // Create Header
      const ledgerTx = await tx.ledgerTransaction.create({
        data: {
          schoolId,
          transactionNumber,
          referenceType,
          referenceId,
          description,
          source: "SYSTEM",
          status: "POSTED",
          postingDate: new Date(),
          hash,
          previousHash,
          createdBy,
          LedgerEntry: {
            create: entries.map(e => ({
              accountId: e.accountId,
              debitAmount: e.debitAmount,
              creditAmount: e.creditAmount,
              description: e.description,
            })),
          },
        },
        include: { LedgerEntry: true },
      });

      logger.info({ txId: ledgerTx.id, hash, previousHash }, "Immutable Ledger Transaction Posted successfully");

      return ledgerTx;
    });
  }
}
