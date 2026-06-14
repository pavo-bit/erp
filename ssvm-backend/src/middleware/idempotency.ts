import { Request, Response, NextFunction } from "express";
import { getRedisClient, isRedisAvailable } from "../lib/redis";

const IDEMPOTENCY_HEADER = "idempotency-key";
const LOCK_EXPIRY_SECONDS = 86400; // 24 hours

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
    return next();
  }

  const idempotencyKey = req.headers[IDEMPOTENCY_HEADER];
  
  if (!idempotencyKey || !isRedisAvailable()) {
    return next(); // If no key provided or Redis down, let it pass (fail open)
  }

  const keyString = Array.isArray(idempotencyKey) ? idempotencyKey[0] : idempotencyKey;
  // Use a generic user id fallback or system string if no authenticated context
  const userId = (req as any).user?.schoolId || 'system';
  const redisKey = `idempotency:${userId}:${keyString}`;
  
  try {
    const redis = getRedisClient(); // Get redis instance
    if (!redis) return next();
    
    // Check if key already exists
    const existingResponse = await redis.get(redisKey);
    if (existingResponse) {
      if (existingResponse === "PROCESSING") {
        res.status(409).json({ success: false, error: "Concurrent request processing" });
        return;
      }
      // Replay the cached response
      const cachedData = JSON.parse(existingResponse);
      res.status(cachedData.statusCode).json(cachedData.body);
      return;
    }

    // Set lock
    await redis.set(redisKey, "PROCESSING", "EX", LOCK_EXPIRY_SECONDS);

    // Override res.json to capture the response
    const originalJson = res.json;
    res.json = function (body: any) {
      const responseToCache = {
        statusCode: res.statusCode,
        body
      };
      
      // Save the finalized response asynchronously
      redis.set(redisKey, JSON.stringify(responseToCache), "EX", LOCK_EXPIRY_SECONDS).catch(console.error);
      
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    console.error("Idempotency Redis Error:", error);
    next(); // Fail open if Redis is down, or we could fail closed
  }
};
