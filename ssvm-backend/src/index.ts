import "dotenv/config";
import "./lib/tracing"; // MUST be first import
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
import { defaultLimiter, authLimiter, strictLimiter, uploadLimiter, bulkLimiter, webhookLimiter } from "./middleware/rateLimiter";
import { csrfProtection } from "./middleware/csrf";
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

// Phase F: Payroll
import payrollRoutes from "./routes/admin/payroll";

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

import { isRedisAvailable } from "./lib/redis";
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
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply CSRF Protection (state-changing methods are validated, safe ones ignored)
app.use(csrfProtection);

// Add X-Request-ID and X-API-Version to every response
app.use(addResponseHeaders());

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ═══════════════════════════════════════════
// Route Mounting Helper (dual prefix: /api/v1 + /api)
// ═══════════════════════════════════════════

function mountRoute(routePath: string, router: express.Router, ...middleware: express.RequestHandler[]): void {
  // Primary versioned path
  app.use(`/api/v1${routePath}`, ...middleware, router);
  // Backward-compat unversioned path with deprecation header
  app.use(`/api${routePath}`, deprecated, ...middleware, router);
}

// ═══════════════════════════════════════════
// 10. EDGE CACHING STRATEGY (PHASE 7)
// ═══════════════════════════════════════════

const edgeCacheMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only cache GET requests
  if (req.method === 'GET') {
    // Determine if it's a static resource vs dynamic API
    // This allows Cloudflare/CloudFront to cache effectively at edge nodes
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  }
  next();
};

app.use(edgeCacheMiddleware);

// ═══════════════════════════════════════════
// 11. API ROUTE MOUNTING
// ═══════════════════════════════════════════

// Auth (with stricter rate limits)
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/auth", deprecated, authLimiter, authRoutes);

// Apply refresh limiter to the refresh endpoint specifically
app.use("/api/v1/auth/refresh", authLimiter);
app.use("/api/auth/refresh", deprecated, authLimiter);

// All other routes (versioned + unversioned)
mountRoute("/schools", schoolRoutes);
mountRoute("/notices", noticeRoutes);
mountRoute("/events", eventRoutes);
mountRoute("/students", studentRoutes, strictLimiter);
mountRoute("/teachers", teacherRoutes, strictLimiter);
mountRoute("/invoices", invoiceRoutes);
mountRoute("/finance", financeRoutes);
mountRoute("/attendance", attendanceRoutes);
mountRoute("/gallery", galleryRoutes, uploadLimiter);
mountRoute("/users", userRoutes);
mountRoute("/alumni", alumniRoutes);
mountRoute("/stats", statsRoutes);
mountRoute("/payments", paymentRoutes);
mountRoute("/timetable", timetableRoutes);
mountRoute("/exams", examRoutes, strictLimiter);
mountRoute("/admissions", admissionRoutes);
mountRoute("/hr", hrRoutes);
mountRoute("/notifications", notificationRoutes);
mountRoute("/academic", academicRoutes);
mountRoute("/reports", reportsRoutes);
mountRoute("/communications", communicationsRoutes);
mountRoute("/branches", branchesRoutes);
mountRoute("/subscriptions", subscriptionsRoutes);
mountRoute("/assignments", assignmentRoutes, uploadLimiter);
mountRoute("/search", searchRouter);
mountRoute("/bulk", bulkRouter, bulkLimiter);
mountRoute("/activity", activityRouter);
mountRoute("/library", libraryRoutes);
mountRoute("/2fa", twoFaRoutes);
mountRoute("/storage", storageRoutes);
mountRoute("/assets", assetsRoutes);
mountRoute("/reception", receptionRoutes);
mountRoute("/messages", messagesRoutes);
mountRoute("/mobile", mobileRoutes);
mountRoute("/transport", transportRoutes);
mountRoute("/governance", governanceRoutes);
mountRoute("/ancillary", ancillaryRoutes);
mountRoute("/certificates", certificatesRoutes);
mountRoute("/guardians", guardiansRoutes);
mountRoute("/documents", documentsRoutes, uploadLimiter);
mountRoute("/saas", saasRoutes);
mountRoute("/webhooks", webhooksRoutes, webhookLimiter);
mountRoute("/security", securityRoutes);
mountRoute("/sessions", sessionsRoutes);
mountRoute("/discipline", disciplineRoutes);
mountRoute("/procurement-ops", myProcurementRoutes);
mountRoute("/inventory", myInventoryRoutes);
mountRoute("/crm", crmRoutes);
mountRoute("/finance/governance", financeGovernanceRoutes);

// CMS routes (mounted at /api root level)
app.use("/api/v1", cmsRoutes);
app.use("/api", deprecated, cmsRoutes);

// SSE Push Notifications
app.use("/api/v1/sse", sseRoutes);
app.use("/api/sse", deprecated, sseRoutes);

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
mountRoute("/admin/queues", bullBoardRoutes);
mountRoute("/admin/backups", backupsRoutes);
mountRoute("/admin/audit", auditRoutes);
mountRoute("/admin/procurement", procurementRoutes);
mountRoute("/admin/saas-settings", saasSettingsRoutes);
mountRoute("/admin/governance-workflows", governanceWorkflowsRoutes);
mountRoute("/admin/vendors", vendorsRoutes);
mountRoute("/admin/purchase-orders", purchaseOrdersRoutes);
mountRoute("/admin/inventory", inventoryRoutes);
mountRoute("/admin/ledger/accounts", ledgerAccountsRoutes);
mountRoute("/admin/ledger/transactions", ledgerTransactionsRoutes);
mountRoute("/admin/billing", billingRoutes);
mountRoute("/admin/payroll", payrollRoutes);
mountRoute("/backups", backupRoutes);

// ═══════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════

Sentry.setupExpressErrorHandler(app);

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ═══════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════

const server = app.listen(parseInt(env.PORT, 10), "0.0.0.0", () => {
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
