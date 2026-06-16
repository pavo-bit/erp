import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";

const router = Router();

// Require Procurement admin, Finance admin, or Super Admin
const requireProcurementRole = requireRole("SUPER_ADMIN", "ADMIN", "ERP_ADMIN", "FINANCE_ADMIN");

// GET /api/v1/admin/vendors
router.get("/", authenticate, requireProcurementRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const vendors = await prisma.vendor.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, vendors });
  } catch (error) {
    logger.error({ error }, "Error fetching vendors");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/vendors
router.post("/", authenticate, requireProcurementRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { name, contactName, contactPhone, contactEmail, address } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "Vendor name is required" });
      return;
    }

    const vendor = await prisma.vendor.create({
      data: {
        schoolId,
        name,
        contactName,
        contactPhone,
        contactEmail,
        address,
      },
    });

    res.status(201).json({ success: true, vendor });
  } catch (error) {
    logger.error({ error }, "Error creating vendor");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/v1/admin/vendors/:id
router.put("/:id", authenticate, requireProcurementRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const id = req.params.id as string;
    const { name, contactName, contactPhone, contactEmail, address } = req.body;

    const vendor = await prisma.vendor.findFirst({
      where: { id, schoolId, deletedAt: null },
    });

    if (!vendor) {
      res.status(404).json({ success: false, error: "Vendor not found" });
      return;
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        contactName,
        contactPhone,
        contactEmail,
        address,
      },
    });

    res.json({ success: true, vendor: updatedVendor });
  } catch (error) {
    logger.error({ error }, "Error updating vendor");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/v1/admin/vendors/:id
router.delete("/:id", authenticate, requireProcurementRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const id = req.params.id as string;

    const vendor = await prisma.vendor.findFirst({
      where: { id, schoolId, deletedAt: null },
    });

    if (!vendor) {
      res.status(404).json({ success: false, error: "Vendor not found" });
      return;
    }

    await prisma.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: req.user!.id,
      },
    });

    res.json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    logger.error({ error }, "Error deleting vendor");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
