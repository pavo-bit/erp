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

// PUT /api/v1/assets/:id - Update asset
router.put("/:id", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;
    const { categoryId, vendorId, name, description, serialNumber, purchaseDate, cost, location } = req.body;

    const asset = await prisma.asset.update({
      where: { id: id as string },
      data: {
        categoryId,
        vendorId,
        name,
        description,
        serialNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        cost,
        location
      },
      include: { category: true, vendor: true }
    });

    res.json({ success: true, data: asset });
  } catch (e) {
    logger.error({ err: e }, "Update asset error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/v1/assets/:id - Soft delete asset
router.delete("/:id", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;

    const asset = await prisma.asset.update({
      where: { id: id as string },
      data: { 
        deletedAt: new Date(),
        deletedById: req.user!.id
      }
    });

    res.json({ success: true, data: { message: "Asset deleted successfully" } });
  } catch (e) {
    logger.error({ err: e }, "Delete asset error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/assets/:id/assign - Assign asset to user
router.post("/:id/assign", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "userId is required" });
    }

    const assignment = await prisma.assetAssignment.create({
      data: {
        assetId: id as string,
        userId,
        assignedBy: req.user!.id,
        notes
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        asset: { select: { id: true, name: true, serialNumber: true } }
      }
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (e) {
    logger.error({ err: e }, "Assign asset error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/v1/assets/:id/assign - Unassign asset (return)
router.delete("/:id/assign", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Find the active assignment
    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: { 
        assetId: id as string,
        returnedAt: null
      }
    });

    if (!activeAssignment) {
      return res.status(404).json({ success: false, error: "No active assignment found for this asset" });
    }

    const updated = await prisma.assetAssignment.update({
      where: { id: activeAssignment.id },
      data: { returnedAt: new Date() }
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    logger.error({ err: e }, "Unassign asset error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/assets/:id/maintenance - Get maintenance history
router.get("/:id/maintenance", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const records = await prisma.maintenanceRecord.findMany({
      where: { assetId: id as string },
      orderBy: { startDate: "desc" }
    });

    res.json({ success: true, data: records });
  } catch (e) {
    logger.error({ err: e }, "Get maintenance history error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/assets/:id/maintenance - Log maintenance
router.post("/:id/maintenance", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description, cost, date, performedBy } = req.body;

    if (!description || !date) {
      return res.status(400).json({ success: false, error: "description and date are required" });
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        assetId: id as string,
        description,
        cost: cost ? parseFloat(cost) : null,
        startDate: new Date(date),
        performedBy
      }
    });

    res.status(201).json({ success: true, data: record });
  } catch (e) {
    logger.error({ err: e }, "Log maintenance error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/assets/vendors - Create vendor
router.post("/vendors", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId) as string;
    const { name, contactPerson, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "name is required" });
    }

    const vendor = await prisma.vendor.create({
      data: {
        schoolId,
        name,
        contactName: contactPerson,
        contactPhone: phone,
        contactEmail: email,
        address
      }
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (e) {
    logger.error({ err: e }, "Create vendor error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/assets/vendors/:id - Update vendor
router.put("/vendors/:id", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email, address } = req.body;

    const vendor = await prisma.vendor.update({
      where: { id: id as string },
      data: { name, contactName: contactPerson, contactPhone: phone, contactEmail: email, address }
    });

    res.json({ success: true, data: vendor });
  } catch (e) {
    logger.error({ err: e }, "Update vendor error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/assets/categories - Create category
router.post("/categories", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId) as string;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "name is required" });
    }

    const category = await prisma.assetCategory.create({
      data: { schoolId, name, description }
    });

    res.status(201).json({ success: true, data: category });
  } catch (e) {
    logger.error({ err: e }, "Create asset category error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/assets/categories/:id - Update category
router.put("/categories/:id", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.assetCategory.update({
      where: { id: id as string },
      data: { name, description }
    });

    res.json({ success: true, data: category });
  } catch (e) {
    logger.error({ err: e }, "Update asset category error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/v1/assets/stats - Asset statistics
router.get("/stats", authenticate, requireRole("ASSET_MANAGER", "SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.user!.role === "SUPER_ADMIN" ? req.query.schoolId : req.user!.schoolId) as string;

    const [total, byCategory, assigned] = await Promise.all([
      prisma.asset.count({ where: { schoolId, deletedAt: null } }),
      prisma.asset.groupBy({
        by: ['categoryId'],
        where: { schoolId, deletedAt: null },
        _count: true
      }),
      prisma.assetAssignment.count({ 
        where: { 
          asset: { schoolId },
          returnedAt: null 
        } 
      })
    ]);

    res.json({ 
      success: true, 
      data: { 
        total,
        assigned,
        available: total - assigned,
        byCategory
      } 
    });
  } catch (e) {
    logger.error({ err: e }, "Asset stats error");
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
