import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

const router = Router();

// Atomic Stock Movement (Double-Entry principles applied to physical goods)
router.post("/movements", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { schoolId, itemId, locationId, movementType, quantity, referenceDoc, performedById } = req.body;
    // movementType: INWARD, OUTWARD, TRANSFER, ADJUSTMENT

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Find or create the current materialized stock level
      let stock = await tx.inventoryStock.findUnique({
        where: {
          itemId_locationId: {
            itemId,
            locationId
          }
        }
      });

      if (!stock) {
        if (movementType === "OUTWARD") {
            throw new Error("Cannot dispatch from empty location");
        }
        stock = await tx.inventoryStock.create({
          data: {
            schoolId,
            itemId,
            locationId,
            quantity: 0
          }
        });
      }

      // 2. Calculate balance
      let newQuantity = stock.quantity;
      if (movementType === "INWARD" || movementType === "ADJUSTMENT" && quantity > 0) {
        newQuantity += quantity;
      } else if (movementType === "OUTWARD" || movementType === "ADJUSTMENT" && quantity < 0) {
        newQuantity -= Math.abs(quantity);
      }

      if (newQuantity < 0) {
        throw new Error("Insufficient stock for outward movement");
      }

      // 3. Update Materialized View
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity }
      });

      // 4. Append to Immutable Stock Ledger
      const ledgerEntry = await tx.stockLedger.create({
        data: {
          schoolId,
          itemId,
          locationId,
          movementType,
          quantity: Math.abs(quantity), // Quantity logged is absolute movement size
          balanceAfter: newQuantity,    // The verified computed balance
          referenceDoc,
          performedById
        }
      });

      return ledgerEntry;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Materialized Stock View
router.get("/stocks", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const schoolId = req.query.schoolId as string;
        const stocks = await prisma.inventoryStock.findMany({
            where: { schoolId },
            include: { item: true, location: true }
        });
        res.json({ success: true, data: stocks });
    } catch(err) {
        next(err);
    }
});

export default router;
