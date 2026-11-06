import { Prisma } from "@prisma/client";
import { runWithTenantDatabaseTransaction, runWithTrustedDatabaseTransaction } from "../lib/prisma";
import { getEnv } from "../config/env";
import logger from "../lib/logger";

export async function applyLateFinesForSchool(tx: Prisma.TransactionClient, schoolId: string, now = new Date()): Promise<{ appliedCount: number; noRule: boolean }> {
  const eligibleStatuses = ["PENDING", "PARTIAL", "OVERDUE"] as const;
  await tx.invoice.updateMany({
    where: { schoolId, dueDate: { lt: now }, status: { in: [...eligibleStatuses] }, isOverdue: false },
    data: { isOverdue: true },
  });

  const fineRule = await tx.fineRule.findFirst({ where: { schoolId, isActive: true } });
  if (!fineRule) return { appliedCount: 0, noRule: true };

  const graceCutoff = new Date(now.getTime() - fineRule.graceDays * 24 * 60 * 60 * 1000);
  const overdueInvoices = await tx.invoice.findMany({
    where: { schoolId, status: { in: [...eligibleStatuses] }, dueDate: { lt: graceCutoff } },
  });

  let appliedCount = 0;
  for (const invoice of overdueInvoices) {
    let baseFine: Prisma.Decimal;
    if (fineRule.isPercentage) baseFine = invoice.amount.mul(fineRule.fineAmount).div(100);
    else baseFine = fineRule.fineAmount;

    const graceMs = fineRule.graceDays * 24 * 60 * 60 * 1000;
    const daysOverdue = Math.max(1, Math.floor((now.getTime() - (invoice.dueDate.getTime() + graceMs)) / (24 * 60 * 60 * 1000)));
    let targetFine: Prisma.Decimal;
    if (fineRule.frequency === "DAILY") targetFine = baseFine.mul(daysOverdue);
    else if (fineRule.frequency === "MONTHLY") targetFine = baseFine.mul(Math.max(1, Math.floor(daysOverdue / 30) + 1));
    else targetFine = baseFine;

    if (targetFine.gt(invoice.amount)) targetFine = invoice.amount;
    targetFine = new Prisma.Decimal(targetFine.toFixed(2));
    if (invoice.fineAmount.gte(targetFine)) continue;

    const fineDelta = targetFine.sub(invoice.fineAmount);
    await tx.invoice.update({
      where: { id: invoice.id, schoolId },
      data: {
        fineAmount: targetFine,
        remainingAmount: invoice.remainingAmount.add(fineDelta),
        isOverdue: true,
        // Preserve PENDING/PARTIAL payment status; no fine ledger posting until finance approval.
      },
    });
    appliedCount++;
  }
  return { appliedCount, noRule: false };
}

export async function assessLateFinesDaily(now = new Date()): Promise<number> {
  if (!getEnv().LATE_FINE_JOB_ENABLED) {
    logger.info("Daily late fine assessment skipped; feature flag is disabled");
    return 0;
  }

  const schools = await runWithTrustedDatabaseTransaction(
    { purpose: "SCHEDULED_LATE_FINES", actorId: "SYSTEM" },
    (tx) => tx.school.findMany({ select: { id: true } }),
  );
  let assessed = 0;
  for (const { id: schoolId } of schools) {
    const result = await runWithTenantDatabaseTransaction(schoolId, async (tx) =>
      applyLateFinesForSchool(tx, schoolId, now),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    assessed += result.appliedCount;
  }
  logger.info({ assessed, schoolCount: schools.length }, "Daily late fine assessment completed; no ledger entries posted");
  return assessed;
}
