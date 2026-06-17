import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import logger from "../lib/logger";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════
// Reconciliation Service (GAP 12)
// ═══════════════════════════════════════════
// Daily reconciliation between SSVM payment records
// and Razorpay settlements/payments.
// Identifies:
//   1. Payments in Razorpay but not in SSVM (missed webhooks)
//   2. Payments in SSVM but not in Razorpay (phantom records)
//   3. Amount mismatches
//   4. Status mismatches (SSVM says CREATED, Razorpay says captured)

export interface ReconciliationResult {
  date: string;
  schoolId: string;
  totalSSVM: number;
  totalRazorpay: number;
  matched: number;
  missingInSSVM: Array<{ razorpayPaymentId: string; amount: number; orderId: string }>;
  missingInRazorpay: Array<{ ssvmTransactionId: string; amount: number; gatewayPaymentId: string | null }>;
  amountMismatches: Array<{ transactionId: string; ssvmAmount: number; razorpayAmount: number }>;
  statusMismatches: Array<{ transactionId: string; ssvmStatus: string; razorpayStatus: string }>;
  isClean: boolean;
}

export class ReconciliationService {
  private static getRazorpayClient(): Razorpay {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    });
  }

  /**
   * Run daily reconciliation for a specific school.
   * Compares SSVM PaymentTransaction records with Razorpay payments.
   */
  static async runDailyReconciliation(schoolId: string, date?: Date): Promise<ReconciliationResult> {
    const reconciliationDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    const startOfDay = new Date(reconciliationDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reconciliationDate);
    endOfDay.setHours(23, 59, 59, 999);

    logger.info({ schoolId, date: startOfDay.toISOString() }, "Starting daily reconciliation");

    // 1. Fetch SSVM records for this date range
    const ssvmPayments = await prisma.paymentTransaction.findMany({
      where: {
        schoolId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        transactionId: true,
        gatewayPaymentId: true,
        amountPaid: true,
        status: true,
      },
    });

    // 2. Fetch Razorpay payments for the same period
    let razorpayPayments: any[] = [];
    try {
      const razorpay = this.getRazorpayClient();
      const from = Math.floor(startOfDay.getTime() / 1000);
      const to = Math.floor(endOfDay.getTime() / 1000);

      // Razorpay API: fetch payments
      const result = await razorpay.payments.all({
        from,
        to,
        count: 100, // Max per request
      });
      razorpayPayments = result.items || [];
    } catch (err) {
      logger.error({ err, schoolId }, "Failed to fetch Razorpay payments for reconciliation");
      // Continue with empty Razorpay data — will flag all SSVM records as "missing in Razorpay"
    }

    // 3. Build lookup maps
    const ssvmByGatewayId = new Map(
      ssvmPayments
        .filter(p => p.gatewayPaymentId)
        .map(p => [p.gatewayPaymentId!, p])
    );

    const ssvmByOrderId = new Map(
      ssvmPayments
        .filter(p => p.transactionId)
        .map(p => [p.transactionId!, p])
    );

    const razorpayMap = new Map(
      razorpayPayments.map((p: any) => [p.id, p])
    );

    // 4. Reconcile
    const result: ReconciliationResult = {
      date: startOfDay.toISOString().split("T")[0],
      schoolId,
      totalSSVM: ssvmPayments.length,
      totalRazorpay: razorpayPayments.length,
      matched: 0,
      missingInSSVM: [],
      missingInRazorpay: [],
      amountMismatches: [],
      statusMismatches: [],
      isClean: true,
    };

    // Check each Razorpay payment against SSVM
    for (const rzpPayment of razorpayPayments) {
      const ssvmMatch = ssvmByGatewayId.get(rzpPayment.id) || ssvmByOrderId.get(rzpPayment.order_id);

      if (!ssvmMatch) {
        result.missingInSSVM.push({
          razorpayPaymentId: rzpPayment.id,
          amount: rzpPayment.amount / 100,
          orderId: rzpPayment.order_id,
        });
        result.isClean = false;
        continue;
      }

      // Check amount (Razorpay amounts are in paise)
      const razorpayAmount = rzpPayment.amount / 100;
      if (Math.abs(ssvmMatch.amountPaid - razorpayAmount) > 0.01) {
        result.amountMismatches.push({
          transactionId: ssvmMatch.id,
          ssvmAmount: ssvmMatch.amountPaid,
          razorpayAmount,
        });
        result.isClean = false;
      }

      // Check status
      const rzpStatus = rzpPayment.status; // captured, failed, refunded, etc.
      const expectedSSVMStatus = rzpStatus === "captured" ? "SUCCESS" : rzpStatus === "failed" ? "FAILED" : ssvmMatch.status;

      if (ssvmMatch.status !== expectedSSVMStatus && rzpStatus === "captured" && ssvmMatch.status !== "SUCCESS") {
        result.statusMismatches.push({
          transactionId: ssvmMatch.id,
          ssvmStatus: ssvmMatch.status,
          razorpayStatus: rzpStatus,
        });
        result.isClean = false;
      }

      result.matched++;
    }

    // Check SSVM payments with no Razorpay match (phantom records)
    for (const ssvmPayment of ssvmPayments) {
      if (ssvmPayment.gatewayPaymentId && !razorpayMap.has(ssvmPayment.gatewayPaymentId)) {
        result.missingInRazorpay.push({
          ssvmTransactionId: ssvmPayment.id,
          amount: ssvmPayment.amountPaid,
          gatewayPaymentId: ssvmPayment.gatewayPaymentId,
        });
        result.isClean = false;
      }
    }

    // 5. Store reconciliation result
    await prisma.systemLog.create({
      data: {
        level: result.isClean ? "INFO" : "WARN",
        module: "RECONCILIATION",
        message: result.isClean
          ? `Reconciliation clean: ${result.matched} matched`
          : `Reconciliation discrepancies found`,
        metadata: JSON.stringify(result),
        schoolId,
      },
    });

    if (!result.isClean) {
      logger.warn(
        {
          schoolId,
          date: result.date,
          missingInSSVM: result.missingInSSVM.length,
          missingInRazorpay: result.missingInRazorpay.length,
          amountMismatches: result.amountMismatches.length,
          statusMismatches: result.statusMismatches.length,
        },
        "Reconciliation completed with discrepancies"
      );
    } else {
      logger.info({ schoolId, matched: result.matched }, "Reconciliation clean");
    }

    return result;
  }
}
