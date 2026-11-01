import {
  LedgerAccountType,
  LedgerCategory,
  LedgerReferenceType,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { rlsTestPrisma as prisma } from "./setup";

const suffix = randomUUID().replaceAll("-", "");
const schoolId = `ledger-test-${suffix}`;
const debitAccountId = `ledger-debit-${suffix}`;
const creditAccountId = `ledger-credit-${suffix}`;

async function withTenant<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<string[]>`SELECT set_config('app.current_school_id', ${schoolId}, true)`;
    return callback(tx);
  });
}

async function createPostedTransaction(
  entries: Array<{ accountId: string; debitAmount: string; creditAmount: string }>,
  referenceId: string
) {
  return withTenant((tx) => tx.ledgerTransaction.create({
    data: {
      schoolId,
      transactionNumber: `LED-${suffix}-${referenceId}`,
      referenceType: LedgerReferenceType.INVOICE,
      referenceId,
      description: "Ledger invariant test",
      postingDate: new Date(),
      createdBy: "ledger-invariant-test",
      LedgerEntry: {
        create: entries.map((entry) => ({
          accountId: entry.accountId,
          debitAmount: new Prisma.Decimal(entry.debitAmount),
          creditAmount: new Prisma.Decimal(entry.creditAmount),
        })),
      },
    },
    include: { LedgerEntry: true },
  }));
}

describe("PostgreSQL ledger invariants", () => {
  it("accepts a posted transaction only when its entries balance", async () => {
    await prisma.school.create({
      data: { id: schoolId, name: `Ledger Test ${suffix}`, code: `LEDGER${suffix}` },
    });
    await withTenant(async (tx) => {
      await tx.ledgerAccount.createMany({
        data: [
          {
            id: debitAccountId,
            schoolId,
            code: `D-${suffix}`,
            name: `Debit ${suffix}`,
            category: LedgerCategory.ASSET,
            type: LedgerAccountType.CASH,
          },
          {
            id: creditAccountId,
            schoolId,
            code: `C-${suffix}`,
            name: `Credit ${suffix}`,
            category: LedgerCategory.REVENUE,
            type: LedgerAccountType.REVENUE,
          },
        ],
      });
    });

    const transaction = await createPostedTransaction(
      [
        { accountId: debitAccountId, debitAmount: "25.00", creditAmount: "0.00" },
        { accountId: creditAccountId, debitAmount: "0.00", creditAmount: "25.00" },
      ],
      "balanced"
    );
    expect(transaction.LedgerEntry).toHaveLength(2);
    expect(transaction.status).toBe("POSTED");
  });

  it("rejects an unbalanced posted transaction at commit", async () => {
    await expect(createPostedTransaction(
      [
        { accountId: debitAccountId, debitAmount: "25.00", creditAmount: "0.00" },
        { accountId: creditAccountId, debitAmount: "0.00", creditAmount: "24.00" },
      ],
      "unbalanced"
    )).rejects.toThrow(/unbalanced/i);
  });

  it("rejects UPDATE and DELETE of posted transactions and entries", async () => {
    const transaction = await createPostedTransaction(
      [
        { accountId: debitAccountId, debitAmount: "10.00", creditAmount: "0.00" },
        { accountId: creditAccountId, debitAmount: "0.00", creditAmount: "10.00" },
      ],
      "immutable"
    );
    const entryId = transaction.LedgerEntry[0].id;

    await expect(withTenant((tx) => tx.ledgerTransaction.update({
      where: { id: transaction.id },
      data: { description: "attempted update" },
    }))).rejects.toThrow(/immutable/i);
    await expect(withTenant((tx) => tx.ledgerTransaction.delete({
      where: { id: transaction.id },
    }))).rejects.toThrow(/immutable/i);
    await expect(withTenant((tx) => tx.ledgerEntry.update({
      where: { id: entryId },
      data: { description: "attempted update" },
    }))).rejects.toThrow(/immutable/i);
    await expect(withTenant((tx) => tx.ledgerEntry.delete({
      where: { id: entryId },
    }))).rejects.toThrow(/immutable/i);
  });
});
