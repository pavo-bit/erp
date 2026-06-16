import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";

const router = Router();

const requireProcurementRole = requireRole("SUPER_ADMIN", "ADMIN", "ERP_ADMIN", "FINANCE_ADMIN");
const requireApproverRole = requireRole("SUPER_ADMIN", "FINANCE_ADMIN");

// GET /api/v1/admin/purchase-orders
router.get("/", authenticate, requireProcurementRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const pos = await prisma.purchaseOrder.findMany({
      where: { schoolId },
      include: {
        vendor: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, purchaseOrders: pos });
  } catch (error) {
    logger.error({ error }, "Error fetching purchase orders");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/purchase-orders
router.post("/", authenticate, requireProcurementRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const { vendorId, expectedDate, items } = req.body;

    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: "Vendor and items are required" });
      return;
    }

    // Generate PO Number (E.g. PO-SCHOOLID-TIMESTAMP)
    const poNumber = `PO-${schoolId.substring(0, 4).toUpperCase()}-${Date.now()}`;
    let totalAmount = 0;

    const poItemsData = items.map((item: any) => {
      const totalPrice = (item.quantity || 1) * (item.unitPrice || 0);
      totalAmount += totalPrice;
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        schoolId,
        vendorId,
        poNumber,
        status: "PENDING", // Start as PENDING instead of DRAFT for this implementation
        totalAmount,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        createdBy: userId,
        items: {
          create: poItemsData,
        },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, purchaseOrder: po });
  } catch (error) {
    logger.error({ error }, "Error creating purchase order");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/purchase-orders/:id/approve
router.post("/:id/approve", authenticate, requireApproverRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const id = req.params.id as string;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id, schoolId },
    });

    if (!po) {
      res.status(404).json({ success: false, error: "Purchase Order not found" });
      return;
    }

    if (po.status !== "PENDING" && po.status !== "DRAFT") {
      res.status(400).json({ success: false, error: `Cannot approve PO in ${po.status} state` });
      return;
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    logger.info({ poId: id, approvedBy: req.user!.id }, "Purchase Order Approved");

    res.json({ success: true, purchaseOrder: updatedPo });
  } catch (error) {
    logger.error({ error }, "Error approving purchase order");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/v1/admin/purchase-orders/:id/receive
router.post("/:id/receive", authenticate, requireProcurementRole, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { locationId, receivedItems, remarks } = req.body;

    if (!locationId || !receivedItems || !Array.isArray(receivedItems)) {
      res.status(400).json({ success: false, error: "Location and received items are required" });
      return;
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id, schoolId },
      include: { items: true },
    });

    if (!po) {
      res.status(404).json({ success: false, error: "Purchase Order not found" });
      return;
    }

    if (po.status !== "APPROVED") {
      res.status(400).json({ success: false, error: "Only APPROVED Purchase Orders can be received" });
      return;
    }

    // Process GRN and Stock Update within a Transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Goods Receipt
      const grNumber = `GRN-${schoolId.substring(0, 4).toUpperCase()}-${Date.now()}`;
      const grn = await tx.goodsReceipt.create({
        data: {
          schoolId,
          grNumber,
          purchaseOrderId: id,
          receivedById: userId,
          remarks,
        },
      });

      // 2. Process Received Items and Update Stock
      for (const rxItem of receivedItems) {
        const poItem = po.items.find((i: any) => i.id === rxItem.poItemId);
        if (!poItem) continue;

        const quantity = Number(rxItem.quantity);
        if (quantity <= 0) continue;

        // Note: For a robust system, we would map poItem to an actual InventoryItem (itemId).
        // Since PurchaseOrderItem doesn't have an explicit itemId in the schema, 
        // we'll assume the client provides the mapping via rxItem.itemId
        if (!rxItem.itemId) {
          throw new Error(`Inventory itemId is missing for received PO item ${poItem.id}`);
        }

        // Upsert Inventory Stock
        await tx.inventoryStock.upsert({
          where: {
            itemId_locationId: {
              itemId: rxItem.itemId,
              locationId,
            },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            schoolId,
            itemId: rxItem.itemId,
            locationId,
            quantity,
          },
        });

        // 3. Mark PO Item as FULFILLED (Simplified: assuming full receipt)
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { status: "FULFILLED" },
        });
      }

      // 4. Mark PO as FULFILLED
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "FULFILLED" },
      });

      return grn;
    });

    logger.info({ poId: id, grnId: result.id, receivedBy: userId }, "Goods Receipt Note (GRN) generated successfully");

    res.status(201).json({ success: true, goodsReceipt: result });
  } catch (error: any) {
    logger.error({ error }, "Error receiving purchase order");
    res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

export default router;
