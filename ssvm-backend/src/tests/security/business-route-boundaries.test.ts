import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    inventoryItem: { findFirst: vi.fn() },
    inventoryLocation: { findFirst: vi.fn() },
    inventoryStock: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    stockLedger: { create: vi.fn() },
  };
  return {
    txMock: tx,
    prismaMock: {
      pipelineStage: { findFirst: vi.fn(), findMany: vi.fn() },
      marketingCampaign: { findFirst: vi.fn() },
      admissionEnquiry: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      leadInteraction: { create: vi.fn() },
      department: { findFirst: vi.fn() },
      inventoryItem: { findFirst: vi.fn(), findMany: vi.fn() },
      purchaseRequest: { create: vi.fn() },
      accountingPeriod: { findMany: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("../../lib/prisma", () => ({ default: prismaMock }));
vi.mock("../../middleware/auth", () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    Object.assign(req, { user: { id: "staff-a", role: "ASSET_MANAGER", schoolId: "school-a" } });
    next();
  },
  requireAdmissionsAdmin: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireFinanceAdmin: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireOperationsAdmin: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireRole: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

import crmRoutes from "../../routes/crm";
import inventoryRoutes from "../../routes/inventory";
import procurementRoutes from "../../routes/procurement";
import financeGovernanceRoutes from "../../routes/finance-governance";

function appFor(path: string, router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe("business route authority boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.inventoryItem.findFirst.mockResolvedValue({ id: "item-a" });
    txMock.inventoryLocation.findFirst.mockResolvedValue({ id: "location-a" });
    txMock.inventoryStock.findFirst.mockResolvedValue({ id: "stock-a", quantity: 5 });
    txMock.inventoryStock.update.mockResolvedValue({ id: "stock-a", quantity: 3 });
    txMock.stockLedger.create.mockImplementation(({ data }) => Promise.resolve({ id: "ledger-a", ...data }));
    prismaMock.$transaction.mockImplementation((callback) => callback(txMock));
  });

  it("derives CRM school scope and interaction actor from the authenticated user", async () => {
    prismaMock.pipelineStage.findFirst.mockResolvedValue({ id: "stage-a" });
    prismaMock.admissionEnquiry.create.mockImplementation(({ data }) => Promise.resolve({ id: "lead-a", ...data }));
    prismaMock.admissionEnquiry.findFirst.mockResolvedValue({ id: "lead-a" });
    prismaMock.leadInteraction.create.mockImplementation(({ data }) => Promise.resolve({ id: "interaction-a", ...data }));

    const app = appFor("/crm", crmRoutes);
    await request(app)
      .post("/crm/leads")
      .send({ schoolId: "school-b", studentName: "Student", parentName: "Parent", phone: "123" })
      .expect(201);
    expect(prismaMock.admissionEnquiry.create.mock.calls[0][0].data.schoolId).toBe("school-a");

    await request(app)
      .post("/crm/leads/lead-a/interactions")
      .send({ schoolId: "school-b", type: "CALL", performedBy: "attacker" })
      .expect(201);
    expect(prismaMock.admissionEnquiry.findFirst.mock.calls[0][0].where.schoolId).toBe("school-a");
    expect(prismaMock.leadInteraction.create.mock.calls[0][0].data.performedBy).toBe("staff-a");
  });

  it("derives inventory tenant and actor, and rejects unsupported transfers", async () => {
    const app = appFor("/inventory", inventoryRoutes);
    await request(app)
      .post("/inventory/movements")
      .send({ schoolId: "school-b", performedById: "attacker", itemId: "item-a", locationId: "location-a", movementType: "OUTWARD", quantity: 2 })
      .expect(201);

    expect(txMock.inventoryItem.findFirst.mock.calls[0][0].where.schoolId).toBe("school-a");
    expect(txMock.inventoryLocation.findFirst.mock.calls[0][0].where.schoolId).toBe("school-a");
    expect(txMock.stockLedger.create.mock.calls[0][0].data).toMatchObject({ schoolId: "school-a", performedById: "staff-a", balanceAfter: 3 });

    await request(app)
      .post("/inventory/movements")
      .send({ itemId: "item-a", locationId: "location-a", movementType: "TRANSFER", quantity: 1 })
      .expect(400);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("derives procurement requester identity and does not accept caller school IDs", async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);
    prismaMock.purchaseRequest.create.mockImplementation(({ data }) => Promise.resolve({ id: "request-a", ...data }));

    await request(appFor("/procurement", procurementRoutes))
      .post("/procurement/requests")
      .send({ schoolId: "school-b", requesterId: "attacker", items: [{ description: "Paper", quantity: 2, estimatedPrice: 1.25 }] })
      .expect(201);

    expect(prismaMock.purchaseRequest.create.mock.calls[0][0].data).toMatchObject({ schoolId: "school-a", requesterId: "staff-a", totalEstAmount: 2.5 });
  });

  it("refuses to claim goods receipt without persisted line quantities", async () => {
    await request(appFor("/procurement", procurementRoutes))
      .post("/procurement/orders/order-a/receive")
      .send({ receivedById: "attacker", itemsReceived: [{ purchaseOrderItemId: "line-a", quantity: 99 }] })
      .expect(501);
  });

  it("lists accounting periods only for the authenticated school", async () => {
    prismaMock.accountingPeriod.findMany.mockResolvedValue([{ id: "period-a", schoolId: "school-a" }]);

    await request(appFor("/finance/governance", financeGovernanceRoutes))
      .get("/finance/governance/periods?schoolId=school-b")
      .expect(200)
      .expect({ success: true, data: [{ id: "period-a", schoolId: "school-a" }] });

    expect(prismaMock.accountingPeriod.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { schoolId: "school-a" } }));
  });
});
