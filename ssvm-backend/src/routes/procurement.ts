import { Router, Response } from "express";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { AuthRequest, authenticate, requireOperationsAdmin, requireRole } from "../middleware/auth";
import { z } from "zod";

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
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
              totalPrice: item.quantity * item.estimatedPrice,
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

router.post("/orders/:id/receive", requireOperationsAdmin("ASSET_MANAGER"), async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({
    success: false,
    error: "Goods receipt is unavailable until received quantities can be recorded per purchase-order line",
    code: "GOODS_RECEIPT_UNAVAILABLE",
  });
});

export default router;
