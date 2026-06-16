import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";

const router = Router();

const requireInventoryRole = requireRole("SUPER_ADMIN", "ADMIN", "ERP_ADMIN", "INVENTORY_ADMIN", "FINANCE_ADMIN");

// ─── Inventory Locations ───

// GET /api/v1/admin/inventory/locations
router.get("/locations", authenticate, requireInventoryRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const locations = await prisma.inventoryLocation.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, locations });
  } catch (error) {
    logger.error({ error }, "Error fetching inventory locations");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/inventory/locations
router.post("/locations", authenticate, requireInventoryRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "Location name is required" });
      return;
    }

    const location = await prisma.inventoryLocation.create({
      data: {
        schoolId,
        name,
        description,
      },
    });

    res.status(201).json({ success: true, location });
  } catch (error) {
    logger.error({ error }, "Error creating inventory location");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── Inventory Items ───

// GET /api/v1/admin/inventory/items
router.get("/items", authenticate, requireInventoryRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const items = await prisma.inventoryItem.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, items });
  } catch (error) {
    logger.error({ error }, "Error fetching inventory items");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/inventory/items
router.post("/items", authenticate, requireInventoryRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { sku, name, categoryId, uom, reorderLevel } = req.body;

    if (!sku || !name) {
      res.status(400).json({ success: false, error: "SKU and Name are required" });
      return;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        schoolId,
        sku,
        name,
        categoryId,
        uom: uom || "NOS",
        reorderLevel: reorderLevel || 0,
      },
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    logger.error({ error }, "Error creating inventory item");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── Inventory Stock ───

// GET /api/v1/admin/inventory/stock
router.get("/stock", authenticate, requireInventoryRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const stock = await prisma.inventoryStock.findMany({
      where: { schoolId },
      include: {
        item: true,
        location: true,
      },
      orderBy: { item: { name: "asc" } },
    });
    res.json({ success: true, stock });
  } catch (error) {
    logger.error({ error }, "Error fetching inventory stock");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
