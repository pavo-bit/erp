import client from "prom-client";
import { Request, Response, NextFunction } from "express";

// ═══════════════════════════════════════════
// Prometheus Metrics (GAP 20 — SLO/SLI)
// ═══════════════════════════════════════════
// Instrumentation for:
//   - HTTP request duration (SLI: latency)
//   - HTTP error rate (SLI: availability)
//   - Active connections
//   - Payment processing metrics
//   - Database query duration
//   - BullMQ job metrics

const register = new client.Registry();

register.setDefaultLabels({
  app: "ssvm-backend",
});

client.collectDefaultMetrics({ register });

// ─── HTTP Latency (SLI) ───
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});
register.registerMetric(httpRequestDurationMicroseconds);

// ─── HTTP Error Rate (SLI) ───
export const httpErrorsTotal = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors (4xx and 5xx)",
  labelNames: ["method", "route", "code"],
});
register.registerMetric(httpErrorsTotal);

// ─── Active Connections ───
export const activeConnectionsGauge = new client.Gauge({
  name: "http_active_connections",
  help: "Number of active HTTP connections",
});
register.registerMetric(activeConnectionsGauge);

// ─── Payment Processing ───
export const paymentProcessingDuration = new client.Histogram({
  name: "payment_processing_duration_ms",
  help: "Duration of payment processing in ms",
  labelNames: ["gateway", "status"],
  buckets: [100, 500, 1000, 2000, 5000, 10000],
});
register.registerMetric(paymentProcessingDuration);

export const paymentTotal = new client.Counter({
  name: "payment_total",
  help: "Total number of payments processed",
  labelNames: ["gateway", "status"],
});
register.registerMetric(paymentTotal);

// ─── Database Query Duration ───
export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_ms",
  help: "Duration of database queries in ms",
  labelNames: ["operation", "model"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});
register.registerMetric(dbQueryDuration);

// ─── BullMQ Job Metrics ───
export const jobProcessingDuration = new client.Histogram({
  name: "bullmq_job_duration_ms",
  help: "Duration of BullMQ job processing in ms",
  labelNames: ["queue", "name", "status"],
  buckets: [100, 500, 1000, 5000, 10000, 30000],
});
register.registerMetric(jobProcessingDuration);

export const jobQueueSize = new client.Gauge({
  name: "bullmq_queue_size",
  help: "Current number of jobs waiting in queue",
  labelNames: ["queue"],
});
register.registerMetric(jobQueueSize);

// ─── Auth Metrics ───
export const authAttemptsTotal = new client.Counter({
  name: "auth_attempts_total",
  help: "Total authentication attempts",
  labelNames: ["method", "result"],
});
register.registerMetric(authAttemptsTotal);

export const activeSessionsGauge = new client.Gauge({
  name: "active_sessions_total",
  help: "Number of active user sessions",
  labelNames: ["role"],
});
register.registerMetric(activeSessionsGauge);

// ─── Tenant Metrics ───
export const tenantRequestsTotal = new client.Counter({
  name: "tenant_requests_total",
  help: "Total requests per tenant",
  labelNames: ["school_id"],
});
register.registerMetric(tenantRequestsTotal);

// ═══════════════════════════════════════════
// Middleware
// ═══════════════════════════════════════════

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  activeConnectionsGauge.inc();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    const code = res.statusCode.toString();

    // Record request duration
    httpRequestDurationMicroseconds
      .labels(req.method, route, code)
      .observe(duration);

    // Track errors
    if (res.statusCode >= 400) {
      httpErrorsTotal.labels(req.method, route, code).inc();
    }

    // Track per-tenant requests
    const schoolId = (req as any).user?.schoolId;
    if (schoolId) {
      tenantRequestsTotal.labels(schoolId).inc();
    }

    activeConnectionsGauge.dec();
  });

  next();
};

export const getMetrics = async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
};

export { register };
