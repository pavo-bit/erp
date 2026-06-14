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
        try {
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
                    data: { status: "FAILED", errorMessage: "Provider rejected message" }
                });
                return false;
            }
        } catch (error: any) {
            logger.error(`Delivery failed on channel ${channel} for ${payload.notificationId}`, error);
            return false;
        }
    }

    // --- Mock Providers ---
    // These mock genuine provider logic to prevent local crashes.

    private static async mockPushProvider(payload: AlertPayload): Promise<boolean> {
        // Mock 40% failure rate for push notifications to force fallback
        const isSuccess = Math.random() > 0.4;
        if (!isSuccess) throw new Error("FCM/APNS Token expired");
        return true;
    }

    private static async mockWhatsAppProvider(payload: AlertPayload): Promise<boolean> {
        // Mock 20% failure rate for WhatsApp
        const isSuccess = Math.random() > 0.2;
        if (!isSuccess) throw new Error("WhatsApp API timeout");
        return true;
    }

    private static async mockSMSProvider(payload: AlertPayload): Promise<boolean> {
        return true; // Assume SMS always succeeds if it reaches here
    }

    private static async mockEmailProvider(payload: AlertPayload): Promise<boolean> {
        return true; 
    }
}
