import { WebhookEndpoint } from "@prisma/client";
import crypto from "crypto";
import { webhookQueue } from "../jobs/queue";
import logger from "../lib/logger";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export class WebhookService {
  /**
   * Enqueues a webhook payload to be delivered via BullMQ.
   */
  public static async dispatch(endpoint: WebhookEndpoint, eventName: string, data: any) {
    if (!endpoint.enabled || !endpoint.events.includes(eventName)) {
      return;
    }

    const payload: WebhookPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      data,
    };

    // Calculate signature (HMAC-SHA256)
    const signature = crypto
      .createHmac("sha256", endpoint.secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (webhookQueue) {
      await webhookQueue.add(
        "deliverWebhook",
        {
          endpointId: endpoint.id,
          url: endpoint.url,
          payload,
          signature,
        },
        {
          attempts: endpoint.retryCount,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );
    } else {
      logger.warn("Webhook queue is not initialized. Failed to dispatch webhook.");
    }
  }
}
