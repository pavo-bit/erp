import Handlebars from "handlebars";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { enqueueEmail, enqueueSMS } from "../jobs/queue";

class CommunicationService {
  /**
   * Compile a template with variables
   */
  compileTemplate(templateStr: string, variables: Record<string, any>): string {
    try {
      const template = Handlebars.compile(templateStr);
      return template(variables);
    } catch (err) {
      logger.error({ err, templateStr }, "Failed to compile Handlebars template");
      throw new Error("Template compilation failed");
    }
  }

  /**
   * Fetch a unified template from the database
   */
  async getTemplate(name: string, type: string, schoolId: string) {
    const template = await prisma.template.findFirst({
      where: { name, channel: type, schoolId },
    });

    if (!template) {
      throw new Error(`Template not found: ${name} for channel: ${type}`);
    }

    return template;
  }

  /**
   * Send a communication (Email/SMS/WhatsApp) using a unified template
   */
  async send({
    type,
    templateName,
    schoolId,
    recipient,
    variables,
  }: {
    type: "EMAIL" | "SMS" | "WHATSAPP";
    templateName: string;
    schoolId: string;
    recipient: { email?: string; phone?: string; name?: string };
    variables: Record<string, any>;
  }): Promise<void> {
    const template = await this.getTemplate(templateName, type, schoolId);

    // Merge standard variables
    const finalVariables = {
      ...variables,
      recipientName: recipient.name || "User",
      currentYear: new Date().getFullYear(),
    };

    const compiledSubject = template.subject ? this.compileTemplate(template.subject, finalVariables) : "";
    const compiledBody = this.compileTemplate(template.content, finalVariables);

    try {
      if (type === "EMAIL") {
        if (!recipient.email) throw new Error("Email required for EMAIL type");
        await enqueueEmail({
          to: recipient.email,
          subject: compiledSubject || "Notification",
          body: compiledBody,
        });
      } else if (type === "SMS") {
        if (!recipient.phone) throw new Error("Phone required for SMS type");
        await enqueueSMS({
          phone: recipient.phone,
          message: compiledBody,
        });
      } else if (type === "WHATSAPP") {
        if (!recipient.phone) throw new Error("Phone required for WHATSAPP type");
        // WhatsApp integration (placeholder)
        logger.info({ phone: recipient.phone }, "WhatsApp message queued");
      }

      // Log communication history asynchronously
      prisma.activityLog.create({
        data: {
          schoolId,
          type: "NOTICE",
          title: `Communication Sent: ${templateName}`,
          description: `Sent via ${type} to ${recipient.email || recipient.phone}`,
          metadata: {
            recipient,
            templateName,
            type,
            compiledSubject,
          }
        }
      }).catch(err => logger.warn({ err }, "Failed to log communication activity"));

    } catch (error: any) {
      logger.error({ err: error, type, recipient }, "Failed to send communication");
      throw error;
    }
  }
}

export const communicationService = new CommunicationService();
