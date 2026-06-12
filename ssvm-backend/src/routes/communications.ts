import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import handlebars from "handlebars";
import logger from "../lib/logger";
import { communicationService } from "../services/communication.service";
import { sendSuccess, sendError } from "../lib/response";

const router = Router();

// ==========================================
// TEMPLATE MANAGEMENT
// ==========================================

// GET all templates
router.get("/templates", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.communicationTemplate.findMany({
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
router.post("/templates", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, channel, subject, content, isActive } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!name || !channel || !content) {
      res.status(400).json({ success: false, error: "Required fields missing" });
      return;
    }

    const template = await prisma.communicationTemplate.upsert({
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
async function dispatchMessage(schoolId: string, channel: string, type: string, recipientId: string | null, recipientNum: string, compiledContent: string) {
  // 1. Log as PENDING
  const log = await prisma.communicationLog.create({
    data: {
      schoolId,
      recipientId,
      recipientNum,
      channel,
      type,
      content: compiledContent,
      status: "PENDING"
    }
  });

  try {
    // 2. MOCK PROVIDER API CALL
    logger.info({ channel, recipientNum, compiledContent }, `[DISPATCHER] Sending ${channel} message`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simulate 95% success rate
    const isSuccess = Math.random() > 0.05;
    
    if (isSuccess) {
      // 3. Mark as DELIVERED
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: "DELIVERED" }
      });
      return { success: true, logId: log.id };
    } else {
      throw new Error("Provider API timeout or rejected");
    }
  } catch (error: any) {
    // 4. Mark as FAILED
    await prisma.communicationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMsg: error.message }
    });
    return { success: false, logId: log.id, error: error.message };
  }
}

// ==========================================
// SENDING ENDPOINTS
// ==========================================

// SEND an ad-hoc message using a unified template
router.post("/send", authenticate, requireRole("ADMIN", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { templateName, type, variables, recipient } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!templateName || !type || !recipient) {
      return sendError(res, 400, "Required fields missing (templateName, type, recipient)");
    }

    // Use unified communication service
    await communicationService.send({
      type,
      templateName,
      schoolId,
      recipient,
      variables: variables || {}
    });

    return sendSuccess(res, { message: "Message dispatched to communication queue successfully" });
  } catch (e: any) {
    logger.error({ err: e }, "Failed to send message via communication service");
    return sendError(res, 500, e.message || "Failed to dispatch message");
  }
});

// GET Communication Logs
router.get("/logs", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res: Response) => {
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

export default router;
