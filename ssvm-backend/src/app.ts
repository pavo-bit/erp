// Bootstrap logic moved to index.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

import { getEnv } from "./config/env";
import { initSentry } from "./lib/sentry";
import client from "prom-client";

// Initialize Prometheus Metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'ssvm_' });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'ssvm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

initSentry();

import logger from "./lib/logger";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler";
import { deprecated } from "./middleware/versioning";
import { addResponseHeaders } from "./lib/response";
import { defaultLimiter, authLimiter, strictLimiter, uploadLimiter, bulkLimiter, webhookLimiter, paymentCreateLimiter, paymentVerifyLimiter, crmLimiter, otpLimiter, passwordResetLimiter } from "./middleware/rateLimiter";
import { bruteForceCheck } from "./middleware/brute-force.middleware";
import { csrfProtection, injectCsrfToken } from "./middleware/csrf";
import { schoolContextMiddleware } from "./middleware/school-context.middleware";
import { startTokenCleanupScheduler, stopTokenCleanupScheduler } from "./jobs/cleanupTokens";
import { startWorkers } from "./jobs/worker";
import { closeQueues } from "./jobs/queue";
import { BackupService } from "./services/backup.service";

// Route imports
import authRoutes from "./routes/auth";
import schoolRoutes from "./routes/schools";
import noticeRoutes from "./routes/notices";
import eventRoutes from "./routes/events";
import studentRoutes from "./routes/students";
import teacherRoutes from "./routes/teachers";
import invoiceRoutes from "./routes/invoices";
import financeRoutes from "./routes/finance";
import scholarshipRoutes from "./routes/scholarships";
import reconciliationRoutes from "./routes/finance-reconciliation";
import attendanceRoutes from "./routes/attendance";
import assignmentRoutes from "./routes/assignments";
import galleryRoutes from "./routes/gallery";
import alumniRoutes from "./routes/alumni";
import cmsRoutes from "./routes/cms";
import statsRoutes from "./routes/stats";
import paymentRoutes from "./routes/payments";
import timetableRoutes from "./routes/timetable";
import examRoutes from "./routes/exams";
import admissionRoutes from "./routes/admissions";
import hrRoutes from "./routes/hr";
import notificationRoutes from "./routes/notifications";
import academicRoutes from "./routes/academic";
import reportsRoutes from "./routes/reports";
import communicationsRoutes from "./routes/communications";
import branchesRoutes from "./routes/branches";
import subscriptionsRoutes from "./routes/subscriptions";
import searchRouter from "./routes/search";
import bulkRouter from "./routes/bulk";
import activityRouter from "./routes/activity";
import userRoutes from "./routes/users";
import sseRoutes from "./routes/sse";
import libraryRoutes from "./routes/library";
import twoFaRoutes from "./routes/2fa";
import storageRoutes from "./routes/storage";
import backupRoutes from "./routes/backups";
import assetsRoutes from "./routes/assets";
import mobileRoutes from "./routes/mobile";
import transportRoutes from "./routes/admin/transport";
import governanceRoutes from "./routes/admin/governance";
import ancillaryRoutes from "./routes/admin/ancillary";
import receptionRoutes from "./routes/reception";
import healthRoutes from "./routes/health";
import saasRoutes from "./routes/saas";
import bullBoardRoutes from "./routes/admin/bull-board";
import backupsRoutes from "./routes/admin/backups";
import auditRoutes from "./routes/admin/audit";
import sessionsRoutes from "./routes/sessions";
import webhooksRoutes from "./routes/webhooks";
import securityRoutes from "./routes/security";
import messagesRoutes from "./routes/messages";
import certificatesRoutes from "./routes/certificates";
import guardiansRoutes from "./routes/guardians";
import preferencesRoutes from "./routes/preferences";
import documentsRoutes from "./routes/documents";
import saasSettingsRoutes from "./routes/admin/saasSettings";
import dataExportRoutes from "./routes/admin/dataExport";
import saasSecurityRoutes from "./routes/admin/security";
import accessGovernanceRoutes from "./routes/admin/accessGovernance";
import procurementRoutes from "./routes/admin/procurement";
import mdmRoutes from "./routes/admin/mdm";
import v2Router from "./routes/v2";
import disciplineRoutes from "./routes/discipline";
import myProcurementRoutes from "./routes/procurement";
import myInventoryRoutes from "./routes/inventory";
import crmRoutes from "./routes/crm";
import financeGovernanceRoutes from "./routes/finance-governance";
import governanceWorkflowsRoutes from "./routes/admin/governance-workflows";

