import logger from "./logger";
import { getRedisClient, isRedisAvailable } from "./redis";

export interface CircuitBreakerConfig {
  failureThreshold: number;   // Number of consecutive failures before opening circuit
  resetTimeoutMs: number;     // Time in ms before attempting to half-open
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
};

/**
 * Distributed Circuit Breaker using Redis for external API calls.
 * Protects the platform from hanging/cascading failures when external services
 * (like Razorpay, SMS gateways, AWS) go down.
 */
export class CircuitBreaker {
  private serviceName: string;
  private config: CircuitBreakerConfig;

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private get failureKey() { return `cb:failures:${this.serviceName}`; }
  private get openKey() { return `cb:open:${this.serviceName}`; }

  /**
   * Check if the circuit is currently open.
   * If open, throws an error immediately to fail fast.
   */
  async check(): Promise<void> {
    if (!isRedisAvailable()) return; // Fail-open if Redis is down

    const redis = getRedisClient();
    if (!redis) return;

    const isOpen = await redis.exists(this.openKey);
    if (isOpen) {
      throw new Error(`Circuit Breaker OPEN for service: ${this.serviceName}`);
    }
  }

  /**
   * Record a successful call. Resets the failure counter.
   */
  async recordSuccess(): Promise<void> {
    if (!isRedisAvailable()) return;
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.del(this.failureKey);
    } catch (err) {
      logger.warn({ err, service: this.serviceName }, "Failed to record CB success");
    }
  }

  /**
   * Record a failed call. If threshold is reached, opens the circuit.
   */
  async recordFailure(): Promise<void> {
    if (!isRedisAvailable()) return;
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const failures = await redis.incr(this.failureKey);
      
      // Set TTL on failure counter so it resets if sporadic
      if (failures === 1) {
        await redis.expire(this.failureKey, 300); // 5 minutes rolling window
      }

      if (failures >= this.config.failureThreshold) {
        logger.error({ service: this.serviceName, failures }, "Circuit Breaker TRIPPED (OPEN)");
        
        // Open the circuit
        await redis.set(this.openKey, "OPEN", "PX", this.config.resetTimeoutMs);
        
        // Reset failures so that when it half-opens, a new failure triggers it again
        await redis.del(this.failureKey);
      }
    } catch (err) {
      logger.warn({ err, service: this.serviceName }, "Failed to record CB failure");
    }
  }

  /**
   * Wrap an async function with the circuit breaker.
   */
  async fire<T>(action: () => Promise<T>): Promise<T> {
    await this.check();

    try {
      const result = await action();
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure();
      throw error;
    }
  }
}

// Pre-configured global instances
export const razorpayCircuitBreaker = new CircuitBreaker("razorpay");
export const smsCircuitBreaker = new CircuitBreaker("sms", { failureThreshold: 3, resetTimeoutMs: 30000 });
export const emailCircuitBreaker = new CircuitBreaker("email", { failureThreshold: 10, resetTimeoutMs: 60000 });
