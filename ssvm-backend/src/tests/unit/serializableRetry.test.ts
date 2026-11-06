import { describe, expect, it, vi } from "vitest";
import { withSerializableRetry } from "../../lib/serializableRetry";

describe("serializable transaction retry", () => {
  it("retries SQLSTATE 40001 and succeeds on a later attempt", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: "40001" })
      .mockResolvedValue("committed");
    await expect(withSerializableRetry(operation)).resolves.toBe("committed");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("retries Prisma P2034 serialization conflicts", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: "P2034" })
      .mockResolvedValue("committed");
    await expect(withSerializableRetry(operation)).resolves.toBe("committed");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("allows at most three retries after the initial attempt", async () => {
    const operation = vi.fn().mockRejectedValue({ meta: { code: "40001" } });
    await expect(withSerializableRetry(operation)).rejects.toMatchObject({ meta: { code: "40001" } });
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it("does not retry a non-serialization failure", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("invalid input"));
    await expect(withSerializableRetry(operation)).rejects.toThrow("invalid input");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
