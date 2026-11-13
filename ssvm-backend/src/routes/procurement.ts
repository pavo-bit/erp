import { Router, Response } from "express";
import { randomUUID } from "crypto";
import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { AuthRequest, authenticate, requireOperationsAdmin, requireRole } from "../middleware/auth";
import { z } from "zod";
import { LedgerService } from "../services/ledger.service";

const router = Router();
router.use(authenticate);

const purchaseRequestSchema = z.object({
  schoolId: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  items: z.array(z.object({
    itemId: z.string().min(1).optional(),
    description: z.string().trim().min(1),
    quantity: z.number().int().positive().max(2147483647),
    estimatedPrice: z.number().finite().nonnegative().refine((price) => Number.isSafeInteger(Math.round(price * 100)) && Math.abs(price * 100 - Math.round(price * 100)) < 1e-7, "Price must have at most two decimal places"),
  })).min(1),
});

function resolveSchoolId(req: AuthRequest, requestedSchoolId?: unknown): string | null {
  const schoolId = req.user?.role === "SUPER_ADMIN" ? requestedSchoolId : req.user?.schoolId;
  return typeof schoolId === "string" && schoolId.trim() ? schoolId : null;
}

router.post("/requests", requireRole("SUPER_ADMIN", "ERP_ADMIN", "ASSET_MANAGER", "ACCOUNTANT", "HR", "TEACHER", "RECEPTIONIST"), async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = purchaseRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Purchase request data is invalid" });
    return;
  }
  const { departmentId, justification, items } = parsed.data;
  const schoolId = resolveSchoolId(req, parsed.data.schoolId);
  if (!schoolId) {
    res.status(400).json({ success: false, error: "School scope is required" });
    return;
  }
  try {
    if (departmentId) {
      const department = await prisma.department.findFirst({ where: { id: departmentId, schoolId }, select: { id: true } });
      if (!department) {
        res.status(404).json({ success: false, error: "Department not found" });
        return;
      }
    }
    const inventoryItemIds = [...new Set(items.map((item: { itemId?: string }) => item.itemId).filter(Boolean))] as string[];
    if (inventoryItemIds.length) {
      const matchingItems = await prisma.inventoryItem.findMany({ where: { id: { in: inventoryItemIds }, schoolId }, select: { id: true } });
      if (matchingItems.length !== inventoryItemIds.length) {
        res.status(400).json({ success: false, error: "Purchase request references an item outside this school" });
        return;
      }
    }

    const totalInMinorUnits = items.reduce((sum, item) => sum + Math.round(item.quantity * item.estimatedPrice * 100), 0);
    if (!Number.isSafeInteger(totalInMinorUnits)) {
      res.status(400).json({ success: false, error: "Purchase request total is invalid" });
      return;
    }
    const totalEstAmount = totalInMinorUnits / 100;
    const pr = await prisma.purchaseRequest.create({
      data: {
        schoolId,
        requestNumber: `PR-${randomUUID()}`,
        requesterId: req.user!.id,
        departmentId: typeof departmentId === "string" ? departmentId : null,
        justification: typeof justification === "string" ? justification : null,
        totalEstAmount,
        status: "PENDING_APPROVAL",
        items: {
          create: items.map((item) => ({
            itemId: item.itemId || null,
            description: item.description.trim(),
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json({ success: true, data: pr });
  } catch {
    res.status(500).json({ success: false, error: "Unable to create purchase request" });
  }
});

router.post("/requests/:id/approve", requireOperationsAdmin("ASSET_MANAGER"), async (req: AuthRequest, res: Response): Promise<void> => {
  const schoolId = resolveSchoolId(req, req.body?.schoolId);
  if (!schoolId) {
    res.status(400).json({ success: false, error: "School scope is required" });
    return;
  }
  try {
    const result = await runWithTenantDatabaseTransaction(schoolId, async (tx: Prisma.TransactionClient) => {
      const purchaseRequest = await tx.purchaseRequest.findFirst({
        where: { id: req.params.id as string, schoolId, status: "PENDING_APPROVAL" },
        include: { items: true },
      });
      if (!purchaseRequest) return null;

      const vendorId = req.body?.vendorId;
      if (vendorId !== undefined && typeof vendorId !== "string") throw new Error("Vendor ID is invalid");
      if (!vendorId) {
        const updated = await tx.purchaseRequest.updateMany({
          where: { id: purchaseRequest.id, schoolId, status: "PENDING_APPROVAL" },
          data: { status: "APPROVED" },
        });
        return updated.count === 1 ? { purchaseRequest: { ...purchaseRequest, status: "APPROVED" } } : null;
      }

      const vendor = await tx.vendor.findFirst({ where: { id: vendorId, schoolId }, select: { id: true } });
      if (!vendor) throw new Error("Vendor not found in this school");
      const updated = await tx.purchaseRequest.updateMany({
        where: { id: purchaseRequest.id, schoolId, status: "PENDING_APPROVAL" },
        data: { status: "APPROVED" },
      });
      if (updated.count !== 1) return null;

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          schoolId,
          vendorId,
          poNumber: `PO-${randomUUID()}`,
          purchaseRequestId: purchaseRequest.id,
          status: "ISSUED",
          totalAmount: purchaseRequest.totalEstAmount,
          createdBy: req.user!.id,
          items: {
            create: purchaseRequest.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.estimatedPrice,
              totalPrice: item.quantity * Number(item.estimatedPrice),
              status: "PENDING",
            })),
          },
        },
        include: { items: true },
      });
      return { purchaseRequest: { ...purchaseRequest, status: "APPROVED" }, purchaseOrder };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!result) {
      res.status(404).json({ success: false, error: "Pending purchase request not found in this school" });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve purchase request";
    const status = message.includes("not found") ? 404 : message.includes("invalid") ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

router.post("/orders/:id/receive", requireOperationsAdmin("ASSET_MANAGER"), async (req: AuthRequest, res: Response): Promise<void> => {
  const schoolId = resolveSchoolId(req, req.body?.schoolId);
  if (!schoolId) {
    res.status(400).json({ success: false, error: "School scope is required" });
    return;
  }

  const orderId = req.params.id as string;
  const rawLines = req.body?.lines || req.body?.itemsReceived || req.body?.items;
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    res.status(400).json({ success: false, error: "At least one receipt line is required" });
    return;
  }

  const parsedLines: Array<{
    purchaseOrderItemId: string;
    receivedQuantity: number;
    locationId?: string | null;
    notes?: string | null;
  }> = [];

  for (const raw of rawLines) {
    const poItemId = raw.purchaseOrderItemId || raw.itemId;
    const qty = Number(raw.receivedQuantity ?? raw.quantity);
    if (!poItemId || typeof poItemId !== "string" || !Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, error: "Invalid line: purchaseOrderItemId and positive receivedQuantity required" });
      return;
    }
    parsedLines.push({
      purchaseOrderItemId: poItemId,
      receivedQuantity: qty,
      locationId: raw.locationId ?? raw.location ?? null,
      notes: typeof raw.notes === "string" ? raw.notes : null,
    });
  }

  try {
    const result = await runWithTenantDatabaseTransaction(schoolId, async (tx: Prisma.TransactionClient) => {
      // 1. Fetch Purchase Order within school context
      const purchaseOrder = await tx.purchaseOrder.findFirst({
        where: { id: orderId, schoolId },
        include: {
          items: {
            include: {
              goodsReceiptLines: true,
            },
          },
          purchaseRequest: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!purchaseOrder) {
        return { status: 404, error: "Purchase order not found in this school" };
      }

      if (purchaseOrder.status === "CANCELLED" || purchaseOrder.status === "REJECTED") {
        return { status: 400, error: `Cannot receive goods against a ${purchaseOrder.status} order` };
      }

      // 2. Validate line items and reject over-receipt
      for (const line of parsedLines) {
        const poItem = purchaseOrder.items.find((item) => item.id === line.purchaseOrderItemId);
        if (!poItem) {
          return { status: 400, error: `Purchase order item ${line.purchaseOrderItemId} does not belong to this order` };
        }

        const previouslyReceived = poItem.goodsReceiptLines.reduce(
          (sum, grl) => sum + Number(grl.receivedQuantity),
          0
        );
        const maxReceivable = Number(poItem.quantity) - previouslyReceived;
        if (line.receivedQuantity > maxReceivable) {
          return {
            status: 400,
            error: `Over-receipt rejected: item "${poItem.description}" has ${maxReceivable} remaining, but ${line.receivedQuantity} was received`,
          };
        }
      }

      // 3. Generate per-school sequential grNumber via SequenceCounter
      const currentYear = new Date().getFullYear();
      const counterKey = `GR_${currentYear}`;
      const counter = await tx.sequenceCounter.upsert({
        where: { schoolId_key: { schoolId, key: counterKey } },
        update: { currentValue: { increment: 1 } },
        create: { schoolId, key: counterKey, currentValue: 1 },
      });
      const grNumber = `GR-${currentYear}-${String(counter.currentValue).padStart(6, "0")}`;

      // 4. Create GoodsReceipt
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          schoolId,
          grNumber,
          purchaseOrderId: purchaseOrder.id,
          receivedById: req.user!.id,
          receivedDate: new Date(),
          remarks: typeof req.body?.remarks === "string" ? req.body.remarks : null,
        },
      });

      // 5. Create GoodsReceiptLines and update InventoryStock + StockLedger in same transaction
      const createdLines = [];
      for (const line of parsedLines) {
        const poItem = purchaseOrder.items.find((item) => item.id === line.purchaseOrderItemId)!;
        const grLine = await tx.goodsReceiptLine.create({
          data: {
            schoolId,
            goodsReceiptId: goodsReceipt.id,
            purchaseOrderItemId: poItem.id,
            receivedQuantity: new Prisma.Decimal(line.receivedQuantity),
            location: line.locationId || null,
            notes: line.notes || null,
          },
        });
        createdLines.push(grLine);

        // Find associated inventory item from purchase request
        const prItem = purchaseOrder.purchaseRequest?.items.find(
          (pri) => pri.description === poItem.description && pri.itemId
        );
        const inventoryItemId = prItem?.itemId;

        let locationId = line.locationId;
        if (!locationId) {
          const defaultLoc = await tx.inventoryLocation.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true },
          });
          locationId = defaultLoc?.id || null;
        }

        if (inventoryItemId && locationId) {
          let stock = await tx.inventoryStock.findFirst({
            where: { itemId: inventoryItemId, locationId, schoolId },
          });
          if (!stock) {
            stock = await tx.inventoryStock.create({
              data: { schoolId, itemId: inventoryItemId, locationId, quantity: new Prisma.Decimal(0) },
            });
          }
          const updatedQuantity = stock.quantity.add(new Prisma.Decimal(line.receivedQuantity));
          await tx.inventoryStock.update({
            where: { id: stock.id },
            data: { quantity: updatedQuantity },
          });

          await tx.stockLedger.create({
            data: {
              schoolId,
              itemId: inventoryItemId,
              locationId,
              movementType: "INWARD",
              quantity: new Prisma.Decimal(line.receivedQuantity),
              balanceAfter: updatedQuantity,
              referenceDoc: grNumber,
              performedById: req.user!.id,
            },
          });
        }

        // Update PO item status
        const totalReceivedNow = poItem.goodsReceiptLines.reduce(
          (sum, grl) => sum + Number(grl.receivedQuantity),
          0
        ) + line.receivedQuantity;

        const newPoItemStatus = totalReceivedNow >= poItem.quantity ? "RECEIVED" : "PARTIALLY_RECEIVED";
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { status: newPoItemStatus },
        });
      }

      // 6. Update Purchase Order overall status
      const allPoItems = await tx.purchaseOrderItem.findMany({
        where: { poId: purchaseOrder.id },
        include: { goodsReceiptLines: true },
      });
      const allFullyReceived = allPoItems.every((item) => {
        const total = item.goodsReceiptLines.reduce((sum, l) => sum + Number(l.receivedQuantity), 0);
        return total >= item.quantity;
      });
      const newPoStatus = allFullyReceived ? "FULFILLED" : "PARTIALLY_RECEIVED";
      await tx.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: { status: newPoStatus },
      });

      // 7. Post double-entry journal entry to General Ledger: Debit 5020-GEN, Credit 2010-AP
      let totalReceivedValue = new Prisma.Decimal(0);
      for (const line of parsedLines) {
        const poItem = purchaseOrder.items.find((item) => item.id === line.purchaseOrderItemId);
        if (poItem) {
          totalReceivedValue = totalReceivedValue.add(poItem.unitPrice.mul(new Prisma.Decimal(line.receivedQuantity)));
        }
      }

      if (totalReceivedValue.gt(0)) {
        const genAcc = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: "5020-GEN" } },
        });
        const apAcc = await tx.ledgerAccount.findUnique({
          where: { schoolId_code: { schoolId, code: "2010-AP" } },
        });

        if (genAcc && apAcc) {
          await LedgerService.postTransaction(
            {
              schoolId,
              referenceType: "INVENTORY",
              referenceId: goodsReceipt.id,
              sourceModule: "INVENTORY",
              description: `Goods Receipt ${grNumber} against PO ${purchaseOrder.poNumber}`,
              postingDate: new Date(),
              createdBy: req.user!.id,
              entries: [
                { accountId: genAcc.id, debitAmount: totalReceivedValue, creditAmount: 0 },
                { accountId: apAcc.id, debitAmount: 0, creditAmount: totalReceivedValue },
              ],
            },
            tx
          );
        }
      }

      return {
        status: 201,
        data: {
          goodsReceipt: { ...goodsReceipt, lines: createdLines },
          purchaseOrderStatus: newPoStatus,
          ledgerPosted: totalReceivedValue.gt(0),
        },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.status !== 201) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process goods receipt";
    const status = message.includes("not found") ? 404 : message.includes("Over-receipt") || message.includes("invalid") ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
