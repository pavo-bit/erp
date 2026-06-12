import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";

import { getEnv } from "./config/env";
import { initSentry } from "./lib/sentry";
import * as Sentry from "@sentry/node";

initSentry();

import logger from "./lib/logger";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler";
import { deprecated } from "./middleware/versioning";
import { addResponseHeaders } from "./lib/response";
import { globalLimiter, authLimiter, refreshLimiter } from "./middleware/rateLimiter";
import { startTokenCleanupScheduler, stopTokenCleanupScheduler } from "./jobs/cleanupTokens";
import { startWorkers } from "./jobs/worker";
import { closeQueues } from "./jobs/queue";

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

// ─── Validate environment on startup ───
const env = getEnv();

// ─── Initialize Express App ───
export const app = express();

// ═══════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Global rate limiter: 500 req/min per IP
app.use(globalLimiter);

// ═══════════════════════════════════════════
// Standard Middleware
// ═══════════════════════════════════════════

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
// API Routes
// ═══════════════════════════════════════════

// Auth (with stricter rate limits)
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/auth", deprecated, authLimiter, authRoutes);

// Apply refresh limiter to the refresh endpoint specifically
app.use("/api/v1/auth/refresh", refreshLimiter);
app.use("/api/auth/refresh", deprecated, refreshLimiter);

// All other routes (versioned + unversioned)
mountRoute("/schools", schoolRoutes);
mountRoute("/notices", noticeRoutes);
mountRoute("/events", eventRoutes);
mountRoute("/students", studentRoutes);
mountRoute("/teachers", teacherRoutes);
mountRoute("/invoices", invoiceRoutes);
mountRoute("/finance", financeRoutes);
mountRoute("/attendance", attendanceRoutes);
mountRoute("/gallery", galleryRoutes);
mountRoute("/users", userRoutes);
mountRoute("/alumni", alumniRoutes);
mountRoute("/stats", statsRoutes);
mountRoute("/payments", paymentRoutes);
mountRoute("/timetable", timetableRoutes);
mountRoute("/exams", examRoutes);
mountRoute("/admissions", admissionRoutes);
mountRoute("/hr", hrRoutes);
mountRoute("/notifications", notificationRoutes);
mountRoute("/academic", academicRoutes);
mountRoute("/reports", reportsRoutes);
mountRoute("/communications", communicationsRoutes);
mountRoute("/branches", branchesRoutes);
mountRoute("/subscriptions", subscriptionsRoutes);
mountRoute("/assignments", assignmentRoutes);
mountRoute("/search", searchRouter);
mountRoute("/bulk", bulkRouter);
mountRoute("/activity", activityRouter);
mountRoute("/library", libraryRoutes);
mountRoute("/2fa", twoFaRoutes);
mountRoute("/storage", storageRoutes);
mountRoute("/backups", backupRoutes);

// CMS routes (mounted at /api root level)
app.use("/api/v1", cmsRoutes);
app.use("/api", deprecated, cmsRoutes);

// SSE Push Notifications
app.use("/api/v1/sse", sseRoutes);
app.use("/api/sse", deprecated, sseRoutes);

// ═══════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "3.0.0",
    apiVersion: "v1",
    env: env.NODE_ENV,
  });
});
app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "3.0.0",
    apiVersion: "v1",
    env: env.NODE_ENV,
  });
});

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
