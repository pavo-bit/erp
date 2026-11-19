import client from "prom-client";
import { Request, Response, NextFunction } from "express";

// ═══════════════════════════════════════════
// Prometheus Metrics (SSVM ERP Unified Vocabulary)
// ═══════════════════════════════════════════
// Canonical Prefix: "ssvm_" across all default and custom metrics

const register = new client.Registry();

register.setDefaultLabels({
  app: "ssvm-backend",
});

// Default process & runtime metrics with canonical ssvm_ prefix
client.collectDefaultMetrics({ register, prefix: "ssvm_" });

// ─── HTTP Latency & Throughput (SLI) ───
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: "ssvm_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpRequestDurationMicroseconds);

// ─── HTTP Error Rate (SLI) ───
export const httpErrorsTotal = new client.Counter({
  name: "ssvm_http_errors_total",
  help: "Total number of HTTP errors (4xx and 5xx)",
  labelNames: ["method", "route", "code"],
});
register.registerMetric(httpErrorsTotal);

// ─── JWT Verification (SLI) ───
export const jwtVerificationTotal = new client.Counter({
  name: "ssvm_jwt_verification_total",
  help: "Total number of successful JWT verifications by algorithm",
  labelNames: ["algorithm"],
});
register.registerMetric(jwtVerificationTotal);

// ─── Public Form Submissions (GAP A5) ───
export const publicFormSubmissionsTotal = new client.Counter({
  name: "ssvm_public_form_submissions_total",
  help: "Total number of public form submissions with spam/captcha status",
  labelNames: ["endpoint", "status"],
});
register.registerMetric(publicFormSubmissionsTotal);

// ─── Active Connections ───
export const activeConnectionsGauge = new client.Gauge({
  name: "ssvm_http_active_connections",
  help: "Number of active HTTP connections",
});
register.registerMetric(activeConnectionsGauge);