// Phase C: Procurement & Inventory
import vendorsRoutes from "./routes/admin/vendors";
import purchaseOrdersRoutes from "./routes/admin/purchaseOrders";
import inventoryRoutes from "./routes/admin/inventory";

// Phase D: Accounting & Ledger
import ledgerAccountsRoutes from "./routes/admin/ledgerAccounts";
import ledgerTransactionsRoutes from "./routes/admin/ledgerTransactions";

// Phase E: Billing
import billingRoutes from "./routes/admin/billing";
import payrollRoutes from "./routes/admin/payroll";
import resultsRoutes from "./routes/results";

import { metricsMiddleware, getMetrics } from "./middleware/metrics";
import swaggerUi from "swagger-ui-express";
import { generateSpec } from "./openapi/generate";

// ─── Validate environment on startup ───
const env = getEnv();

// ─── Initialize Sentry ───
Sentry.init({
  dsn: env.SENTRY_DSN || "",
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// ─── Initialize Express App ───
export const app = express();

// ═══════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════

// Prometheus Metrics Middleware
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
  });
  next();
});

// Expose Metrics Endpoint for Prometheus Scraper
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameAncestors: ["'none'"],
      reportUri: "/api/v1/csp-report",
    },
  },
}));

import { isRedisAvailable, initRedis } from "./lib/redis";
import prisma from "./lib/prisma";

// PM2 / Load Balancer Healthcheck (Root Level)
app.get("/health", async (req, res) => {
  let dbStatus = "disconnected";
  let redisStatus = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (e) { }

  if (isRedisAvailable()) {
    redisStatus = "connected";
  }

  const isHealthy = dbStatus === "connected" && redisStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "error",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
    memory: process.memoryUsage(),
    db: dbStatus,
    redis: redisStatus
  });
});

// CSRF moved after cookie-parser

// Global default rate limiter: 100 req/min per IP
app.use(defaultLimiter);

// ═══════════════════════════════════════════
// Standard Middleware
// ═══════════════════════════════════════════

// The request handler must be the first middleware on the app
Sentry.setupExpressErrorHandler(app);

