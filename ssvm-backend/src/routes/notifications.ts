import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireAdmin } from "../middleware/auth";
import { sendSSEToSchool } from "../lib/sse";
import { enqueueEmail, enqueueSMS } from "../jobs/queue";

const router = Router();

// POST /api/notifications/send — Admin: send notification
router.post("/send", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { type, recipientPhone, recipientEmail, recipientName, subject, message } = req.body;

    if (!type || !subject || !message) {
      res.status(400).json({ success: false, error: "Type, subject, and message are required" }); return;
    }

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        schoolId,
        type,
        recipientPhone: recipientPhone || null,
        recipientEmail: recipientEmail || null,
        recipientName: recipientName || null,
        subject,
        message,
        status: "QUEUED",
      },
    });

    // Dispatch to background queue
    if (type === "EMAIL" && recipientEmail) {
      await enqueueEmail({ to: recipientEmail, subject, body: message });
    } else if (type === "SMS" && recipientPhone) {
      await enqueueSMS({ phone: recipientPhone, message });
    } else {
       // Just marking as sent for SYSTEM notifications
       await prisma.notification.update({
         where: { id: notification.id },
         data: { status: "SENT", sentAt: new Date() },
       });
    }

    // Fire SSE Push Notification to alert dashboard users
    sendSSEToSchool(schoolId, "notification_created", notification);

    logger.info({ notificationId: notification.id, type }, "Notification processed");
    res.status(201).json({ success: true, data: notification, message: `${type} notification queued` });
  } catch (e) {
    logger.error({ err: e }, "Send notification error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/notifications/bulk — Admin: send bulk notifications
router.post("/bulk", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { type, subject, message, recipients } = req.body;
    // recipients: Array of { phone?, email?, name? }

    if (!type || !subject || !message || !recipients?.length) {
      res.status(400).json({ success: false, error: "Type, subject, message, and recipients are required" }); return;
    }

    const notifications = await prisma.notification.createMany({
      data: recipients.map((r: { phone?: string; email?: string; name?: string }) => ({
        schoolId,
        type,
        recipientPhone: r.phone || null,
        recipientEmail: r.email || null,
        recipientName: r.name || null,
        subject,
        message,
        status: "QUEUED" as const,
      })),
    });

    for (const r of recipients) {
      if (type === "EMAIL" && r.email) {
        await enqueueEmail({ to: r.email, subject, body: message });
      } else if (type === "SMS" && r.phone) {
        await enqueueSMS({ phone: r.phone, message });
      }
    }

    sendSSEToSchool(schoolId, "bulk_notification_queued", { type, count: notifications.count });

    logger.info({ count: notifications.count, type }, "Bulk notifications queued");
    res.status(201).json({ success: true, data: { count: notifications.count }, message: `${notifications.count} ${type} notifications queued` });
  } catch (e) {
    logger.error({ err: e }, "Bulk notification error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/notifications — Admin: notification log
router.get("/", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    const { type, limit } = req.query;

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (type) where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit as string) : 50,
    });
    res.json({ success: true, data: notifications });
  } catch (e) {
    logger.error({ err: e }, "List notifications error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/notifications/fee-reminder — Send fee reminders to all pending fees
router.post("/fee-reminder", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;

    const pendingFees = await prisma.invoice.findMany({
      where: { schoolId: schoolId!, status: { in: ["PENDING", "OVERDUE"] } },
      include: { student: { include: { guardian: true } } },
    });

    let sentCount = 0;
    for (const fee of pendingFees) {
      if (fee.student.guardian?.primaryPhone) {
        const message = `Dear Parent, fee of ₹${fee.amount.toLocaleString()} for ${fee.student.name} (${fee.description || fee.type}) is ${fee.status === "OVERDUE" ? "OVERDUE" : "due on " + new Date(fee.dueDate).toLocaleDateString("en-IN")}. Please pay to avoid late fees.`;
        
        await prisma.notification.create({
          data: {
            schoolId: schoolId!,
            type: "SMS",
            recipientPhone: fee.student.guardian?.primaryPhone,
            recipientName: fee.student.guardian?.primaryName || fee.student.name,
            subject: "Fee Reminder",
            message,
            status: "QUEUED",
          },
        });
        
        await enqueueSMS({ phone: fee.student.guardian.primaryPhone, message });
        sentCount++;
      }
    }

    sendSSEToSchool(schoolId!, "fee_reminders_queued", { count: sentCount });

    res.json({ success: true, data: { sentCount }, message: `${sentCount} fee reminders queued` });
  } catch (e) {
    logger.error({ err: e }, "Fee reminder error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// --- Notification Templates CRUD ---

// GET /api/notifications/templates - List all templates
router.get("/templates", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const templates = await prisma.notificationTemplate.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: templates });
  } catch (e) {
    logger.error({ err: e }, "List templates error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/notifications/templates - Create template
router.post("/templates", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, content, isActive } = req.body;
    if (!name || !type || !content) {
      return res.status(400).json({ success: false, error: "Name, type, and content are required" });
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        schoolId: req.user!.schoolId,
        name,
        type,
        content,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({ success: true, data: template, message: "Template created" });
  } catch (e) {
    logger.error({ err: e }, "Create template error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/notifications/templates/:id - Update template
router.put("/templates/:id", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, content, isActive } = req.body;
    
    const template = await prisma.notificationTemplate.update({
      where: { id: req.params.id, schoolId: req.user!.schoolId },
      data: { name, type, content, isActive },
    });

    res.json({ success: true, data: template, message: "Template updated" });
  } catch (e) {
    logger.error({ err: e }, "Update template error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/notifications/templates/:id - Delete template
router.delete("/templates/:id", authenticate, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notificationTemplate.delete({
      where: { id: req.params.id, schoolId: req.user!.schoolId },
    });
    res.json({ success: true, message: "Template deleted" });
  } catch (e) {
    logger.error({ err: e }, "Delete template error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
