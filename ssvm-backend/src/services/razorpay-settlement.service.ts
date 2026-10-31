import Razorpay from "razorpay";
import logger from "../lib/logger";

type RazorpaySettlementClient = {
  settlements: {
    all(options: { from: number; to: number; count: number; skip: number }): Promise<{ items?: RazorpaySettlement[] }>;
    reports(options: { settlement_id: string; count: number; skip: number }): Promise<{ items?: RazorpaySettlementItem[] }>;
  };
}

/**
 * Razorpay Settlement Service
 * Fetches settlement data from Razorpay's API for reconciliation.
 * Uses the Razorpay Node SDK with platform-level credentials.
 */

function getRazorpayClient(): RazorpaySettlementClient {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay settlement credentials are not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret }) as unknown as RazorpaySettlementClient;
}

export interface RazorpaySettlement {
  id: string;
  entity: string;
  amount: number; // in paise
  status: string;
  fees: number; // Razorpay's fee in paise
  tax: number;
  utr: string;
  created_at: number;
}

export interface RazorpaySettlementItem {
  id: string;
  entity: string;
  payment_id: string;
  order_id: string;
  amount: number; // in paise
  fee: number; // in paise
  tax: number; // in paise
  currency: string;
  settlement_id: string;
  created_at: number;
}

export class RazorpaySettlementService {
  /**
   * Fetch all settlements within a date range.
   * Handles pagination automatically (Razorpay max 100 per request).
   */
  static async fetchSettlements(from: Date, to: Date): Promise<RazorpaySettlement[]> {
    const allSettlements: RazorpaySettlement[] = [];
    let skip = 0;
    const count = 100;

    try {
      while (true) {
        const response = await getRazorpayClient().settlements.all({
          from: Math.floor(from.getTime() / 1000),
          to: Math.floor(to.getTime() / 1000),
          count,
          skip,
        });

        const items = response.items || [];
        allSettlements.push(...items);

        if (items.length < count) break; // No more pages
        skip += count;
      }

      logger.info({ count: allSettlements.length, from, to }, "Fetched Razorpay settlements");
      return allSettlements;
    } catch (error) {
      logger.error({ err: error, from, to }, "Failed to fetch Razorpay settlements");
      throw error;
    }
  }

  /**
   * Fetch line items (individual payments) for a specific settlement.
   * Each item maps to a single PaymentTransaction in SSVM via order_id/payment_id.
   */
  static async fetchSettlementItems(settlementId: string): Promise<RazorpaySettlementItem[]> {
    const allItems: RazorpaySettlementItem[] = [];
    let skip = 0;
    const count = 100;

    try {
      while (true) {
        // Razorpay SDK: settlements.fetchTransfersBySettlement or use raw API
        const response = await getRazorpayClient().settlements.reports({
          settlement_id: settlementId,
          count,
          skip,
        });

        const items = response.items || [];
        allItems.push(...items);

        if (items.length < count) break;
        skip += count;
      }

      logger.info({ settlementId, itemCount: allItems.length }, "Fetched settlement items");
      return allItems;
    } catch (error) {
      logger.error({ err: error, settlementId }, "Failed to fetch settlement items");
      throw error;
    }
  }

  /**
   * Convert paise to rupees (Razorpay stores amounts in paise).
   */
  static paiseToRupees(paise: number): number {
    return paise / 100;
  }
}