app.use(metricsMiddleware);

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  exposedHeaders: ["X-CSRF-Token"],
}));
app.use(express.json({
  limit: "10mb",
  verify: (req, _res, body) => {
    (req as express.Request).rawBody = Buffer.from(body);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply CSRF Protection (state-changing methods are validated, safe ones ignored)
app.use(csrfProtection);
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return injectCsrfToken(req, res, next);
  next();
});

// Add X-Request-ID and X-API-Version to every response
app.use(addResponseHeaders());

// GAP 3: School context propagation (AsyncLocalStorage → RLS)
app.use(schoolContextMiddleware);

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// Public media may be served from the upload root, but private documents are only
// available through the authenticated document download route.
app.use("/uploads/documents", (_req, res) => res.status(404).end());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ═══════════════════════════════════════════
// Legacy API Compatibility & Rewrite
// ═══════════════════════════════════════════

const legacyCompatMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith("/api/") && !req.path.startsWith("/api/v1/") && !req.path.startsWith("/api/v2/")) {
    const v1Path = req.url.replace(/^\/api\//, "/api/v1/");

    res.setHeader("Deprecation", "true");
    const sunsetDate = new Date();
    sunsetDate.setDate(sunsetDate.getDate() + 90);
    res.setHeader("Sunset", sunsetDate.toUTCString());
    res.setHeader("Link", `<${req.protocol}://${req.get("host")}${v1Path}>; rel="successor-version"`);

    try {
      const schoolId = (req.headers["x-school-id"] as string) || "UNKNOWN_TENANT";
      await prisma.activityLog.create({
        data: {
          schoolId,
          type: "LEGACY_API_ACCESS" as any,
          title: "Legacy Route Hit",
          description: `Deprecated route accessed: ${req.path}`,
          metadata: { path: req.path, method: req.method, timestamp: new Date().toISOString() }
        }
      });
    } catch (e) {
      // Fallback if schoolId constraint fails
    }

    req.url = req.url.replace(/^\/api\//, "/api/v1/");
  }
  next();
};

app.use(legacyCompatMiddleware);

// ═══════════════════════════════════════════
// 10. EDGE CACHING STRATEGY (PHASE 7)
// ═══════════════════════════════════════════

const edgeCacheMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only cache GET requests that are NOT API endpoints
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  }
  next();
};

app.use(edgeCacheMiddleware);

// ═══════════════════════════════════════════
// 11. API ROUTE MOUNTING
// ═══════════════════════════════════════════

// Auth (with stricter rate limits + brute force protection)
app.use("/api/v1/auth", authLimiter, bruteForceCheck(), authRoutes);

// All other routes
app.use("/api/v1/schools", schoolRoutes);
app.use("/api/v1/notices", noticeRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/students", strictLimiter, studentRoutes);
app.use("/api/v1/teachers", strictLimiter, teacherRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/finance", financeRoutes);
app.use("/api/v1/finance/scholarships", scholarshipRoutes);
app.use("/api/v1/finance/reconciliation", reconciliationRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/gallery", uploadLimiter, galleryRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/alumni", alumniRoutes);
app.use("/api/v1/stats", statsRoutes);
app.use("/api/v1/payments", paymentCreateLimiter, paymentRoutes);
app.use("/api/v1/crm", crmLimiter, crmRoutes);
app.use("/api/v1/timetable", timetableRoutes);
app.use("/api/v1/exams", strictLimiter, examRoutes);
app.use("/api/v1/results", strictLimiter, resultsRoutes);
app.use("/api/v1/admissions", admissionRoutes);
app.use("/api/v1/hr", hrRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/academic", academicRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/communications", communicationsRoutes);
app.use("/api/v1/branches", branchesRoutes);
app.use("/api/v1/subscriptions", subscriptionsRoutes);
app.use("/api/v1/assignments", uploadLimiter, assignmentRoutes);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/bulk", bulkLimiter, bulkRouter);
app.use("/api/v1/activity", activityRouter);
app.use("/api/v1/library", libraryRoutes);
app.use("/api/v1/2fa", twoFaRoutes);
app.use("/api/v1/storage", storageRoutes);
app.use("/api/v1/assets", assetsRoutes);
app.use("/api/v1/reception", receptionRoutes);
app.use("/api/v1/messages", messagesRoutes);
app.use("/api/v1/mobile", mobileRoutes);
app.use("/api/v1/transport", transportRoutes);
app.use("/api/v1/governance", governanceRoutes);
app.use("/api/v1/ancillary", ancillaryRoutes);
app.use("/api/v1/certificates", certificatesRoutes);
app.use("/api/v1/guardians", guardiansRoutes);
app.use("/api/v1/documents", uploadLimiter, documentsRoutes);
app.use("/api/v1/saas", saasRoutes);
app.use("/api/v1/webhooks", webhookLimiter, webhooksRoutes);
app.use("/api/v1/security", securityRoutes);
app.use("/api/v1/sessions", sessionsRoutes);
app.use("/api/v1/discipline", disciplineRoutes);
app.use("/api/v1/procurement-ops", myProcurementRoutes);
app.use("/api/v1/inventory", myInventoryRoutes);
app.use("/api/v1/finance/governance", financeGovernanceRoutes);

// CMS routes
app.use("/api/v1", cmsRoutes);

// SSE Push Notifications
app.use("/api/v1/sse", sseRoutes);

// ═══════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════

app.use("/api/health", healthRoutes);
app.use("/api/v1/health", healthRoutes);

app.use('/api/v1/certificates', certificatesRoutes);
app.use('/api/v1/preferences', preferencesRoutes);

// SaaS specific admin routes
app.use('/api/v1/saas/settings', saasSettingsRoutes);
app.use('/api/v1/saas/security', saasSecurityRoutes);
app.use('/api/v1/saas/governance', accessGovernanceRoutes);
app.use('/api/v1/saas/export', dataExportRoutes);
app.use('/api/v1/saas/mdm', mdmRoutes);

// ═══════════════════════════════════════════
// Enterprise V2 API Namespace (Strict Versioning)
// ═══════════════════════════════════════════
app.use("/api/v2", v2Router);

// OpenAPI Documentation
if (process.env.NODE_ENV !== "production") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(generateSpec()));
}
app.get("/api/docs/spec.json", (req, res) => {
  res.json(generateSpec());
});

