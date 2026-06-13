import prisma from "../lib/prisma";
import logger from "../lib/logger";
import handlebars from "handlebars";
import { sendSSEToUser } from "../lib/sse";
import { enqueueNotification } from "../jobs/queue";

export class CommunicationService {
  /**
   * Resolve template and send a message across the specified channel
   */
  static async sendFromTemplate(
    schoolId: string, 
    templateName: string, 
    channel: "SMS" | "EMAIL" | "WHATSAPP" | "NOTICE", 
    recipient: { userId?: string, phone?: string, email?: string }, 
    data: Record<string, any>
  ): Promise<boolean> {
    try {
      // 1. Find unified Template
      const template = await prisma.template.findUnique({
        where: { schoolId_name_channel: { schoolId, name: templateName, channel } }
      });

      if (!template || !template.isActive) {
        logger.warn({ schoolId, templateName, channel }, "Template not found or inactive");
        return false;
      }

      // 2. Compile Handlebars
      const compiledContent = handlebars.compile(template.content)(data);
      const compiledSubject = template.subject ? handlebars.compile(template.subject)(data) : undefined;

      // 3. Log to CommunicationLog for audit
      const commLog = await prisma.communicationLog.create({
        data: {
          schoolId,
          recipientId: recipient.userId,
          recipientNum: recipient.email || recipient.phone,
          channel,
          type: templateName,
          content: compiledContent,
          status: "QUEUED"
        }
      });

      // 4. Queue Notification for Delivery
      await enqueueNotification({
        logId: commLog.id,
        channel,
        to: recipient.email || recipient.phone || "",
        content: compiledContent,
        subject: compiledSubject
      });

      return true;
    } catch (e) {
      logger.error({ err: e, templateName }, "Failed to send communication from template");
      return false;
    }
  }

  /**
   * Phase 2: Safe Migration Script (Executes softly without dropping old tables)
   */
  static async migrateLegacyTemplates(): Promise<void> {
    logger.info("Starting background migration of legacy templates to unified Template model...");
    
    try {
      const legacyTemplates = await prisma.messageTemplate.findMany();
      let migratedCount = 0;

      for (const tmpl of legacyTemplates) {
        await prisma.template.upsert({
          where: {
            schoolId_name_channel: {
              schoolId: tmpl.schoolId || "SYSTEM",
              name: tmpl.name,
              channel: tmpl.channel,
            }
          },
          update: {
            content: tmpl.bodyTemplate,
            subject: tmpl.subject,
            isActive: true,
          },
          create: {
            schoolId: tmpl.schoolId || "SYSTEM",
            name: tmpl.name,
            channel: tmpl.channel,
            subject: tmpl.subject,
            content: tmpl.bodyTemplate,
            isActive: true,
          }
        });
        migratedCount++;
      }
      logger.info({ migratedCount }, "Legacy templates successfully migrated to unified schema");
    } catch (error) {
      logger.error({ err: error }, "Template migration failed");
    }
  }
}
