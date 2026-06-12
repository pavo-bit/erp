import { Request, Response } from "express";
import logger from "./logger";

// ═══════════════════════════════════════════
// SSE Connection Manager (Phase 3.1)
// ═══════════════════════════════════════════
// Handles real-time push notifications for active clients

interface SSEClient {
  id: string; // usually userId
  res: Response;
  role: string;
  schoolId?: string | null;
}

// In-memory list of active connections
const activeClients: Set<SSEClient> = new Set();

/**
 * Handle new SSE connections from clients
 */
export function sseHandler(req: Request, res: Response): void {
  // Setup headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable Nginx buffering
  });

  // Extract user info from auth middleware
  const user = (req as any).user;
  if (!user) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: "Unauthorized" })}\n\n`);
    res.end();
    return;
  }

  const client: SSEClient = {
    id: user.id,
    res,
    role: user.role,
    schoolId: user.schoolId,
  };

  activeClients.add(client);
  logger.info({ userId: client.id, role: client.role }, "SSE Client connected");

  // Send initial connection success event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date() })}\n\n`);

  // Keep-alive heartbeat every 30 seconds to prevent proxy timeouts
  const heartbeatId = setInterval(() => {
    res.write(":\n\n"); // SSE comment as heartbeat
  }, 30000);

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(heartbeatId);
    activeClients.delete(client);
    logger.info({ userId: client.id }, "SSE Client disconnected");
  });
}

/**
 * Broadcast an event to all connected clients that match the predicate.
 */
export function broadcastSSE(
  event: string,
  data: unknown,
  predicate?: (client: SSEClient) => boolean
): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let count = 0;

  for (const client of activeClients) {
    if (!predicate || predicate(client)) {
      client.res.write(payload);
      count++;
    }
  }

  logger.debug({ event, sentCount: count }, "Broadcasted SSE event");
}

/**
 * Send an event to a specific user.
 */
export function sendSSEToUser(userId: string, event: string, data: unknown): void {
  broadcastSSE(event, data, (client) => client.id === userId);
}

/**
 * Send an event to all users of a specific school.
 */
export function sendSSEToSchool(schoolId: string, event: string, data: unknown): void {
  broadcastSSE(event, data, (client) => client.schoolId === schoolId || client.role === "SUPER_ADMIN");
}

/**
 * Send an event to all admins across the platform.
 */
export function sendSSEToPlatformAdmins(event: string, data: unknown): void {
  broadcastSSE(event, data, (client) => client.role === "SUPER_ADMIN");
}
