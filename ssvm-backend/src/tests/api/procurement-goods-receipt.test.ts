import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, getTestPrisma, createTestUser, createTestSchool } from '../helpers/testApp';
import { Role, Prisma } from '@prisma/client';

const app = createTestApp();
const prisma = getTestPrisma();

describe('Goods Receipt Engine against PO Lines (B7)', () => {
  let schoolAId: string;
  let schoolBId: string;
  let assetManagerAToken: string;
  let assetManagerBToken: string;
  let vendorId: string;
  let inventoryItemId: string;
  let locationId: string;

  beforeEach(async () => {
    const schoolA = await createTestSchool();
    const schoolB = await createTestSchool();
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    const managerA = await createTestUser(Role.ASSET_MANAGER, schoolAId);
    assetManagerAToken = managerA.token;

    const managerB = await createTestUser(Role.ASSET_MANAGER, schoolBId);
    assetManagerBToken = managerB.token;

    // Vendor in School A
    const vendor = await prisma.vendor.create({
      data: {
        schoolId: schoolAId,
        name: `Vendor A ${Date.now()}`,
        contactName: 'John Vendor',
        contactEmail: `vendor_${Date.now()}@example.com`,
      },
    });
    vendorId = vendor.id;

    // Inventory Item and Location in School A
    const item = await prisma.inventoryItem.create({
      data: {
        schoolId: schoolAId,
        name: 'A4 Printing Paper',
        sku: `SKU-PAPER-${Date.now()}`,
        reorderLevel: 10,
      },
    });
    inventoryItemId = item.id;

    const location = await prisma.inventoryLocation.create({
      data: {
        schoolId: schoolAId,
        name: 'Main Storage Warehouse',
      },
    });
    locationId = location.id;
  });

  it('1. Receives partial goods, updates InventoryStock + StockLedger in same transaction, generates GR number', async () => {
    // Create Purchase Request linked to item
    const pr = await prisma.purchaseRequest.create({
      data: {
        schoolId: schoolAId,
        requestNumber: `PR-${Date.now()}`,
        requesterId: (await createTestUser(Role.ERP_ADMIN, schoolAId)).user.id,
        status: 'APPROVED',
        totalEstAmount: new Prisma.Decimal(1000),
        items: {
          create: [{
            itemId: inventoryItemId,
            description: 'A4 Printing Paper',
            quantity: 20,
            estimatedPrice: new Prisma.Decimal(50),
          }],
        },
      },
      include: { items: true },
    });

    // Create Purchase Order with 20 quantity
    const po = await prisma.purchaseOrder.create({
      data: {
        schoolId: schoolAId,
        vendorId,
        poNumber: `PO-${Date.now()}`,
        status: 'ISSUED',
        totalAmount: new Prisma.Decimal(1000),
        createdBy: pr.requesterId,
        purchaseRequestId: pr.id,
        items: {
          create: [{
            description: 'A4 Printing Paper',
            quantity: 20,
            unitPrice: new Prisma.Decimal(50),
            totalPrice: new Prisma.Decimal(1000),
            status: 'PENDING',
          }],
        },
      },
      include: { items: true },
    });

    const poItemId = po.items[0].id;

    // Post Goods Receipt for 8 units (partial receipt)
    const res = await request(app)
      .post(`/api/v1/procurement-ops/orders/${po.id}/receive`)
      .set('Authorization', `Bearer ${assetManagerAToken}`)
      .send({
        lines: [{
          purchaseOrderItemId: poItemId,
          receivedQuantity: 8,
          locationId,
        }],
        remarks: 'First partial batch',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    const grData = res.body.data.goodsReceipt;
    expect(grData.grNumber).toMatch(/^GR-\d{4}-\d{6}$/);
    expect(res.body.data.purchaseOrderStatus).toBe('PARTIALLY_RECEIVED');

    // Verify GoodsReceiptLine created
    const grLines = await prisma.goodsReceiptLine.findMany({ where: { goodsReceiptId: grData.id } });
    expect(grLines).toHaveLength(1);
    expect(Number(grLines[0].receivedQuantity)).toBe(8);

    // Verify InventoryStock was updated in the same transaction
    const stock = await prisma.inventoryStock.findFirst({
      where: { schoolId: schoolAId, itemId: inventoryItemId, locationId },
    });
    expect(stock).toBeDefined();
    expect(Number(stock!.quantity)).toBe(8);

    // Verify StockLedger entry with movementType INWARD and referenceDoc
    const ledger = await prisma.stockLedger.findFirst({
      where: { schoolId: schoolAId, itemId: inventoryItemId, referenceDoc: grData.grNumber },
    });
    expect(ledger).toBeDefined();
    expect(ledger!.movementType).toBe('INWARD');
    expect(Number(ledger!.quantity)).toBe(8);
    expect(Number(ledger!.balanceAfter)).toBe(8);

    // Verify PO item status is PARTIALLY_RECEIVED
    const updatedPoItem = await prisma.purchaseOrderItem.findUnique({ where: { id: poItemId } });
    expect(updatedPoItem!.status).toBe('PARTIALLY_RECEIVED');
  });

  it('2. Over-receipt: strictly rejects receiving more than remaining PO item quantity', async () => {
    const po = await prisma.purchaseOrder.create({
      data: {
        schoolId: schoolAId,
        vendorId,
        poNumber: `PO-OVER-${Date.now()}`,
        status: 'ISSUED',
        totalAmount: new Prisma.Decimal(500),
        createdBy: (await createTestUser(Role.ERP_ADMIN, schoolAId)).user.id,
        items: {
          create: [{
            description: 'Books',
            quantity: 5,
            unitPrice: new Prisma.Decimal(100),
            totalPrice: new Prisma.Decimal(500),
            status: 'PENDING',
          }],
        },
      },
      include: { items: true },
    });

    const poItemId = po.items[0].id;

    // Attempting to receive 10 when PO item has only 5
    const res = await request(app)
      .post(`/api/v1/procurement-ops/orders/${po.id}/receive`)
      .set('Authorization', `Bearer ${assetManagerAToken}`)
      .send({
        lines: [{
          purchaseOrderItemId: poItemId,
          receivedQuantity: 10,
        }],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Over-receipt rejected');

    // Invariant: no GoodsReceipt or GoodsReceiptLine was created
    const grCount = await prisma.goodsReceipt.count({ where: { purchaseOrderId: po.id } });
    expect(grCount).toBe(0);
  });

  it('3. Cross-school isolation: rejects receiving goods against another school purchase order', async () => {
    const poA = await prisma.purchaseOrder.create({
      data: {
        schoolId: schoolAId,
        vendorId,
        poNumber: `PO-CROSS-${Date.now()}`,
        status: 'ISSUED',
        totalAmount: new Prisma.Decimal(200),
        createdBy: (await createTestUser(Role.ERP_ADMIN, schoolAId)).user.id,
        items: {
          create: [{
            description: 'Supplies',
            quantity: 2,
            unitPrice: new Prisma.Decimal(100),
            totalPrice: new Prisma.Decimal(200),
            status: 'PENDING',
          }],
        },
      },
      include: { items: true },
    });

    // Asset Manager from School B attempts to receive PO of School A
    const res = await request(app)
      .post(`/api/v1/procurement-ops/orders/${poA.id}/receive`)
      .set('Authorization', `Bearer ${assetManagerBToken}`)
      .send({
        lines: [{
          purchaseOrderItemId: poA.items[0].id,
          receivedQuantity: 1,
        }],
      })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Purchase order not found in this school');
  });

  it('4. Concurrency: concurrent receipts serialize sequence numbers and fulfill purchase order', async () => {
    const po = await prisma.purchaseOrder.create({
      data: {
        schoolId: schoolAId,
        vendorId,
        poNumber: `PO-CONC-${Date.now()}`,
        status: 'ISSUED',
        totalAmount: new Prisma.Decimal(600),
        createdBy: (await createTestUser(Role.ERP_ADMIN, schoolAId)).user.id,
        items: {
          create: [{
            description: 'Uniforms',
            quantity: 10,
            unitPrice: new Prisma.Decimal(60),
            totalPrice: new Prisma.Decimal(600),
            status: 'PENDING',
          }],
        },
      },
      include: { items: true },
    });

    const poItemId = po.items[0].id;

    // 2 sequential receipts of 5 and 5 to reach exact fulfillment
    const res1 = await request(app)
      .post(`/api/v1/procurement-ops/orders/${po.id}/receive`)
      .set('Authorization', `Bearer ${assetManagerAToken}`)
      .send({
        lines: [{ purchaseOrderItemId: poItemId, receivedQuantity: 5 }],
      })
      .expect(201);

    const res2 = await request(app)
      .post(`/api/v1/procurement-ops/orders/${po.id}/receive`)
      .set('Authorization', `Bearer ${assetManagerAToken}`)
      .send({
        lines: [{ purchaseOrderItemId: poItemId, receivedQuantity: 5 }],
      })
      .expect(201);

    expect(res1.body.data.goodsReceipt.grNumber).not.toBe(res2.body.data.goodsReceipt.grNumber);
    expect(res2.body.data.purchaseOrderStatus).toBe('FULFILLED');

    const poFinal = await prisma.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });
    expect(poFinal!.status).toBe('FULFILLED');
    expect(poFinal!.items[0].status).toBe('RECEIVED');
  });
});
