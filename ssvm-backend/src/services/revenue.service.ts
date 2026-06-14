import { PrismaClient } from '@prisma/client';
import { LedgerService } from './ledger.service';

const prisma = new PrismaClient();

export class RevenueService {
  /**
   * Phase 12: Generate a Deferred Revenue Schedule for an Invoice
   * This takes the total invoice amount and spreads it across the months
   * of the academic period.
   */
  static async generateSchedule(
    schoolId: string, 
    invoiceId: string, 
    totalAmount: number, 
    startDate: Date, 
    monthsToRecognize: number
  ) {
    if (monthsToRecognize <= 0) throw new Error("Months must be positive");

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthsToRecognize);

    return await prisma.deferredRevenueSchedule.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        invoiceId,
        totalAmount,
        startDate,
        endDate,
        monthsToRecognize,
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Run Monthly Revenue Recognition
   * Sweeps all ACTIVE schedules and recognizes the revenue for the current month.
   */
  static async recognizeMonthlyRevenue(schoolId: string, periodDate: Date, createdBy: string) {
    const activeSchedules = await prisma.deferredRevenueSchedule.findMany({
      where: { 
        schoolId, 
        status: 'ACTIVE'
      }
    });

    const results = { recognized: 0, totalAmount: 0 };

    for (const schedule of activeSchedules) {
      if (schedule.recognizedAmount >= schedule.totalAmount) {
         await prisma.deferredRevenueSchedule.update({
           where: { id: schedule.id },
           data: { status: 'COMPLETED' }
         });
         continue;
      }

      // Check if already recognized for this period (Idempotency)
      const existing = await prisma.revenueRecognitionEntry.findFirst({
        where: { scheduleId: schedule.id, periodDate }
      });
      if (existing) continue;

      const monthlyAmount = schedule.totalAmount / schedule.monthsToRecognize;
      const remaining = schedule.totalAmount - schedule.recognizedAmount;
      const amountToRecognize = monthlyAmount > remaining ? remaining : monthlyAmount;

      if (amountToRecognize <= 0) continue;

      await prisma.$transaction(async (tx) => {
        // 1. Find Accounts (Debit Deferred Revenue Liability, Credit Tuition Revenue)
        const deferredRevAcc = await tx.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId, code: '2100-DEF' } } });
        const tuitionRevAcc = await tx.ledgerAccount.findUnique({ where: { schoolId_code: { schoolId, code: '4000-TUIT' } } });

        if (!deferredRevAcc || !tuitionRevAcc) {
           throw new Error("Missing 2100-DEF or 4000-TUIT in Chart of Accounts");
        }

        // 2. Create the Ledger Transaction (Move Liability -> Revenue)
        const ledgerTxn = await LedgerService.postTransaction({
          schoolId,
          referenceType: 'REVENUE_RECOGNITION' as any,
          referenceId: schedule.id,
          sourceModule: 'FINANCE' as any,
          description: `Revenue Recognition for Invoice ${schedule.invoiceId} (Period: ${periodDate.toISOString().split('T')[0]})`,
          postingDate: new Date(),
          createdBy,
          entries: [
            { accountId: deferredRevAcc.id, debitAmount: amountToRecognize, creditAmount: 0 },
            { accountId: tuitionRevAcc.id, debitAmount: 0, creditAmount: amountToRecognize }
          ]
        });

        // 3. Create the Recognition Entry
        await tx.revenueRecognitionEntry.create({
          data: {
            id: crypto.randomUUID(),
            scheduleId: schedule.id,
            periodDate,
            amount: amountToRecognize,
            isRecognized: true,
            recognizedAt: new Date(),
            ledgerTxId: ledgerTxn.id
          }
        });

        // 4. Update the Schedule
        const newTotal = schedule.recognizedAmount + amountToRecognize;
        await tx.deferredRevenueSchedule.update({
          where: { id: schedule.id },
          data: {
            recognizedAmount: newTotal,
            status: newTotal >= schedule.totalAmount - 0.01 ? 'COMPLETED' : 'ACTIVE'
          }
        });

        results.recognized++;
        results.totalAmount += amountToRecognize;
      });
    }

    return results;
  }
}
