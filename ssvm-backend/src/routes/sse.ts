import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { sseHandler } from "../lib/sse";

const router = Router();

// ═══════════════════════════════════════════
// GET /api/v1/sse — Real-time event stream
// ═══════════════════════════════════════════

router.get("/", authenticate, sseHandler);

export default router;
