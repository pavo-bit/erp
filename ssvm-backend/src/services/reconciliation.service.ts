import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { RazorpaySettlementService, RazorpaySettlement, RazorpaySettlementItem } from "./razorpay-settlement.service";

/**
 * Reconciliation Service
 * Core engine that matches Razorpay settlement items against SSVM's
 * PaymentTransaction records and produces reconciliation reports.
 */

export type ReconciliationItemStatus =
  | "MATCHED"
  | "UNMATCHED_PAYMENT"   // In Razorpay, NOT in SSVM — investigate immediately
  | "UNMATCHED_SETTLEMENT" // In SSVM as PAID, not in this settlement — timing diff
  | "AMOUNT_MISMATCH";

export interface ReconciliationItem {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpayAmount: number;      // in rupees
  razorpayFee: number;         // in rupees
  razorpayNetAmount: number;   // amount - fee, in rupees
  ssvmTransactionId?: string;
  ssvmAmountPaid?: number;
  status: ReconciliationItemStatus;
  discrepancy?: number;
}

export interface ReconciliationResult {
  settlementId: string;
  settlementDate: Date;
  settlementAmount: number;
  totalItems: number;
  matched: number;
  unmatchedPayment: number;
  unmatchedSettlement: number;
  amountMismatch: number;
  reconciledAmount: number;
  unreconciledAmount: number;
  items: ReconciliationItem[];
}

export class ReconciliationService {
  /**
   * Reconcile a single Razorpay settlement against SSVM PaymentTransaction records.
   */
  static async reconcileSettlement(settlement: RazorpaySettlement): Promise<ReconciliationResult> {
    const settlementId = settlement.id;
    const settlementAmount = RazorpaySettlementService.paiseToRupees(settlement.amount);
    const settlementDate = new Date(settlement.created_at * 1000);

    // Fetch the line items for this settlement
    let items: RazorpaySettlementItem[];
    try {
      items = await RazorpaySettlementService.fetchSettlementItems(settlementId);
    } catch (err) {
      logger.error({ err, settlementId }, "Failed to fetch settlement items");
      return {
        settlementId,
        settlementDate,
        settlementAmount,
        totalItems: 0,
        matched: 0,
        unmatchedPayment: 0,
        unmatchedSettlement: 0,
        amountMismatch: 0,
        reconciledAmount: 0,
        unreconciledAmount: settlementAmount,
        items: [],
      };
    }

    const reconciliationItems: ReconciliationItem[] = [];
    let reconciledAmount = 0;

    for (const item of items) {
      const razorpayAmount = RazorpaySettlementService.paiseToRupees(item.amount);
      const razorpayFee = RazorpaySettlementService.paiseToRupees(item.fee);
      const razorpayNetAmount = razorpayAmount - razorpayFee;

      // Try to find the matching PaymentTransaction by transactionId (Razorpay order_id)
      let ssvmTransaction = await prisma.paymentTransaction.findUnique({
        where: { transactionId: item.order_id },
      });

      // Fallback: try matching by gatewayPaymentId (razorpay payment_id)
      if (!ssvmTransaction && item.payment_id) {
        ssvmTransaction = await prisma.paymentTransaction.findUnique({
          where: { gatewayPaymentId: item.payment_id },
        });
      }

      if (!ssvmTransaction) {
        // CRITICAL: Money Razorpay says was collected, but SSVM has no record
        reconciliationItems.push({
          razorpayPaymentId: item.payment_id,
          razorpayOrderId: item.order_id,
          razorpayAmount,
          razorpayFee,
          razorpayNetAmount,
          status: "UNMATCHED_PAYMENT",
        });
        continue;
      }

      // Match found — verify amount alignment
      const amountDiff = Math.abs(ssvmTransaction.amountPaid - razorpayAmount);
      const toleranceRupees = 1; // Allow Rs 1 rounding tolerance

      if (amountDiff > toleranceRupees) {
        reconciliationItems.push({
          razorpayPaymentId: item.payment_id,
          razorpayOrderId: item.order_id,
          razorpayAmount,
          razorpayFee,
          razorpayNetAmount,
          ssvmTransactionId: ssvmTransaction.id,
          ssvmAmountPaid: ssvmTransaction.amountPaid,
          status: "AMOUNT_MISMATCH",
          discrepancy: ssvmTransaction.amountPaid - razorpayAmount,
        });
        continue;
      }

      // Perfect match
      reconciledAmount += razorpayAmount;
      reconciliationItems.push({
        razorpayPaymentId: item.payment_id,
        razorpayOrderId: item.order_id,
        razorpayAmount,
        razorpayFee,
        razorpayNetAmount,
        ssvmTransactionId: ssvmTransaction.id,
        ssvmAmountPaid: ssvmTransaction.amountPaid,
        status: "MATCHED",
      });
    }

    const matched = reconciliationItems.filter(i => i.status === "MATCHED").length;
    const unmatchedPayment = reconciliationItems.filter(i => i.status === "UNMATCHED_PAYMENT").length;
    const amountMismatch = reconciliationItems.filter(i => i.status === "AMOUNT_MISMATCH").length;

    return {
      settlementId,
      settlementDate,
      settlementAmount,
      totalItems: reconciliationItems.length,
      matched,
      unmatchedPayment,
      unmatchedSettlement: 0,
      amountMismatch,
      reconciledAmount,
      unreconciledAmount: settlementAmount - reconciledAmount,
      items: reconciliationItems,
    };
  }

