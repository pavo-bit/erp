import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

// Asset Schema
const assetSchema = z.object({
  categoryId: z.string(),
  vendorId: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchaseCost: z.number().optional(),
  location: z.string().optional(),
});

// GET /api/v1/assets - List assets
router.get("/", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;
    const assets = await prisma.asset.findMany({
      where: { schoolId },
      include: { category: true, vendor: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data: assets });
  } catch (e) {
    logger.error({ err: e }, "List assets error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/assets - Create asset
router.post("/", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), validate(assetSchema), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId) as string;
    const asset = await prisma.asset.create({
      data: {
        ...req.body,
        schoolId,
      }
    });
    res.status(201).json({ success: true, data: asset });
  } catch (e) {
    logger.error({ err: e }, "Create asset error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/assets/:id/transfer - Transfer asset (Multilocation tracking)
const transferSchema = z.object({
  toLocation: z.string().optional(),
  toBranchId: z.string().optional(),
  reason: z.string().optional()
});

router.post("/:id/transfer", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ADMIN", "ERP_ADMIN"), validate(transferSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { toLocation, toBranchId, reason } = req.body;
    const schoolId = req.user!.schoolId!;

    const asset = await prisma.asset.findFirst({ where: { id: id as string, schoolId } });
    if (!asset) {
      return res.status(404).json({ success: false, error: "Asset not found" });
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // 1. Create transfer record
      const record = await tx.assetTransfer.create({
        data: {
          assetId: id as string,
          fromLocation: asset.location,
          toLocation,
          toBranchId,
          transferredBy: req.user!.id,
          reason
        }
      });

      // 2. Update asset location
      await tx.asset.update({
        where: { id: id as string },
        data: { location: toLocation || asset.location }
      });

      return record;
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (e) {
    logger.error({ err: e }, "Transfer asset error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/assets/categories - List categories
router.get("/categories", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;
    const categories = await prisma.assetCategory.findMany({
      where: { schoolId },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: categories });
  } catch (e) {
    logger.error({ err: e }, "List asset categories error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/assets/vendors - List vendors
router.get("/vendors", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;
    const vendors = await prisma.vendor.findMany({
      where: { schoolId },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: vendors });
  } catch (e) {
    logger.error({ err: e }, "List vendors error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
