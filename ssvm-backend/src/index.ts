import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import { getEnv } from "./config/env";
import logger from "./lib/logger";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler";

// Route imports
import authRoutes from "./routes/auth";
import noticeRoutes from "./routes/notices";
import eventRoutes from "./routes/events";
import studentRoutes from "./routes/students";
import feeRoutes from "./routes/fees";
import resultRoutes from "./routes/results";
import attendanceRoutes from "./routes/attendance";
import assignmentRoutes from "./routes/assignments";
import messageRoutes from "./routes/messages";
import facultyRoutes from "./routes/faculty";
import galleryRoutes from "./routes/gallery";
import alumniRoutes from "./routes/alumni";
import cmsRoutes from "./routes/cms";
import statsRoutes from "./routes/stats";
import paymentRoutes from "./routes/payments";

// ─── Validate environment on startup ───
const env = getEnv();

const app = express();

// ─── Security Middleware ───
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow uploaded image loading
}));

// Global rate limiter: 200 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests — please try again later" },
}));

// Stricter rate limiter for auth endpoints: 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts — please try again after 15 minutes" },
});

// ─── Standard Middleware ───
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── API Routes ───
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", cmsRoutes);

// ─── Health Check ───
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0", env: env.NODE_ENV });
});

// ─── Error Handling ───
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Start Server ───
app.listen(env.PORT, () => {
  logger.info(`🚀 SSVM Backend running on http://localhost:${env.PORT}`);
  logger.info(`📡 API: http://localhost:${env.PORT}/api`);
  logger.info(`🏥 Health: http://localhost:${env.PORT}/api/health`);
  logger.info(`🔒 Security: helmet ✓ | rate-limit ✓ | cors ✓`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

export default app;
