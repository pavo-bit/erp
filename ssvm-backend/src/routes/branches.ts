import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, requireSuperAdmin } from "../middleware/auth";

const router = Router();

// GET /api/branches — List branches for school
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: "schoolId required" }); return; }

    const branches = await prisma.branch.findMany({
      where: { schoolId },
      orderBy: { createdAt: "asc" }
    });
    
    res.json({ success: true, data: branches });
  } catch (e) {
    logger.error({ err: e }, "List branches error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/branches — Create branch (Admin)
router.post("/", authenticate, requireRole("ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "SUPER_ADMIN" ? req.body.schoolId : req.user!.schoolId;
    const { name, address, phone } = req.body;

    if (!schoolId || !name) {
      res.status(400).json({ success: false, error: "schoolId and name required" });
      return;
    }

    const branch = await prisma.branch.create({
      data: { schoolId, name, address, phone }
    });

    res.status(201).json({ success: true, data: branch });
  } catch (e) {
    logger.error({ err: e }, "Create branch error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/branches/:id — Update branch (Admin)
router.put("/:id", authenticate, requireRole("ERP_ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.params.id as string;
    const { name, address, phone, isActive } = req.body;
    const schoolId = req.user!.role === "SUPER_ADMIN" ? undefined : req.user!.schoolId;

    const existing = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!existing) { res.status(404).json({ success: false, error: "Branch not found" }); return; }
    if (schoolId && existing.schoolId !== schoolId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }

    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: { name, address, phone, isActive }
    });

    res.json({ success: true, data: branch });
  } catch (e) {
    logger.error({ err: e }, "Update branch error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/branches/:id — Delete/Deactivate branch
router.delete("/:id", authenticate, requireSuperAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.params.id as string;
    
    // Instead of deleting, just deactivate to preserve relations
    await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: false }
    });

    res.json({ success: true, message: "Branch deactivated" });
  } catch (e) {
    logger.error({ err: e }, "Delete branch error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