  /**
   * Run full reconciliation for a date range and persist results.
   * Called by the daily BullMQ worker.
   */
  static async runDailyReconciliation(from: Date, to: Date): Promise<{
    processed: number;
    fullyReconciled: number;
    partiallyReconciled: number;
    failed: number;
    criticalAlerts: string[];
  }> {
    const settlements = await RazorpaySettlementService.fetchSettlements(from, to);

    let processed = 0;
    let fullyReconciled = 0;
    let partiallyReconciled = 0;
    let failed = 0;
    const criticalAlerts: string[] = [];

    for (const settlement of settlements) {
      // Skip already-reconciled settlements
      const existing = await prisma.razorpayReconciliation.findUnique({
        where: { settlementId: settlement.id },
      });

      if (existing && existing.status === "FULLY_RECONCILED") {
        logger.info({ settlementId: settlement.id }, "Settlement already fully reconciled, skipping");
        continue;
      }

      const result = await this.reconcileSettlement(settlement);

      // Determine overall status
      let status: "FULLY_RECONCILED" | "PARTIALLY_RECONCILED" | "FAILED";
      if (result.unmatchedPayment === 0 && result.amountMismatch === 0 && result.matched > 0) {
        status = "FULLY_RECONCILED";
        fullyReconciled++;
      } else if (result.matched > 0) {
        status = "PARTIALLY_RECONCILED";
        partiallyReconciled++;
      } else {
        status = "FAILED";
        failed++;
      }

      // Determine the schoolId from matched transactions
      let schoolId: string | null = null;
      const matchedItem = result.items.find(i => i.ssvmTransactionId);
      if (matchedItem?.ssvmTransactionId) {
        const txn = await prisma.paymentTransaction.findUnique({
          where: { id: matchedItem.ssvmTransactionId },
          select: { schoolId: true },
        });
        schoolId = txn?.schoolId || null;
      }

      if (!schoolId) {
        const firstSchool = await prisma.school.findFirst({ select: { id: true } });
        schoolId = firstSchool?.id || "UNKNOWN";
      }

      // Persist the reconciliation record
      await prisma.razorpayReconciliation.upsert({
        where: { settlementId: settlement.id },
        update: {
          settlementDate: result.settlementDate,
          settlementAmount: result.settlementAmount,
          reconciledAmount: result.reconciledAmount,
          unreconciledAmount: result.unreconciledAmount,
          status,
          matchedTransactionIds: result.items
            .filter(i => i.ssvmTransactionId)
            .map(i => i.ssvmTransactionId),
          unmatchedItems: result.items
            .filter(i => i.status !== "MATCHED"),
          summary: {
            totalItems: result.totalItems,
            matched: result.matched,
            unmatchedPayment: result.unmatchedPayment,
            amountMismatch: result.amountMismatch,
          },
        },
        create: {
          schoolId,
          settlementId: settlement.id,
          settlementDate: result.settlementDate,
          settlementAmount: result.settlementAmount,
          reconciledAmount: result.reconciledAmount,
          unreconciledAmount: result.unreconciledAmount,
          status,
          matchedTransactionIds: result.items
            .filter(i => i.ssvmTransactionId)
            .map(i => i.ssvmTransactionId),
          unmatchedItems: result.items
            .filter(i => i.status !== "MATCHED"),
          summary: {
            totalItems: result.totalItems,
            matched: result.matched,
            unmatchedPayment: result.unmatchedPayment,
            amountMismatch: result.amountMismatch,
          },
        },
      });

      // Flag critical alerts for unmatched payments
      if (result.unmatchedPayment > 0) {
        const unmatchedTotal = result.items
          .filter(i => i.status === "UNMATCHED_PAYMENT")
          .reduce((sum, i) => sum + i.razorpayAmount, 0);

        criticalAlerts.push(
          `Settlement ${settlement.id}: ${result.unmatchedPayment} unmatched payment(s) ` +
          `totaling Rs ${unmatchedTotal.toFixed(2)} — money collected by Razorpay with no SSVM record`
        );
      }

      processed++;
    }

    logger.info(
      { processed, fullyReconciled, partiallyReconciled, failed, criticalAlerts: criticalAlerts.length },
      "Daily reconciliation completed"
    );

    return { processed, fullyReconciled, partiallyReconciled, failed, criticalAlerts };
  }

