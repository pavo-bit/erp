import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, auditMock } = vi.hoisted(() => ({
  prismaMock: {
    dataRetentionPolicy: { findMany: vi.fn() },
    visitorLog: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    auditLog: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  },
  auditMock: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({ default: prismaMock }));
vi.mock("../../lib/audit", () => ({ createAuditLog: auditMock }));

import { DataRetentionService } from "../../services/DataRetentionService";

const policy = {
  id: "policy-1",
  schoolId: "school-a",
  entityName: "VisitorLog",
  retentionDays: 90,
  action: "PURGE",
};

describe("DataRetentionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let page = 0;
    prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([policy]);
    prismaMock.visitorLog.count.mockResolvedValue(300);
    prismaMock.visitorLog.findMany.mockImplementation(({ take }: { take: number }) => {
      page += 1;
      return Promise.resolve(Array.from({ length: page === 1 ? take : 50 }, (_, index) => ({ id: `visitor-${page}-${index}` })));
    });
    prismaMock.visitorLog.deleteMany.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve({ count: where.id.in.length }),
    );
  });

  it("previews matches without deleting data and writes an operator audit", async () => {
    const result = await DataRetentionService.executePolicies({ schoolId: "school-a", dryRun: true, operatorId: "operator-1" });

    expect(result[0]).toMatchObject({ matchedCount: 300, deletedCount: 0, status: "PREVIEWED", dryRun: true });
    expect(prismaMock.dataRetentionPolicy.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true, schoolId: "school-a" } }));
    expect(prismaMock.visitorLog.deleteMany).not.toHaveBeenCalled();
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "operator-1", schoolId: "school-a" }) }));
  });

  it("deletes school-scoped records in batches no larger than 250", async () => {
    const result = await DataRetentionService.executePolicies({ schoolId: "school-a", dryRun: false, operatorId: "operator-1" });

    expect(result[0]).toMatchObject({ matchedCount: 300, deletedCount: 300, status: "COMPLETED", dryRun: false });
    expect(prismaMock.visitorLog.findMany).toHaveBeenCalledTimes(2);
    for (const call of prismaMock.visitorLog.deleteMany.mock.calls) {
      expect(call[0].where.schoolId).toBe("school-a");
      expect(call[0].where.id.in.length).toBeLessThanOrEqual(250);
    }
  });

  it("does not execute unsupported entity policies", async () => {
    prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([{ ...policy, entityName: "User" }]);
    const result = await DataRetentionService.executePolicies({ schoolId: "school-a", dryRun: false, operatorId: "operator-1" });

    expect(result[0].status).toBe("FAILED");
    expect(prismaMock.visitorLog.deleteMany).not.toHaveBeenCalled();
  });
});
