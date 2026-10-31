import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { closePeriodMock } = vi.hoisted(() => ({ closePeriodMock: vi.fn() }));

vi.mock("../../middleware/auth", () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    Object.assign(req, { user: { id: "actor-a", role: "ACCOUNTANT", schoolId: "school-a" } });
    next();
  },
  requireFinanceAdmin: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));
vi.mock("../../services/FinancialCloseService", () => ({
  FinancialCloseService: { closePeriod: closePeriodMock },
}));

import financeGovernanceRoutes from "../../routes/finance-governance";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/finance/governance", financeGovernanceRoutes);
  return app;
}

describe("finance governance business boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses authenticated school and actor identity and returns close validation failures", async () => {
    closePeriodMock.mockResolvedValue({
      success: false,
      transactionCount: 0,
      trialBalance: { totalDebits: 1, totalCredits: 0, isBalanced: false },
      checksum: "",
      errors: ["Trial balance imbalance"],
      warnings: [],
    });

    const response = await request(createApp())
      .post("/finance/governance/periods/period-a/close")
      .send({ schoolId: "school-b", closedById: "attacker" })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(closePeriodMock).toHaveBeenCalledWith("school-a", "period-a", "actor-a");
  });

  it("does not report placeholder reconciliation as successful", async () => {
    const response = await request(createApp())
      .post("/finance/governance/reconcile")
      .send({ schoolId: "school-a", accountId: "account-a", statementBalance: 100, lines: [] })
      .expect(501);

    expect(response.body).toMatchObject({ success: false, code: "BANK_RECONCILIATION_UNAVAILABLE" });
  });
});
