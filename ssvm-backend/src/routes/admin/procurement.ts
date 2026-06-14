import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Zod schemas for validation
const vendorSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().optional(),
});

const poItemSchema = z.object({
  description: z.string().min(2),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const purchaseOrderSchema = z.object({
  vendorId: z.string(),
  poNumber: z.string(),
  expectedDate: z.string().datetime().optional(),
  items: z.array(poItemSchema).min(1),
});

const poStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

// =======================
// VENDORS
// =======================

// List Vendors
router.get('/vendors', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const vendors = await prisma.vendor.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: vendors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Vendor
router.post('/vendors', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const data = vendorSchema.parse(req.body);
    const schoolId = req.user!.schoolId!;

    const vendor = await prisma.vendor.create({
      data: {
        ...data,
        schoolId
      }
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// =======================
// PURCHASE ORDERS
// =======================

// List Purchase Orders
router.get('/orders', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const orders = await prisma.purchaseOrder.findMany({
      where: { schoolId },
      include: {
        vendor: true,
        items: true,
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Purchase Order
router.post('/orders', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const data = purchaseOrderSchema.parse(req.body);
    const schoolId = req.user!.schoolId!;
    const createdBy = req.user!.id;

    // Calculate total amount
    const totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        schoolId,
        vendorId: data.vendorId,
        poNumber: data.poNumber,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        totalAmount,
        createdBy,
        status: "DRAFT",
        items: {
          create: data.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            status: "PENDING"
          }))
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update Purchase Order Status
router.put('/orders/:id/status', authenticate, requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = poStatusSchema.parse(req.body);
    const schoolId = req.user!.schoolId!;

    const order = await prisma.purchaseOrder.update({
      where: { id: id as string, schoolId },
      data: { status }
    });

    // If delivered, we can also integrate with Inventory to ingest assets
    // For now, it just updates the PO status.

    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
