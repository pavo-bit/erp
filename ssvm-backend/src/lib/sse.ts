import { Request, Response } from "express";
import logger from "./logger";
import Redis from "ioredis";

// ═══════════════════════════════════════════
// SSE Connection Manager (Phase 11B)
// ═══════════════════════════════════════════
// Handles real-time push notifications for active clients
// Uses Redis Pub/Sub for multi-container scaling

interface SSEClient {
  id: string; // usually userId
  res: Response;
  role: string;
  schoolId?: string | null;
}

// In-memory list of active connections on THIS container
const activeClients: Set<SSEClient> = new Set();

// Redis Pub/Sub instances
let pubClient: Redis | null = null;
let subClient: Redis | null = null;
const REDIS_CHANNEL = "sse_events";

// Initialize Redis Pub/Sub
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  pubClient = new Redis(redisUrl, { lazyConnect: true });
  subClient = new Redis(redisUrl, { lazyConnect: true });

  pubClient.on("error", (err) => logger.warn({ err: err.message }, "SSE Redis Publisher error"));
  subClient.on("error", (err) => logger.warn({ err: err.message }, "SSE Redis Subscriber error"));

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    logger.info("SSE Redis Pub/Sub connected");
    subClient!.subscribe(REDIS_CHANNEL, (err, count) => {
      if (err) {
        logger.error({ err: err.message }, "Failed to subscribe to SSE channel");
      } else {
        logger.info(`Subscribed to ${count} SSE channels`);
      }
    });
  }).catch(err => {
    logger.warn({ err: err.message }, "Failed to connect SSE Redis Pub/Sub");
  });

  // Listen for messages from other containers
  subClient.on("message", (channel, message) => {
    if (channel === REDIS_CHANNEL) {
      try {
        const payload = JSON.parse(message);
        const { event, data, target } = payload;
        
        // Broadcast locally to connected clients that match target criteria
        let count = 0;
        const ssePayload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

        for (const client of activeClients) {
          let match = false;
          if (target.type === "BROADCAST") match = true;
          else if (target.type === "USER" && client.id === target.userId) match = true;
          else if (target.type === "SCHOOL" && (client.schoolId === target.schoolId || client.role === "SUPER_ADMIN")) match = true;
          else if (target.type === "ADMINS" && client.role === "SUPER_ADMIN") match = true;

          if (match) {
            client.res.write(ssePayload);
            count++;
          }
        }
        
        if (count > 0) {
          logger.debug({ event, localSentCount: count }, "Routed Redis Pub/Sub message to local SSE clients");
        }
      } catch (err) {
        logger.error({ err }, "Error parsing SSE Pub/Sub message");
      }
    }
  });
} else {
  logger.info("REDIS_URL not set — SSE will run in single-node mode");
}

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
 * Internal helper to publish event to Redis (or fallback to local broadcast)
 */
function publishSSE(event: string, data: unknown, target: any) {
  if (pubClient) {
    const payload = JSON.stringify({ event, data, target });
    pubClient.publish(REDIS_CHANNEL, payload).catch(err => {
      logger.error({ err: err.message }, "Failed to publish SSE to Redis");
    });
  } else {
    // Fallback to local memory if Redis is not configured
    const ssePayload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of activeClients) {
      let match = false;
      if (target.type === "BROADCAST") match = true;
      else if (target.type === "USER" && client.id === target.userId) match = true;
      else if (target.type === "SCHOOL" && (client.schoolId === target.schoolId || client.role === "SUPER_ADMIN")) match = true;
      else if (target.type === "ADMINS" && client.role === "SUPER_ADMIN") match = true;

      if (match) {
        client.res.write(ssePayload);
      }
    }
  }
}

/**
 * Broadcast an event to all connected clients platform-wide.
 */
export function broadcastSSE(event: string, data: unknown): void {
  publishSSE(event, data, { type: "BROADCAST" });
}

/**
 * Send an event to a specific user.
 */
export function sendSSEToUser(userId: string, event: string, data: unknown): void {
  publishSSE(event, data, { type: "USER", userId });
}

/**
 * Send an event to all users of a specific school.
 */
export function sendSSEToSchool(schoolId: string, event: string, data: unknown): void {
  publishSSE(event, data, { type: "SCHOOL", schoolId });
}

/**
 * Send an event to all admins across the platform.
 */
export function sendSSEToPlatformAdmins(event: string, data: unknown): void {
  publishSSE(event, data, { type: "ADMINS" });
}
