import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { createTestApp, createTestSchool, createTestUser, getTestPrisma } from "../helpers/testApp";

const app = createTestApp();
const prisma = getTestPrisma();

describe("goods receipt serializable concurrency", () => {
  it("records only one receipt when two requests receive the same purchase order concurrently", async () => {
    const school = await createTestSchool();
    const { token } = await createTestUser(Role.ERP_ADMIN, school.id);
    const vendor = await prisma.vendor.create({ data: { schoolId: school.id, name: `Vendor-${school.id}` } });
    const location = await prisma.inventoryLocation.create({ data: { schoolId: school.id, name: `Warehouse-${school.id}` } });
    const item = await prisma.inventoryItem.create({ data: { schoolId: school.id, sku: `SKU-${school.id}`, name: "Receipt test item" } });
    const po = await prisma.purchaseOrder.create({
      data: {
        schoolId: school.id,
        vendorId: vendor.id,
        poNumber: `PO-${school.id}`,
        status: "APPROVED",
        createdBy: (await prisma.user.findFirstOrThrow({ where: { schoolId: school.id, role: Role.ERP_ADMIN } })).id,
        items: { create: { description: "Test item", quantity: 1, unitPrice: "0.10", totalPrice: "0.10" } },
      },
      include: { items: true },
    });
    const payload = { locationId: location.id, receivedItems: [{ poItemId: po.items[0].id, itemId: item.id, quantity: "0.10" }] };

    const responses = await Promise.all([
      request(app).post(`/api/v1/admin/purchase-orders/${po.id}/receive`).set("Authorization", `Bearer ${token}`).send(payload),
      request(app).post(`/api/v1/admin/purchase-orders/${po.id}/receive`).set("Authorization", `Bearer ${token}`).send(payload),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.goodsReceipt.count({ where: { schoolId: school.id, purchaseOrderId: po.id } })).toBe(1);
    const stock = await prisma.inventoryStock.findUnique({ where: { itemId_locationId: { itemId: item.id, locationId: location.id } } });
    expect(stock?.quantity.toString()).toBe("0.1");
  });
});
