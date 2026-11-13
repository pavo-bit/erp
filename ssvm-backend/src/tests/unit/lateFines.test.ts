import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { applyLateFinesForSchool } from "../../jobs/lateFines";

describe("late fine assessment", () => {
  it("marks partial invoices overdue without overwriting their payment status", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const dueDate = new Date("2026-11-01T00:00:00Z");
    const update = vi.fn();
    const tx = {
      invoice: {
        updateMany,
        findMany: vi.fn().mockResolvedValue([{
          id: "invoice-a", schoolId: "school-a", status: "PARTIAL", dueDate,
          amount: new Prisma.Decimal("100"), amountPaid: new Prisma.Decimal("40"),
          remainingAmount: new Prisma.Decimal("60"), fineAmount: new Prisma.Decimal("0"),
        }]),
        update,
      },
      fineRule: { findFirst: vi.fn().mockResolvedValue({
        graceDays: 0, isPercentage: false, fineAmount: new Prisma.Decimal("10"), frequency: "ONCE",
      }) },
    } as any;
    const now = new Date("2026-11-05T00:00:00Z");

    await expect(applyLateFinesForSchool(tx, "school-a", now)).resolves.toEqual({ appliedCount: 1, noRule: false });
    expect(updateMany.mock.calls[0][0].data).toEqual({ isOverdue: true });
    expect(update.mock.calls[0][0].data.fineAmount.toString()).toBe("10");
    expect(update.mock.calls[0][0].data.remainingAmount.toString()).toBe("70");
    expect(update.mock.calls[0][0].data.isOverdue).toBe(true);
    expect(update.mock.calls[0][0].data).not.toHaveProperty("status");
  });
});
