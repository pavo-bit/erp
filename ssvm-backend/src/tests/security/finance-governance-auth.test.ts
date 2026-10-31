import express from "express";
import request from "supertest";
import financeGovernanceRoutes from "../../routes/finance-governance";
import crmRoutes from "../../routes/crm";
import inventoryRoutes from "../../routes/inventory";
import procurementRoutes from "../../routes/procurement";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/finance/governance", financeGovernanceRoutes);
  app.use("/crm", crmRoutes);
  app.use("/inventory", inventoryRoutes);
  app.use("/procurement", procurementRoutes);
  return app;
}

describe("finance governance authorization", () => {
  it("rejects anonymous period-close requests before using caller-supplied actor data", async () => {
    await request(createApp())
      .post("/finance/governance/periods/period-a/close")
      .send({ schoolId: "school-b", closedById: "attacker" })
      .expect(401);
  });

  it("rejects anonymous reconciliation requests without creating records", async () => {
    await request(createApp())
      .post("/finance/governance/reconcile")
      .send({ schoolId: "school-b", accountId: "account-a", statementBalance: 0, lines: [] })
      .expect(401);
  });

  it("rejects anonymous CRM mutations and reads", async () => {
    const app = createApp();
    await request(app).post("/crm/leads").send({ schoolId: "school-a", studentName: "Test" }).expect(401);
    await request(app).get("/crm/pipeline?schoolId=school-a").expect(401);
  });

  it("rejects anonymous inventory movements and stock reads", async () => {
    const app = createApp();
    await request(app).post("/inventory/movements").send({ schoolId: "school-a", performedById: "attacker" }).expect(401);
    await request(app).get("/inventory/stocks?schoolId=school-a").expect(401);
  });

  it("rejects anonymous procurement requests, approvals, and receipts", async () => {
    const app = createApp();
    await request(app).post("/procurement/requests").send({ schoolId: "school-a", requesterId: "attacker", items: [] }).expect(401);
    await request(app).post("/procurement/requests/request-a/approve").send({ vendorId: "vendor-a" }).expect(401);
    await request(app).post("/procurement/orders/order-a/receive").send({ receivedById: "attacker", itemsReceived: [] }).expect(401);
  });
});
