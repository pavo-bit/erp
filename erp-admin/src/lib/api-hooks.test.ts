import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "./api-hooks";

describe("ApiError", () => {
  it("maps status", () => {
    const e = new ApiError("boom", 400);
    expect(e.status).toBe(400);
    expect(e.message).toBe("boom");
  });
});
