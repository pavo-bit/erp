import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

const router = Router();

// Create Purchase Request
router.post("/requests", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { schoolId, requesterId, departmentId, justification, items } = req.body;

    const requestNumber = `PR-${schoolId}-${Date.now()}`;
    const totalEstAmount = items.reduce((acc: number, item: any) => acc + item.quantity * item.estimatedPrice, 0);

    const pr = await prisma.purchaseRequest.create({
      data: {
        schoolId,
        requestNumber,
        requesterId,
        departmentId,
        justification,
        totalEstAmount,
        status: "PENDING_APPROVAL",
        items: {
          create: items.map((i: any) => ({
            itemId: i.itemId,
            description: i.description,
            quantity: i.quantity,
            estimatedPrice: i.estimatedPrice
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json({ success: true, data: pr });
  } catch (error) {
    next(error);
  }
});

// Approve Purchase Request and Generate PO
router.post("/requests/:id/approve", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { vendorId } = req.body; // Assign a vendor when approving to PO

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pr = await tx.purchaseRequest.update({
        where: { id },
        data: { status: "APPROVED" },
        include: { items: true }
      });

      if (!vendorId) {
          return pr; // Just approved, no PO generated yet
      }

      const poNumber = `PO-${pr.schoolId}-${Date.now()}`;
      const po = await tx.purchaseOrder.create({
        data: {
          schoolId: pr.schoolId,
          vendorId: vendorId,
          poNumber,
          purchaseRequestId: pr.id,
          status: "ISSUED",
          totalAmount: pr.totalEstAmount,
          createdBy: pr.requesterId, // Assuming requester is creating the PO for now, or use system/admin ID
          items: {
            create: pr.items.map((i: any) => ({
              itemId: i.itemId,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.estimatedPrice,
              totalPrice: i.quantity * i.estimatedPrice,
              status: "PENDING"
            }))
          }
        },
        include: { items: true }
      });

      return { pr, po };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Goods Receipt (Receiving items)
router.post("/orders/:id/receive", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { receivedById, remarks, itemsReceived } = req.body; 
        // itemsReceived: Array of { purchaseOrderItemId, quantity }

        const gr = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id } });

            const grNumber = `GR-${po.schoolId}-${Date.now()}`;
            const goodsReceipt = await tx.goodsReceipt.create({
                data: {
                    schoolId: po.schoolId,
                    grNumber,
                    purchaseOrderId: po.id,
                    receivedById,
                    remarks
                }
            });

            for (const item of itemsReceived) {
                await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: {
                        status: "RECEIVED"
                    }
                });
            }

            await tx.purchaseOrder.update({
                where: { id },
                data: { status: "PARTIAL_RECEIPT" } // In a real system, compute if FULFILLED based on quantities
            });

            return goodsReceipt;
        });

        res.json({ success: true, data: gr });
    } catch(error) {
        next(error);
    }
});

export default router;
