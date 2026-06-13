import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

const router = Router();

// Middleware: All messaging requires auth
router.use(authenticate);

/**
 * GET /api/v1/messages/threads
 * Fetch all message threads for the current user.
 */
router.get("/threads", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId || undefined;
    const userId = req.user!.id;

    const threads = await prisma.messageThread.findMany({
      where: {
        schoolId,
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    res.json({ success: true, data: threads });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch message threads");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/v1/messages/:threadId
 * Fetch all messages for a specific thread.
 */
router.get("/:threadId", async (req: AuthRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId;

    // Verify participation
    const participant = await prisma.messageParticipant.findUnique({
      where: { threadId_userId: { threadId: threadId as string, userId } }
    });

    if (!participant) {
      return res.status(403).json({ success: false, error: "Access denied to this thread" });
    }

    const messages = await prisma.message.findMany({
      where: { threadId: threadId as string, thread: { schoolId: schoolId as string } },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        attachments: true
      },
      orderBy: { createdAt: "asc" }
    });

    res.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch messages");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/v1/messages/threads
 * Start a new thread
 */
router.post("/threads", async (req: AuthRequest, res: Response) => {
  try {
    const { subject, participantIds } = req.body; // participantIds should include the other users
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId || undefined;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, error: "Must provide at least one other participant" });
    }

    // Add self to participants
    const allParticipants = [...new Set([...participantIds, userId])];

    // Optional: Check if a direct thread already exists between exactly these participants?
    // For simplicity, we just create a new thread or a generalized approach.

    const newThread = await prisma.messageThread.create({
      data: {
        schoolId: schoolId as string,
        subject,
        participants: {
          create: allParticipants.map(pid => ({ userId: pid }))
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        }
      }
    });

    res.status(201).json({ success: true, data: newThread });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to create message thread");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/v1/messages/:threadId
 * Send a message
 */
router.post("/:threadId", async (req: AuthRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user!.id;

    // Verify participation
    const participant = await prisma.messageParticipant.findUnique({
      where: { threadId_userId: { threadId: threadId as string, userId } }
    });

    if (!participant) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const message = await prisma.message.create({
      data: {
        threadId: threadId as string,
        senderId: userId,
        content,
        attachments: attachments ? {
          create: attachments.map((att: any) => ({
            fileUrl: att.fileUrl,
            fileName: att.fileName,
            fileSize: att.fileSize
          }))
        } : undefined
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        attachments: true
      }
    });

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: threadId as string },
      data: { updatedAt: new Date() }
    });

    // Send push notification to other participants via NotificationQueue
    const { enqueueNotification } = await import("../jobs/queue");
    
    // Find other participants
    const otherParticipants = await prisma.messageParticipant.findMany({
      where: { threadId: threadId as string, userId: { not: userId } },
      include: { user: true }
    });

    for (const p of otherParticipants) {
      // Create a CommunicationLog for the push notification
      const commLog = await prisma.communicationLog.create({
        data: {
          schoolId: req.user!.schoolId || "SYSTEM",
          recipientId: p.userId,
          recipientNum: (p as any).user?.email || "unknown", // using email as identifier
          channel: "NOTICE", // Internal notice or Push
          type: "NEW_MESSAGE",
          content: `You have a new message in thread: ${threadId}`,
          status: "QUEUED"
        }
      });

      await enqueueNotification({
        logId: commLog.id,
        channel: "NOTICE",
        to: (p as any).user?.id || p.userId,
        subject: "New Message",
        content: `You have a new message from ${req.user!.name}`
      });
    }

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to send message");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/v1/messages/:threadId/read
 * Mark thread as read
 */
router.put("/:threadId/read", async (req: AuthRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user!.id;

    await prisma.messageParticipant.update({
      where: { threadId_userId: { threadId: threadId as string, userId } },
      data: { lastReadAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to mark as read");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
