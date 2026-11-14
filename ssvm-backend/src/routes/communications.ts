import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import handlebars from "handlebars";
import logger from "../lib/logger";
import { CommunicationService } from "../services/communication.service";
import { sendSuccess, sendError } from "../lib/response";
import { sweepOutbox } from "../jobs/outboxRelay";

const router = Router();

// ==========================================
// TEMPLATE MANAGEMENT
// ==========================================

// GET all templates
router.get("/templates", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: templates });
  } catch (e) {
    logger.error({ err: e }, "Failed to fetch templates");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// CREATE OR UPDATE a template
router.post("/templates", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, channel, subject, content, isActive } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!name || !channel || !content) {
      res.status(400).json({ success: false, error: "Required fields missing" });
      return;
    }

    const template = await prisma.template.upsert({
      where: { schoolId_name_channel: { schoolId, name, channel } },
      update: { subject, content, isActive: isActive ?? true },
      create: { schoolId, name, channel, subject, content, isActive: isActive ?? true }
    });

    res.json({ success: true, data: template });
  } catch (e) {
    logger.error({ err: e }, "Failed to save template");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ==========================================
// MOCK DISPATCHER ENGINE
// ==========================================

/**
 * Dispatcher function to handle sending messages.
 * In production, this would integrate with Twilio/SendGrid/MSG91 APIs.
 */
export function isProviderConfigured(channel: string): boolean {
  if (process.env.COMMUNICATION_TEST_ADAPTER === "true") {
    return true;
  }
  if (channel === "SMS") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    return Boolean(sid && token && !sid.startsWith("dummy_") && !sid.startsWith("test_"));
  }
  if (channel === "WHATSAPP") {
    const key = process.env.WHATSAPP_API_KEY;
    return Boolean(key && !key.startsWith("dummy_") && !key.startsWith("test_"));
  }
  if (channel === "EMAIL") {
    const host = process.env.SMTP_HOST;
    const key = process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY;
    return Boolean((host || key) && !key?.startsWith("dummy_") && !key?.startsWith("test_"));
  }
  return false;
}

export async function dispatchMessage(schoolId: string, channel: string, type: string, recipientId: string | null, recipientNum: string, compiledContent: string) {
  // 1. Initial status: QUEUED
  const log = await prisma.communicationLog.create({
    data: {
      schoolId,
      recipientId,
      recipientNum,
      channel,
      type,
      content: compiledContent,
      status: "QUEUED"
    }
  });

  // Check provider configuration honestly
  if (!isProviderConfigured(channel)) {
    const errorMsg = `Provider credentials for channel '${channel}' are not configured`;
    await prisma.communicationLog.update({
      where: { id: log.id },
      data: { status: "UNAVAILABLE", errorMsg }
    });
    return { success: false, status: "UNAVAILABLE", logId: log.id, error: errorMsg };
  }

  try {
    logger.info({ channel, recipientNum, compiledContent }, `[DISPATCHER] Sending ${channel} message`);

    if (process.env.COMMUNICATION_TEST_ADAPTER === "true") {
      if (recipientNum === "FAIL" || recipientNum === "+0000000000") {
        throw new Error("Test adapter delivery rejected");
      }
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: "DELIVERED" }
      });
      return { success: true, status: "DELIVERED", logId: log.id };
    }

    throw new Error("Provider dispatch returned unexpected response");
  } catch (error: any) {
    await prisma.communicationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMsg: error.message }
    });
    return { success: false, status: "FAILED", logId: log.id, error: error.message };
  }
}

// ==========================================
// SENDING ENDPOINTS
// ==========================================

// POST /api/communications/dispatch — Direct message dispatch
router.post("/dispatch", authenticate, requireRole("ADMIN", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { channel, type, recipientNum, content, recipientId } = req.body;
    const schoolId = req.user!.schoolId!;
    if (!channel || !content) {
      return res.status(400).json({ success: false, error: "channel and content are required" });
    }
    const result = await dispatchMessage(schoolId, channel, type || "ALERT", recipientId || null, recipientNum || "", content);
    res.json({ success: result.success, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// SEND an ad-hoc message using a unified template
router.post("/send", authenticate, requireRole("ADMIN", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { templateName, type, variables, recipient, channel } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!templateName || !type || !recipient) {
      return sendError(res, 400, "Required fields missing (templateName, type, recipient)");
    }

    // Use unified communication service
    await CommunicationService.sendFromTemplate(
      schoolId,
      templateName,
      channel || "NOTICE",
      { userId: recipient },
      variables || {}
    );

    return sendSuccess(res, { message: "Message dispatched to communication queue successfully" });
  } catch (e: any) {
    logger.error({ err: e }, "Failed to send message via communication service");
    return sendError(res, 500, e.message || "Failed to dispatch message");
  }
});

// GET Communication Logs
router.get("/logs", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "50", channel, status } = req.query as Record<string, string | undefined>;
    const skip = (Math.max(1, +page) - 1) * Math.min(100, +limit);
    const take = Math.min(100, +limit);

    const where: any = { schoolId: req.user!.schoolId! };
    if (channel) where.channel = channel;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip,
        take
      }),
      prisma.communicationLog.count({ where })
    ]);

    res.json({ success: true, data: logs, pagination: { page: +page, limit: take, total, totalPages: Math.ceil(total / take) } });
  } catch (e) {
    logger.error({ err: e }, "Failed to fetch logs");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/communications/outbox/sweep — Manual trigger for Outbox sweep (Phase 5 reliability)
router.post("/outbox/sweep", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (_req: AuthRequest, res: Response) => {
  try {
    await sweepOutbox();
    res.json({ success: true, message: "Outbox sweep triggered successfully" });
  } catch (e: any) {
    logger.error({ err: e }, "Outbox sweep error");
    res.status(500).json({ success: false, error: e.message || "Failed to sweep outbox" });
  }
});

export default router;
