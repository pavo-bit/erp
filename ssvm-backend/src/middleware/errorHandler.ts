import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// Custom Application Error
// ═══════════════════════════════════════════

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ═══════════════════════════════════════════
// 404 Handler
// ═══════════════════════════════════════════

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: "Route not found" });
}

// ═══════════════════════════════════════════
// Prisma Error Code → HTTP Status Mapping
// ═══════════════════════════════════════════

interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

function mapPrismaError(err: PrismaError): { statusCode: number; message: string } {
  switch (err.code) {
    case "P2002": {
      // Unique constraint violation
      const target = (err.meta?.target as string[])?.join(", ") || "field";
      return { statusCode: 409, message: `Duplicate value for: ${target}` };
    }
    case "P2003":
      // Foreign key constraint violation
      return { statusCode: 400, message: "Referenced record does not exist" };
    case "P2025":
      // Record not found
      return { statusCode: 404, message: "Record not found" };
    case "P2014":
      // Required relation violation
      return { statusCode: 400, message: "Required relation constraint violated" };
    case "P2016":
      // Query interpretation error
      return { statusCode: 400, message: "Invalid query" };
    case "P2021":
      // Table does not exist
      return { statusCode: 500, message: "Database schema error" };
    case "P2024":
      // Connection pool timeout
      return { statusCode: 503, message: "Database temporarily unavailable — please retry" };
    default:
      return { statusCode: 500, message: "Database error" };
  }
}

// ═══════════════════════════════════════════
// Global Error Handler
// ═══════════════════════════════════════════

export function globalErrorHandler(
  err: Error | AppError | PrismaError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = "An unexpected error occurred";
  let isOperational = false;

  // AppError (thrown intentionally)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  // Prisma errors
  else if ("code" in err && typeof (err as PrismaError).code === "string" && (err as PrismaError).code!.startsWith("P")) {
    const mapped = mapPrismaError(err as PrismaError);
    statusCode = mapped.statusCode;
    message = mapped.message;
    isOperational = true;
  }
  // Zod validation errors
  else if (err.name === "ZodError") {
    statusCode = 422;
    message = "Validation failed";
    isOperational = true;
  }
  // JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    isOperational = true;
  }
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    isOperational = true;
  }
  // Multer errors (file upload)
  else if (err.name === "MulterError") {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
    isOperational = true;
  }
  // SyntaxError (malformed JSON body)
  else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON in request body";
    isOperational = true;
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error(
      { err, path: req.path, method: req.method, statusCode },
      "Unhandled server error"
    );
  } else {
    logger.warn(
      { error: err.message, path: req.path, method: req.method, statusCode },
      "Client error"
    );
  }

  res.status(statusCode).json({
    success: false,
    error: isOperational || process.env.NODE_ENV !== "production"
      ? message
      : "An unexpected error occurred",
    ...(process.env.NODE_ENV === "development" && statusCode >= 500 && { stack: err.stack }),
  });
}
