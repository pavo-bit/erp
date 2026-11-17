import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole, requireAudience } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════════════════
// Platform Grafana Reverse Proxy & Access Gate (Block M4)
// ═══════════════════════════════════════════
router.all(
  "/grafana{/*path}",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  async (req: AuthRequest, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        message: "Grafana platform access authorized",
        proxyTarget: "http://ssvm-grafana:3000",
        path: req.params[0] || "/",
        session: {
          user: req.user?.email,
          role: req.user?.role,
          audience: "PLATFORM",
        },
      },
    });
  }
);

export default router;
