import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireSchoolAccess, requireRole, AuthRequest } from "../middleware/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";

const prisma = new PrismaClient();
const router = Router();

// Webhook creation validator
const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  enabled: z.boolean().optional(),
});

/**
 * @route GET /api/v1/webhooks
 * @desc Get all webhooks for a school
 */
router.get("/", authenticate, requireSchoolAccess, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { schoolId },
    });

    res.json({ webhooks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

/**
 * @route POST /api/v1/webhooks
 * @desc Create a new webhook endpoint
 */
router.post(
  "/",
  authenticate,
  requireSchoolAccess,
  requireRole(Role.ERP_ADMIN, Role.SUPER_ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({ error: "School ID is required" });
      }

      const parsed = webhookSchema.parse(req.body);
      const secret = "ssvm_wh_" + crypto.randomBytes(32).toString("hex");

      const webhook = await prisma.webhookEndpoint.create({
        data: {
          schoolId,
          url: parsed.url,
          secret,
          events: parsed.events,
          enabled: parsed.enabled !== false,
        },
      });

      res.status(201).json({
        message: "Webhook created successfully",
        webhook,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create webhook" });
    }
  }
);

/**
 * @route DELETE /api/v1/webhooks/:id
 * @desc Delete a webhook endpoint
 */
router.delete(
  "/:id",
  authenticate,
  requireSchoolAccess,
  requireRole(Role.ERP_ADMIN, Role.SUPER_ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.schoolId;
      const { id } = req.params;

      const webhook = await prisma.webhookEndpoint.findFirst({
        where: { id: id as string, schoolId },
      });

      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      await prisma.webhookEndpoint.delete({ where: { id: id as string } });

      res.json({ message: "Webhook deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  }
);

export default router;
