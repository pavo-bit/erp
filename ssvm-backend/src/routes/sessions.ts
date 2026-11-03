import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { logSecurityEvent } from "../lib/audit";

const router = Router();

router.use(authenticate);

// 1. Get all active sessions for the current user
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const sessions = await prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeen: 'desc' }
    });

    res.json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Revoke a specific device session
router.delete("/:sessionId", async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const { sessionId } = req.params;

    const session = await prisma.userSession.findFirst({
      where: {
        userId,
        OR: [
          { sessionId: sessionId as string },
          { id: sessionId as string },
        ],
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    await prisma.userSession.update({
      where: { id: session.id },
      data: { isActive: false }
    });

    await logSecurityEvent({
      userId,
      eventType: "SESSION_REVOKED",
      severity: "MEDIUM",
      ipAddress: (req.ip as string) || "Unknown",
      metadata: { revokedSessionId: sessionId }
    });

    res.json({ success: true, message: "Session revoked successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Revoke all other sessions (Logout from all other devices)
router.post("/logout-all", async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const currentSessionId = req.user?.sessionId; // Extracted from current token

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    await prisma.userSession.updateMany({
      where: { 
        userId, 
        isActive: true,
        sessionId: { not: currentSessionId || "" }
      },
      data: { isActive: false }
    });

    await logSecurityEvent({
      userId,
      eventType: "ALL_SESSIONS_REVOKED",
      severity: "HIGH",
      ipAddress: (req.ip as string) || "Unknown"
    });

    res.json({ success: true, message: "All other sessions have been revoked" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
