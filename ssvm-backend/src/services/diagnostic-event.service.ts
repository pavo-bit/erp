/**
 * ssvm-backend/src/services/diagnostic-event.service.ts
 * Diagnostic Event Ingestion & Sensitive-Data Sanitization Pipeline for SHFI
 */

import { z } from "zod";
import crypto from "crypto";
import logger from "../lib/logger";
import {
  DiagnosticEvent,
  DiagnosticEventSeverity,
} from "../types/shfi.types";
import { IncidentService } from "./incident.service";

// Canonical Zod Schema for Diagnostic Event Ingestion
export const diagnosticEventInputSchema = z.object({
  schemaVersion: z.string().default("1.0.0"),
  eventType: z.string().min(1),
  eventTime: z.string().optional(),
  schoolId: z.string().nullable().optional(),
  module: z.string().min(1),
  service: z.string().min(1),
  environment: z.string().default(process.env.NODE_ENV || "development"),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).default("INFO"),
  errorCode: z.string().min(1),
  sanitizedDescription: z.string().min(1),
  requestId: z.string().nullable().optional(),
  traceId: z.string().nullable().optional(),
  correlationId: z.string().optional(),
  relatedOperationRef: z.string().nullable().optional(),
  sourceSystem: z.string().default("ssvm-backend"),
  evidence: z.record(z.string(), z.any()).default({}),
  stateTransition: z.string().nullable().optional(),
  processingAttempt: z.number().int().min(1).default(1),
});

export class DiagnosticEventService {
  // In-memory ring buffer for low-latency diagnostic exploration (max 2,000 recent events)
  private static eventBuffer: DiagnosticEvent[] = [];
  private static readonly MAX_BUFFER_SIZE = 2000;

  /**
   * Deep recursive sanitization of diagnostic payloads.
   * Redacts passwords, auth tokens, secrets, encryption keys, and cardholder PAN/CVVs.
   */
  public static sanitize(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data !== "object") {
      if (typeof data === "string") {
        // Redact bearer tokens or JWT strings
        if (/Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/i.test(data)) {
          return "[REDACTED_BEARER_TOKEN]";
        }
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, any> = {};
    const SENSITIVE_KEY_REGEX = /password|secret|token|authorization|apikey|card|cvv|pan|privatekey|credentials/i;

    for (const [key, val] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = "[REDACTED_SENSITIVE_DATA]";
      } else if (typeof val === "object" && val !== null) {
        sanitized[key] = this.sanitize(val);
      } else if (typeof val === "string" && /Bearer\s+[A-Za-z0-9\-_=]+/i.test(val)) {
        sanitized[key] = "[REDACTED_BEARER_TOKEN]";
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }

  /**
   * Ingest a diagnostic event, sanitize evidence, assign canonical metadata,
   * persist to buffer, and dispatch to IncidentService for correlation and classification.
   */
  public static async ingest(rawInput: unknown): Promise<DiagnosticEvent> {
    const validated = diagnosticEventInputSchema.parse(rawInput);
    const now = new Date().toISOString();

    const event: DiagnosticEvent = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      schemaVersion: validated.schemaVersion,
      eventType: validated.eventType,
      eventTime: validated.eventTime || now,
      detectionTime: now,
      schoolId: validated.schoolId || null,
      module: validated.module,
      service: validated.service,
      environment: validated.environment,
      severity: validated.severity as DiagnosticEventSeverity,
      errorCode: validated.errorCode,
      sanitizedDescription: validated.sanitizedDescription,
      requestId: validated.requestId || null,
      traceId: validated.traceId || null,
      correlationId: validated.correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      relatedOperationRef: validated.relatedOperationRef || null,
      sourceSystem: validated.sourceSystem,
      evidence: this.sanitize(validated.evidence),
      stateTransition: validated.stateTransition || null,
      processingAttempt: validated.processingAttempt,
    };

    // Store in ring buffer
    this.eventBuffer.unshift(event);
    if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
      this.eventBuffer.pop();
    }

    logger.info(
      {
        eventId: event.id,
        module: event.module,
        severity: event.severity,
        errorCode: event.errorCode,
        correlationId: event.correlationId,
      },
      "Diagnostic event ingested"
    );

    // If event is WARNING, HIGH or CRITICAL, automatically correlate to Incident
    if (["MEDIUM", "HIGH", "CRITICAL"].includes(event.severity)) {
      try {
        await IncidentService.processDiagnosticEvent(event);
      } catch (err: any) {
        logger.error({ err: err.message }, "Failed to auto-process diagnostic event into incident");
      }
    }

    return event;
  }

  /**
   * Query recent diagnostic events with tenant-scoped filtering and pagination.
   */
  public static query(filter: {
    schoolId?: string | null;
    module?: string;
    severity?: DiagnosticEventSeverity;
    correlationId?: string;
    limit?: number;
    offset?: number;
  }): { events: DiagnosticEvent[]; total: number } {
    let result = [...this.eventBuffer];

    if (filter.schoolId !== undefined) {
      result = result.filter((e) => e.schoolId === filter.schoolId);
    }
    if (filter.module) {
      result = result.filter((e) => e.module.toLowerCase() === filter.module!.toLowerCase());
    }
    if (filter.severity) {
      result = result.filter((e) => e.severity === filter.severity);
    }
    if (filter.correlationId) {
      result = result.filter((e) => e.correlationId === filter.correlationId);
    }

    const total = result.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const events = result.slice(offset, offset + limit);

    return { events, total };
  }

  /**
   * Clear in-memory event buffer (for test isolation).
   */
  public static clearBuffer(): void {
    this.eventBuffer = [];
  }
}
