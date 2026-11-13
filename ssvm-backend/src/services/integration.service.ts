import prisma from '../lib/prisma';
import { DomainEvent } from '@prisma/client';
import crypto from 'crypto';


export class IntegrationService {
  /**
   * Phase 8: Install an Integration App for a specific School
   * Maps an external App (e.g. Zoom, Canvas, Razorpay) to the school 
   * and generates an OAuth Access Token for API access.
   */
  static async installIntegration(schoolId: string, appId: string, installedBy: string, config?: any) {
    const app = await prisma.integrationApp.findUnique({ where: { id: appId } });
    if (!app || !app.isActive) throw new Error("Integration App not found or inactive");

    // Generate a secure access token for the integration (Opaque Token for MVP)
    const accessToken = crypto.randomBytes(48).toString('base64');
    const refreshToken = crypto.randomBytes(48).toString('base64');

    return await prisma.schoolIntegration.upsert({
      where: { schoolId_appId: { schoolId, appId } },
      update: {
        status: 'ACTIVE',
        accessToken,
        refreshToken,
        config: config || {}
      },
      create: {
        schoolId,
        appId,
        installedBy,
        accessToken,
        refreshToken,
        config: config || {},
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Dispatch a Domain Event to all subscribed Integrations via Webhooks
   * Example: When a PAYMENT_POSTED event happens, this function creates
   * a WebhookDelivery record that an async worker will POST to Tally or Razorpay.
   */
  static async dispatchWebhook(domainEvent: DomainEvent) {
    if (!domainEvent.schoolId) return;

    // Find all active integrations for this school
    const integrations = await prisma.schoolIntegration.findMany({
      where: { schoolId: domainEvent.schoolId, status: 'ACTIVE' },
      include: { app: true }
    });

    for (const integration of integrations) {
      const app = integration.app;
      
      // If the app has a webhook URL, we queue a delivery
      if (app.webhookUrl) {
        await prisma.webhookDelivery.create({
          data: {
            schoolId: domainEvent.schoolId,
            appId: app.id,
            eventType: domainEvent.eventType,
            payload: domainEvent.payload as any,
            status: 'PENDING'
          }
        });

        // (In production, a background BullMQ worker picks up this PENDING delivery
        // and executes the actual HTTP POST to the app.webhookUrl)
      }
    }
  }
}