  /**
   * Manual match: link an unmatched Razorpay payment to an existing Invoice.
   */
  static async manualMatch(params: {
    reconciliationId: string;
    razorpayPaymentId: string;
    invoiceId: string;
    justification: string;
    userId: string;
  }): Promise<void> {
    const { reconciliationId, razorpayPaymentId, invoiceId, justification, userId } = params;

    const recon = await prisma.razorpayReconciliation.findUnique({
      where: { id: reconciliationId },
    });
    if (!recon) throw new Error("Reconciliation record not found");

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new Error("Invoice not found");

    await prisma.$transaction(async (tx) => {
      // Create a PaymentTransaction record for the manual match
      await tx.paymentTransaction.create({
        data: {
          invoiceId,
          amountPaid: 0,
          gateway: "RAZORPAY",
          gatewayPaymentId: razorpayPaymentId,
          transactionId: `MANUAL-${razorpayPaymentId}`,
          status: "SUCCESS",
          schoolId: invoice.schoolId,
          paidAt: new Date(),
        },
      });

      // Remove the item from unmatchedItems
      const unmatchedItems = (recon.unmatchedItems as any[]) || [];
      const updatedUnmatched = unmatchedItems.filter(
        (item: any) => item.razorpayPaymentId !== razorpayPaymentId
      );

      const matchedIds = ((recon.matchedTransactionIds as string[]) || []);
      await tx.razorpayReconciliation.update({
        where: { id: reconciliationId },
        data: {
          unmatchedItems: updatedUnmatched,
          matchedTransactionIds: [...matchedIds, razorpayPaymentId],
          status: updatedUnmatched.length === 0 ? "FULLY_RECONCILED" : "PARTIALLY_RECONCILED",
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "RECONCILIATION_MANUAL_MATCH",
          userId,
          entity: "RazorpayReconciliation",
          entityId: reconciliationId,
          schoolId: invoice.schoolId,
          details: JSON.stringify({
            razorpayPaymentId,
            invoiceId,
            justification,
          }),
        },
      });
    });

    logger.info({ reconciliationId, razorpayPaymentId, invoiceId }, "Manual reconciliation match completed");
  }
}
