import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { AuthRequest, authenticate, requireOperationsAdmin } from "../middleware/auth";

const router = Router();
router.use(authenticate, requireOperationsAdmin("ASSET_MANAGER"));

function resolveSchoolId(req: AuthRequest, requestedSchoolId?: unknown): string | null {
  const schoolId = req.user?.role === "SUPER_ADMIN" ? requestedSchoolId : req.user?.schoolId;
  return typeof schoolId === "string" && schoolId.trim() ? schoolId : null;
}

router.post("/movements", async (req: AuthRequest, res: Response): Promise<void> => {
  const { itemId, locationId, movementType, quantity, referenceDoc } = req.body;
  const schoolId = resolveSchoolId(req, req.body?.schoolId);

  if (!schoolId) {
    res.status(400).json({ success: false, error: "School scope is required" });
    return;
  }
  if (typeof itemId !== "string" || typeof locationId !== "string" || !itemId || !locationId) {
    res.status(400).json({ success: false, error: "Item and location are required" });
    return;
  }
  if (!["INWARD", "OUTWARD", "ADJUSTMENT"].includes(movementType)) {
    res.status(400).json({ success: false, error: "Movement type is invalid or unsupported" });
    return;
  }
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity === 0 || (movementType !== "ADJUSTMENT" && quantity < 0)) {
    res.status(400).json({ success: false, error: "Quantity must be a finite non-zero number; inward/outward quantities must be positive" });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const [item, location] = await Promise.all([
        tx.inventoryItem.findFirst({ where: { id: itemId, schoolId, isActive: true }, select: { id: true } }),
        tx.inventoryLocation.findFirst({ where: { id: locationId, schoolId, isActive: true }, select: { id: true } }),
      ]);
      if (!item || !location) throw new Error("Item or location not found in this school");

      let stock = await tx.inventoryStock.findFirst({ where: { itemId, locationId, schoolId } });
      if (!stock) {
        if (movementType === "OUTWARD" || (movementType === "ADJUSTMENT" && quantity < 0)) {
          throw new Error("Cannot reduce stock from an empty location");
        }
        stock = await tx.inventoryStock.create({
          data: { schoolId, itemId, locationId, quantity: 0 },
        });
      }

      const delta = movementType === "INWARD" ? quantity : movementType === "OUTWARD" ? -quantity : quantity;
      const newQuantity = stock.quantity + delta;
      if (!Number.isFinite(newQuantity) || newQuantity < 0) {
        throw new Error("Insufficient stock for this movement");
      }

      await tx.inventoryStock.update({ where: { id: stock.id }, data: { quantity: newQuantity } });
      return tx.stockLedger.create({
        data: {
          schoolId,
          itemId,
          locationId,
          movementType,
          quantity: Math.abs(quantity),
          balanceAfter: newQuantity,
          referenceDoc: typeof referenceDoc === "string" ? referenceDoc : null,
          performedById: req.user!.id,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record inventory movement";
    const status = message.includes("not found") ? 404 : message.includes("stock") || message.includes("reduce") ? 409 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

router.get("/stocks", async (req: AuthRequest, res: Response): Promise<void> => {
  const schoolId = resolveSchoolId(req, req.query.schoolId);
  if (!schoolId) {
    res.status(400).json({ success: false, error: "School scope is required" });
    return;
  }

  try {
    const stocks = await prisma.inventoryStock.findMany({
      where: { schoolId },
      include: { item: true, location: true },
    });
    res.json({ success: true, data: stocks });
  } catch {
    res.status(500).json({ success: false, error: "Unable to load inventory stock" });
  }
});

export default router;
