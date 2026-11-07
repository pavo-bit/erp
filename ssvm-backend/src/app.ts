import express from "express";
import type { NextFunction, Request, Response, Express } from "express";

// Bootstrap logic moved to index.ts










// Initialize Prometheus Metrics
export async function createApp(): Promise<Express> {
  const cors = (await import("cors")).default;
  const cookieParser = (await import("cookie-parser")).default;
  const helmet = (await import("helmet")).default;
  const path = (await import("path")).default;
  const Sentry = await import("@sentry/node");
  const { getEnv } = await import("./config/env");
  const client = (await import("prom-client")).default;
  const logger = (await import("./lib/logger")).default;
  const { notFoundHandler, globalErrorHandler } = await import("./middleware/errorHandler");
  const { addResponseHeaders } = await import("./lib/response");
  const { defaultLimiter, authLimiter, strictLimiter, uploadLimiter, bulkLimiter, webhookLimiter, paymentCreateLimiter, crmLimiter } = await import("./middleware/rateLimiter");
  const { bruteForceCheck } = await import("./middleware/brute-force.middleware");
  const { csrfProtection, injectCsrfToken } = await import("./middleware/csrf");
  const { schoolContextMiddleware } = await import("./middleware/school-context.middleware");
  const authRoutes = (await import("./routes/auth")).default;
  const schoolRoutes = (await import("./routes/schools")).default;
  const noticeRoutes = (await import("./routes/notices")).default;
  const eventRoutes = (await import("./routes/events")).default;
  const studentRoutes = (await import("./routes/students")).default;
  const teacherRoutes = (await import("./routes/teachers")).default;
  const invoiceRoutes = (await import("./routes/invoices")).default;
  const financeRoutes = (await import("./routes/finance")).default;
  const scholarshipRoutes = (await import("./routes/scholarships")).default;
  const reconciliationRoutes = (await import("./routes/finance-reconciliation")).default;
  const financeCashierRoutes = (await import("./routes/finance-cashier")).default;
  const attendanceRoutes = (await import("./routes/attendance")).default;
  const assignmentRoutes = (await import("./routes/assignments")).default;
  const galleryRoutes = (await import("./routes/gallery")).default;
  const alumniRoutes = (await import("./routes/alumni")).default;
  const cmsRoutes = (await import("./routes/cms")).default;
  const statsRoutes = (await import("./routes/stats")).default;
  const paymentRoutes = (await import("./routes/payments")).default;
  const timetableRoutes = (await import("./routes/timetable")).default;
  const examRoutes = (await import("./routes/exams")).default;
  const admissionRoutes = (await import("./routes/admissions")).default;
  const hrRoutes = (await import("./routes/hr")).default;
  const notificationRoutes = (await import("./routes/notifications")).default;
  const academicRoutes = (await import("./routes/academic")).default;
  const reportsRoutes = (await import("./routes/reports")).default;
  const communicationsRoutes = (await import("./routes/communications")).default;
  const branchesRoutes = (await import("./routes/branches")).default;
  const subscriptionsRoutes = (await import("./routes/subscriptions")).default;
  const searchRouter = (await import("./routes/search")).default;
  const bulkRouter = (await import("./routes/bulk")).default;
  const activityRouter = (await import("./routes/activity")).default;
  const userRoutes = (await import("./routes/users")).default;
  const sseRoutes = (await import("./routes/sse")).default;
  const libraryRoutes = (await import("./routes/library")).default;
  const twoFaRoutes = (await import("./routes/2fa")).default;
  const storageRoutes = (await import("./routes/storage")).default;
  const backupRoutes = (await import("./routes/backups")).default;
  const assetsRoutes = (await import("./routes/assets")).default;
  const mobileRoutes = (await import("./routes/mobile")).default;
  const transportRoutes = (await import("./routes/admin/transport")).default;
  const governanceRoutes = (await import("./routes/admin/governance")).default;
  const ancillaryRoutes = (await import("./routes/admin/ancillary")).default;
  const receptionRoutes = (await import("./routes/reception")).default;
  const healthRoutes = (await import("./routes/health")).default;
  const saasRoutes = (await import("./routes/saas")).default;
  const bullBoardRoutes = (await import("./routes/admin/bull-board")).default;
  const backupsRoutes = (await import("./routes/admin/backups")).default;
  const auditRoutes = (await import("./routes/admin/audit")).default;
  const sessionsRoutes = (await import("./routes/sessions")).default;
  const webhooksRoutes = (await import("./routes/webhooks")).default;
  const securityRoutes = (await import("./routes/security")).default;
  const messagesRoutes = (await import("./routes/messages")).default;
  const certificatesRoutes = (await import("./routes/certificates")).default;
  const guardiansRoutes = (await import("./routes/guardians")).default;
  const preferencesRoutes = (await import("./routes/preferences")).default;
  const documentsRoutes = (await import("./routes/documents")).default;
  const saasSettingsRoutes = (await import("./routes/admin/saasSettings")).default;
  const dataExportRoutes = (await import("./routes/admin/dataExport")).default;
  const saasSecurityRoutes = (await import("./routes/admin/security")).default;
  const accessGovernanceRoutes = (await import("./routes/admin/accessGovernance")).default;
  const procurementRoutes = (await import("./routes/admin/procurement")).default;
  const mdmRoutes = (await import("./routes/admin/mdm")).default;
  const v2Router = (await import("./routes/v2")).default;
  const disciplineRoutes = (await import("./routes/discipline")).default;
  const myProcurementRoutes = (await import("./routes/procurement")).default;
  const myInventoryRoutes = (await import("./routes/inventory")).default;
  const crmRoutes = (await import("./routes/crm")).default;
  const financeGovernanceRoutes = (await import("./routes/finance-governance")).default;
  const governanceWorkflowsRoutes = (await import("./routes/admin/governance-workflows")).default;
  const vendorsRoutes = (await import("./routes/admin/vendors")).default;
  const purchaseOrdersRoutes = (await import("./routes/admin/purchaseOrders")).default;
  const inventoryRoutes = (await import("./routes/admin/inventory")).default;
  const ledgerAccountsRoutes = (await import("./routes/admin/ledgerAccounts")).default;
  const ledgerTransactionsRoutes = (await import("./routes/admin/ledgerTransactions")).default;
  const billingRoutes = (await import("./routes/admin/billing")).default;
  const payrollRoutes = (await import("./routes/admin/payroll")).default;
  const resultsRoutes = (await import("./routes/results")).default;
  const shfiRoutes = (await import("./routes/admin/shfi")).default;
  const supportRoutes = (await import("./routes/support")).default;
  const { metricsMiddleware, getMetrics } = await import("./middleware/metrics");
  const swaggerUi = (await import("swagger-ui-express")).default;
  const { generateSpec } = await import("./openapi/generate");
  const { isRedisAvailable } = await import("./lib/redis");
  const prisma = (await import("./lib/prisma")).default;

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'ssvm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});













// Route imports




































































// Phase C: Procurement & Inventory



// Phase D: Accounting & Ledger


// Phase E: Billing






// ─── Validate environment on startup ───
const env = getEnv();

// ─── Initialize Express App ───
const app = express();

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



// PM2 / Load Balancer Healthcheck (Root Level)
app.get("/health", async (req, res) => {
  let dbStatus = "disconnected";
  let redisStatus = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    /* database offline */
  }

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
app.use(express.json({ limit: "10mb" }));
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

const legacyCompatMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
          type: "NOTICE",
          title: "Legacy Route Hit",
          description: `Deprecated route accessed: ${req.path}`,
          metadata: { path: req.path, method: req.method, timestamp: new Date().toISOString() }
        }
      });
    } catch {
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

const edgeCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
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
app.use("/api/v1/finance/cash", financeCashierRoutes);
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
app.use("/api/v1/shfi", shfiRoutes);
app.use("/api/v1/support", supportRoutes);

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

  return app;
}
