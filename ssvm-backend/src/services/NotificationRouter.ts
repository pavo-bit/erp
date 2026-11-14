import { NotificationChannel, NotificationStatus } from "@prisma/client";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

interface AlertPayload {
    notificationId: string;
    schoolId: string;
    recipientId?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    message: string;
}

/**
 * Omnichannel Router for Critical Alerts.
 * Implements a strict fallback chain to guarantee delivery.
 * Chain: PUSH -> WHATSAPP -> SMS -> EMAIL
 */
export class NotificationRouter {

    static async dispatchCriticalAlert(payload: AlertPayload): Promise<void> {
        let delivered = false;

        logger.info(`Starting Omnichannel fallback chain for Notification: ${payload.notificationId}`);

        // 1. Attempt Push Notification
        delivered = await this.attemptDelivery(payload, "PUSH", this.mockPushProvider);
        if (delivered) return;

        // 2. Fallback to WhatsApp
        if (payload.recipientPhone) {
            delivered = await this.attemptDelivery(payload, "WHATSAPP", this.mockWhatsAppProvider);
            if (delivered) return;
        }

        // 3. Fallback to SMS
        if (payload.recipientPhone) {
            delivered = await this.attemptDelivery(payload, "SMS", this.mockSMSProvider);
            if (delivered) return;
        }

        // 4. Fallback to Email (Last Resort)
        if (payload.recipientEmail) {
            delivered = await this.attemptDelivery(payload, "EMAIL", this.mockEmailProvider);
            if (delivered) return;
        }

        logger.error(`Critical Alert ${payload.notificationId} FAILED all fallback channels.`);
        await prisma.notification.update({
            where: { id: payload.notificationId },
            data: { status: "FAILED", errorMessage: "All fallback channels exhausted." }
        });
    }

    private static async attemptDelivery(
        payload: AlertPayload, 
        channel: NotificationChannel, 
        providerFn: (p: AlertPayload) => Promise<boolean>
    ): Promise<boolean> {
        // Log delivery attempt in database
        const deliveryLog = await prisma.notificationDelivery.create({
            data: {
                notificationId: payload.notificationId,
                schoolId: payload.schoolId,
                channel: channel,
                recipientId: payload.recipientId,
                recipientPhone: payload.recipientPhone,
                recipientEmail: payload.recipientEmail,
                status: "QUEUED"
            }
        });

        try {
            // Execute provider logic
            const success = await providerFn(payload);

            if (success) {
                await prisma.notificationDelivery.update({
                    where: { id: deliveryLog.id },
                    data: { status: "SENT", sentAt: new Date() }
                });
                await prisma.notification.update({
                    where: { id: payload.notificationId },
                    data: { status: "SENT", sentAt: new Date() }
                });
                return true;
            } else {
                await prisma.notificationDelivery.update({
                    where: { id: deliveryLog.id },
                    data: { status: "FAILED", errorMessage: "Provider rejected message or unconfigured" }
                });
                return false;
            }
        } catch (error: any) {
            const isUnavailable = error.message?.includes("UNAVAILABLE");
            const statusMsg = isUnavailable ? "Provider unconfigured / UNAVAILABLE" : (error.message || "Delivery failed");
            await prisma.notificationDelivery.update({
                where: { id: deliveryLog.id },
                data: { status: "FAILED", errorMessage: statusMsg }
            });
            logger.error(`Delivery failed on channel ${channel} for ${payload.notificationId}: ${statusMsg}`);
            return false;
        }
    }

    // --- Provider Dispatchers ---
    // Deterministic provider dispatchers: fail honestly when unconfigured, no Math.random.

    private static async mockPushProvider(payload: AlertPayload): Promise<boolean> {
        if (process.env.NOTIFICATION_TEST_ADAPTER === "true") {
            return payload.recipientId !== "fail_user";
        }
        if (!process.env.FCM_SERVER_KEY && !process.env.FIREBASE_CONFIG) {
            throw new Error("UNAVAILABLE: Push notification provider is not configured");
        }
        return false;
    }

    private static async mockWhatsAppProvider(payload: AlertPayload): Promise<boolean> {
        if (process.env.NOTIFICATION_TEST_ADAPTER === "true") {
            return payload.recipientPhone !== "+0000000000";
        }
        if (!process.env.WHATSAPP_API_KEY || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
            throw new Error("UNAVAILABLE: WhatsApp provider is not configured");
        }
        return false;
    }

    private static async mockSMSProvider(payload: AlertPayload): Promise<boolean> {
        if (process.env.NOTIFICATION_TEST_ADAPTER === "true") {
            return payload.recipientPhone !== "+0000000000";
        }
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            throw new Error("UNAVAILABLE: SMS provider is not configured");
        }
        return false;
    }

    private static async mockEmailProvider(payload: AlertPayload): Promise<boolean> {
        if (process.env.NOTIFICATION_TEST_ADAPTER === "true") {
            return payload.recipientEmail !== "fail@test.com";
        }
        if (!process.env.SMTP_HOST && !process.env.SENDGRID_API_KEY && !process.env.RESEND_API_KEY) {
            throw new Error("UNAVAILABLE: Email provider is not configured");
        }
        return false;
    }
}