// Prometheus Metrics Endpoint
app.get("/metrics", getMetrics);

// Admin Routes
app.use("/api/v1/admin/queues", bullBoardRoutes);
app.use("/api/v1/admin/backups", backupsRoutes);
app.use("/api/v1/admin/audit", auditRoutes);
app.use("/api/v1/admin/procurement", procurementRoutes);
app.use("/api/v1/admin/saas-settings", saasSettingsRoutes);
app.use("/api/v1/admin/governance-workflows", governanceWorkflowsRoutes);
app.use("/api/v1/admin/vendors", vendorsRoutes);
app.use("/api/v1/admin/purchase-orders", purchaseOrdersRoutes);
app.use("/api/v1/admin/inventory", inventoryRoutes);
app.use("/api/v1/admin/ledger/accounts", ledgerAccountsRoutes);
app.use("/api/v1/admin/ledger/transactions", ledgerTransactionsRoutes);
app.use("/api/v1/admin/billing", billingRoutes);
app.use("/api/v1/admin/payroll", payrollRoutes);
app.use("/api/v1/backups", backupRoutes);

// ═══════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════

Sentry.setupExpressErrorHandler(app);

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ═══════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════

const server = app.listen(parseInt(env.PORT, 10), "0.0.0.0", async () => {
  await initRedis();

  logger.info(`🚀 SSVM ERP Backend running on http://localhost:${env.PORT}`);
  logger.info(`📡 API v1: http://localhost:${env.PORT}/api/v1`);
  logger.info(`📡 API (compat): http://localhost:${env.PORT}/api`);
  logger.info(`🏥 Health: http://localhost:${env.PORT}/api/health`);
  logger.info(`🔒 Security: helmet ✓ | rate-limit ✓ | cors ✓ | refresh-tokens ✓`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);

  // Start background jobs
  if (env.NODE_ENV !== "test") {
    startTokenCleanupScheduler();
    startWorkers();

    // Daily Database Backup Scheduler (Runs every 24 hours)
    const DAILY_MS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      logger.info("[Scheduler] Triggering daily database backup");
      BackupService.createDatabaseBackup(true).catch(err => {
        logger.error(`[Scheduler] Daily backup failed: ${err.message}`);
      });
    }, DAILY_MS);
  }
});

// ═══════════════════════════════════════════
// Graceful Shutdown
// ═══════════════════════════════════════════

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  stopTokenCleanupScheduler();
  await closeQueues();
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
  // Force close after 10s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
