import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker } from "../../lib/circuitBreaker";
import { getRedisClient, isRedisAvailable } from "../../lib/redis";

vi.mock("../../lib/redis", () => ({
  getRedisClient: vi.fn(),
  isRedisAvailable: vi.fn(),
}));

describe("CircuitBreaker Utility", () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);
    vi.mocked(isRedisAvailable).mockReturnValue(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should execute function successfully when closed", async () => {
    const cb = new CircuitBreaker("sms_service");
    mockRedis.exists.mockResolvedValue(0); // Not OPEN

    const mockFn = vi.fn().mockResolvedValue("Success");
    const result = await cb.fire(mockFn);

    expect(result).toBe("Success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should fail-fast and throw CircuitBreakerOpenError when OPEN", async () => {
    const cb = new CircuitBreaker("sms_service");
    mockRedis.exists.mockResolvedValue(1); // Circuit is OPEN

    const mockFn = vi.fn().mockResolvedValue("Success");
    
    await expect(cb.fire(mockFn)).rejects.toThrow(/Circuit sms_service is OPEN/);
    expect(mockFn).not.toHaveBeenCalled(); // Fast fail without calling upstream
  });

  it("should increment failure count and open circuit on repeated failures", async () => {
    const cb = new CircuitBreaker("payment_service", { failureThreshold: 3, resetTimeoutMs: 60 });
    mockRedis.exists.mockResolvedValue(0); // Not open
    mockRedis.incr.mockResolvedValue(3); // 3rd failure

    const failingFn = vi.fn().mockRejectedValue(new Error("Upstream Error"));

    await expect(cb.fire(failingFn)).rejects.toThrow("Upstream Error");
    
    // Verify that circuit was tripped
    expect(mockRedis.set).toHaveBeenCalledWith("cb:open:payment_service", "OPEN", "EX", 60);
  });
});