// ─── Payment Processing ───
export const paymentProcessingDuration = new client.Histogram({
  name: "ssvm_payment_processing_duration_seconds",
  help: "Duration of payment processing in seconds",
  labelNames: ["gateway", "status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(paymentProcessingDuration);

export const paymentTotal = new client.Counter({
  name: "ssvm_payment_total",
  help: "Total number of payments processed",
  labelNames: ["gateway", "status"],
});
register.registerMetric(paymentTotal);

export const paymentRefundsTotal = new client.Counter({
  name: "ssvm_payment_refunds_total",
  help: "Total number of payment refunds processed",
  labelNames: ["gateway", "status"],
});
register.registerMetric(paymentRefundsTotal);

// ─── Webhook Processing (GAP A14) ───
export const webhookProcessingTotal = new client.Counter({
  name: "ssvm_webhook_processing_total",
  help: "Total number of webhooks processed",
  labelNames: ["gateway", "status", "event"],
});
register.registerMetric(webhookProcessingTotal);

// ─── Database Query Duration ───
export const dbQueryDuration = new client.Histogram({
  name: "ssvm_db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "model"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});
register.registerMetric(dbQueryDuration);

// ─── BullMQ Job Metrics ───
export const jobProcessingDuration = new client.Histogram({
  name: "ssvm_bullmq_job_duration_seconds",
  help: "Duration of BullMQ job processing in seconds",
  labelNames: ["queue", "name", "status"],
  buckets: [0.1, 0.5, 1, 5, 10, 30],
});
register.registerMetric(jobProcessingDuration);

export const jobQueueSize = new client.Gauge({
  name: "ssvm_bullmq_queue_size",
  help: "Current number of jobs waiting in queue",
  labelNames: ["queue"],
});
register.registerMetric(jobQueueSize);

// ─── Auth Metrics ───
export const authAttemptsTotal = new client.Counter({
  name: "ssvm_auth_attempts_total",
  help: "Total authentication attempts",
  labelNames: ["method", "result"],
});
register.registerMetric(authAttemptsTotal);

export const activeSessionsGauge = new client.Gauge({
  name: "ssvm_active_sessions_total",
  help: "Number of active user sessions",
  labelNames: ["role"],
});
register.registerMetric(activeSessionsGauge);

// ─── Tenant Metrics ───
export const tenantRequestsTotal = new client.Counter({
  name: "ssvm_tenant_requests_total",
  help: "Total requests per tenant",
  labelNames: ["schoolId"],
});
register.registerMetric(tenantRequestsTotal);

// ═══════════════════════════════════════════
// Block M3 Security Metrics (Strict No-PII Labels)
// ═══════════════════════════════════════════

export const authFailuresTotal = new client.Counter({
  name: "ssvm_auth_failures_total",
  help: "Total authentication failures by reason",
  labelNames: ["reason"],
});
register.registerMetric(authFailuresTotal);

export const accountLockoutsTotal = new client.Counter({
  name: "ssvm_account_lockouts_total",
  help: "Total number of account lockouts triggered",
});
register.registerMetric(accountLockoutsTotal);

export const wrongPortalDenialsTotal = new client.Counter({
  name: "ssvm_wrong_portal_denials_total",
  help: "Total number of wrong-portal access denials",
});
register.registerMetric(wrongPortalDenialsTotal);

export const csrfFailuresTotal = new client.Counter({
  name: "ssvm_csrf_failures_total",
  help: "Total number of CSRF verification failures",
});
register.registerMetric(csrfFailuresTotal);

export const rateLimitHitsTotal = new client.Counter({
  name: "ssvm_rate_limit_hits_total",
  help: "Total number of rate limiter hits",
  labelNames: ["limiter"],
});
register.registerMetric(rateLimitHitsTotal);

export const webhookSignatureFailuresTotal = new client.Counter({
  name: "ssvm_webhook_signature_failures_total",
  help: "Total number of webhook signature verification failures",
});
register.registerMetric(webhookSignatureFailuresTotal);

export const rlsContextMissingTotal = new client.Counter({
  name: "ssvm_rls_context_missing_total",
  help: "Total database operations attempted without tenant RLS context",
});
register.registerMetric(rlsContextMissingTotal);

export const supportSessionsActive = new client.Gauge({
  name: "ssvm_support_sessions_active",
  help: "Number of currently active platform support sessions",
});
register.registerMetric(supportSessionsActive);

export const auditEventsTotal = new client.Counter({
  name: "ssvm_audit_events_total",
  help: "Total number of audit events recorded",
  labelNames: ["action"],
});
register.registerMetric(auditEventsTotal);

// ─── Financial Operations & Outbox Metrics (M5) ───
export const reconciliationGapsTotal = new client.Counter({
  name: "ssvm_reconciliation_gaps_total",
  help: "Total detected financial reconciliation gaps",
});
register.registerMetric(reconciliationGapsTotal);

export const outboxEventsTotal = new client.Counter({
  name: "ssvm_outbox_events_total",
  help: "Total transactional outbox events processed",
  labelNames: ["status"],
});
register.registerMetric(outboxEventsTotal);

export const outboxDeadLettersTotal = new client.Counter({
  name: "ssvm_outbox_dead_letters_total",
  help: "Total outbox events moved to dead-letter queue",
});
register.registerMetric(outboxDeadLettersTotal);

// ═══════════════════════════════════════════
// Middleware
// ═══════════════════════════════════════════

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  activeConnectionsGauge.inc();

  res.on("finish", () => {
    const durationSeconds = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const code = res.statusCode.toString();

    // Record request duration in seconds
    httpRequestDurationMicroseconds
      .labels(req.method, route, code)
      .observe(durationSeconds);

    // Track errors
    if (res.statusCode >= 400) {
      httpErrorsTotal.labels(req.method, route, code).inc();
    }

    // Track per-tenant requests (bounded cardinality)
    const schoolId = (req as { user?: { schoolId?: string } }).user?.schoolId;
    if (schoolId) {
      tenantRequestsTotal.labels(schoolId).inc();
    }

    activeConnectionsGauge.dec();
  });

  next();
};

export function isLoopbackAddress(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = ip.replace(/^::ffff:/, "").trim();
  return cleanIp === "127.0.0.1" || ip === "::1" || cleanIp === "::1" || cleanIp === "localhost";
}

/**
 * @deprecated For metrics security, only loopback addresses are allowed outside production.
 * Private ranges (10.x, 172.16-31.x, 192.168.x) are never granted unauthenticated access.
 */
export function isInternalNetwork(ip: string): boolean {
  return isLoopbackAddress(ip);
}

export const getMetrics = async (req: Request, res: Response): Promise<void> => {
  const isProduction = process.env.NODE_ENV === "production";
  const metricsToken = process.env.METRICS_TOKEN;
  const authHeader = req.headers.authorization;

  // Authorized if valid bearer token matches METRICS_TOKEN
  if (metricsToken && authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme === "Bearer" && token === metricsToken) {
      res.setHeader("Content-Type", register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
      return;
    }
    res.status(401).json({
      type: "https://ssvm.in/errors/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Invalid metrics authorization credentials",
    });
    return;
  }

  // In production, bearer token is strictly required. No network position bypass allowed.
  if (isProduction) {
    res.status(401).json({
      type: "https://ssvm.in/errors/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Bearer token required for /metrics in production",
    });
    return;
  }

  // Outside production: network position allow rule for loopback only (never private IP ranges).
  // Strictly reject if request has x-forwarded-for header (could be spoofed or forwarded).
  const directSocketIp = req.socket.remoteAddress || "";
  const hasForwardedHeader = Boolean(req.headers["x-forwarded-for"]);

  if (isLoopbackAddress(directSocketIp) && !hasForwardedHeader) {
    res.setHeader("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
    return;
  }

  // If authHeader was present but token did not match or METRICS_TOKEN was missing
  if (authHeader) {
    res.status(401).json({
      type: "https://ssvm.in/errors/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Invalid metrics authorization credentials",
    });
    return;
  }

  res.status(403).json({
    type: "https://ssvm.in/errors/forbidden",
    title: "Forbidden",
    status: 403,
    detail: "Public access to /metrics is restricted",
  });
};

export { register };
