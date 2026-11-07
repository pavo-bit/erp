/**
 * ssvm-backend/src/services/incident-classification.service.ts
 * Deterministic Failure Classification & Root-Cause Analysis Engine for SHFI
 */

import {
  DiagnosticEvent,
  DiagnosticEventCategory,
  DiagnosticConfidence,
} from "../types/shfi.types";

export interface ClassificationResult {
  category: DiagnosticEventCategory;
  confidence: DiagnosticConfidence;
  rootCause: string | null;
  initialSymptom: string;
  recommendedActions: string[];
}

export class IncidentClassificationService {
  /**
   * Deterministically classifies a diagnostic event based on pattern matching,
   * error codes, subsystem metadata, and structured evidence.
   */
  public static classify(event: DiagnosticEvent): ClassificationResult {
    const errorText = `${event.errorCode} ${event.sanitizedDescription} ${JSON.stringify(event.evidence)}`.toLowerCase();
    const initialSymptom = event.sanitizedDescription || "Unspecified service degradation observed";

    // 1. Database Failures
    if (
      event.errorCode.startsWith("P20") ||
      event.errorCode.startsWith("ERR_DB") ||
      errorText.includes("prismaclient") ||
      errorText.includes("connection closed") ||
      errorText.includes("connection pool") ||
      errorText.includes("deadlock detected") ||
      errorText.includes("query timeout")
    ) {
      const isDeadlock = errorText.includes("deadlock");
      const isPool = errorText.includes("pool") || errorText.includes("timeout");
      return {
        category: "DATABASE",
        confidence: "CONFIRMED",
        rootCause: isDeadlock
          ? "Concurrent transaction deadlock on PostgreSQL relation"
          : isPool
          ? "Database connection pool exhaustion or high query execution latency"
          : "Database operational or query constraint violation",
        initialSymptom,
        recommendedActions: [
          "Inspect active PostgreSQL connections (`pg_stat_activity`)",
          "Verify PgBouncer pool depth and transaction timeout settings",
          "Check recent database migrations for unindexed foreign keys",
        ],
      };
    }

    // 2. Redis & In-Memory Store
    if (
      event.errorCode.startsWith("ERR_REDIS") ||
      errorText.includes("redis") ||
      errorText.includes("econnrefused 6379") ||
      errorText.includes("maxmemory")
    ) {
      return {
        category: "REDIS",
        confidence: "CONFIRMED",
        rootCause: "Redis instance unreachable, connection refused, or memory saturation",
        initialSymptom,
        recommendedActions: [
          "Check Redis container and memory consumption via `INFO memory`",
          "Verify Redis eviction policy (e.g. volatile-lru)",
          "Inspect firewall/network connectivity on port 6379",
        ],
      };
    }

    // 3. Queue & Background Jobs (BullMQ)
    if (
      event.module === "BACKGROUND_JOBS" ||
      event.service.includes("worker") ||
      event.errorCode.startsWith("ERR_QUEUE") ||
      errorText.includes("bullmq") ||
      errorText.includes("job stalled") ||
      errorText.includes("missing lock")
    ) {
      return {
        category: "QUEUE",
        confidence: "CONFIRMED",
        rootCause: "Background job execution stalled or queue processing latency threshold exceeded",
        initialSymptom,
        recommendedActions: [
          "Inspect failed jobs in BullMQ Dead-Letter Queue (DLQ)",
          "Verify worker heartbeat concurrency and job timeout configuration",
          "Trigger controlled retry for transient worker failures",
        ],
      };
    }

    // 4. Ledger & Accounting Reconciliation
    if (
      event.module === "FINANCE" &&
      (errorText.includes("ledger") ||
        errorText.includes("debit") ||
        errorText.includes("credit") ||
        errorText.includes("reconciliation") ||
        event.errorCode.includes("BALANCE_MISMATCH"))
    ) {
      return {
        category: "LEDGER_RECONCILIATION",
        confidence: "CONFIRMED",
        rootCause: "Double-entry General Ledger transaction imbalance or account balance reconciliation divergence",
        initialSymptom,
        recommendedActions: [
          "Verify journal entry debit and credit line totals (`SUM(debits) === SUM(credits)`)",
          "Run financial period trial balance audit (`GET /api/v1/finance/ledger/trial-balance`)",
          "Ensure no manual direct balance adjustments bypassed the double-entry transaction pipeline",
        ],
      };
    }

    // 5. Payment Gateway & Webhooks
    if (
      event.module === "PAYMENTS" ||
      errorText.includes("razorpay") ||
      errorText.includes("gateway") ||
      errorText.includes("webhook")
    ) {
      const isWebhook = errorText.includes("webhook") || errorText.includes("signature");
      if (isWebhook) {
        return {
          category: "WEBHOOK",
          confidence: "CONFIRMED",
          rootCause: "Payment gateway webhook delivery rejection, signature verification mismatch, or payload malformation",
          initialSymptom,
          recommendedActions: [
            "Verify gateway webhook secret configuration in environment variables",
            "Check idempotent delivery table `WebhookDelivery` for duplicate transaction IDs",
            "Ensure raw payload body stream was not mutated prior to cryptographic HMAC verification",
          ],
        };
      }

      const isProvider = errorText.includes("502") || errorText.includes("504") || errorText.includes("timeout");
      return {
        category: "PAYMENT_PROVIDER",
        confidence: isProvider ? "PROBABLE" : "UNKNOWN",
        rootCause: isProvider
          ? "Payment gateway API upstream timeout or gateway service disruption"
          : "Payment initiation rejected by provider or payment instrument issue",
        initialSymptom,
        recommendedActions: [
          "Check payment provider status page / API telemetry",
          "Verify order status via provider dashboard before initiating secondary charge attempt",
          "Check transaction logs for gateway error code and bank response code",
        ],
      };
    }

    // 6. Tenant Context & Isolation
    if (
      event.errorCode.includes("TENANT") ||
      errorText.includes("tenantmismatch") ||
      errorText.includes("schoolid mismatch") ||
      errorText.includes("cross-tenant")
    ) {
      return {
        category: "TENANT_CONTEXT",
        confidence: "CONFIRMED",
        rootCause: "Fail-closed multi-tenancy violation prevented unauthorized cross-tenant execution",
        initialSymptom,
        recommendedActions: [
          "Verify request header/JWT `schoolId` claims match target entity ownership",
          "Audit database query to ensure `schoolId` filter is explicitly bound within tenant transaction",
          "Log security audit alert for anomalous cross-tenant access attempt",
        ],
      };
    }

    // 7. Authentication & Authorization
    if (
      event.errorCode.includes("AUTH") ||
      errorText.includes("jwt expired") ||
      errorText.includes("unauthorized") ||
      errorText.includes("permission denied") ||
      errorText.includes("forbidden")
    ) {
      const isForbidden = errorText.includes("forbidden") || errorText.includes("permission denied");
      return {
        category: isForbidden ? "AUTHORIZATION" : "AUTHENTICATION",
        confidence: "CONFIRMED",
        rootCause: isForbidden
          ? "Actor lacks necessary role or capability privilege to execute protected operation"
          : "Invalid, missing, expired, or revoked authentication credentials",
        initialSymptom,
        recommendedActions: [
          isForbidden
            ? "Inspect RBAC role matrix for actor role and target route permissions"
            : "Trigger automatic client-side token refresh via `fetchWithAuthRetry`",
        ],
      };
    }

    // 8. Storage Failures
    if (
      event.module === "STORAGE" ||
      errorText.includes("s3") ||
      errorText.includes("enoent") ||
      errorText.includes("eacces") ||
      errorText.includes("disk full")
    ) {
      return {
        category: "STORAGE",
        confidence: "CONFIRMED",
        rootCause: "File storage volume permission error, disk space exhaustion, or object store connectivity failure",
        initialSymptom,
        recommendedActions: [
          "Check filesystem mount permissions and disk space utilization (`df -h`)",
          "Verify object store bucket credentials, region configuration, and IAM policies",
        ],
      };
    }

    // 9. Notification Provider Failures
    if (
      event.module === "COMMUNICATIONS" ||
      errorText.includes("twilio") ||
      errorText.includes("smtp") ||
      errorText.includes("sms")
    ) {
      return {
        category: "NOTIFICATION_PROVIDER",
        confidence: "PROBABLE",
        rootCause: "Downstream SMS/Email carrier rejection, rate limiting, or gateway connectivity timeout",
        initialSymptom,
        recommendedActions: [
          "Verify SMS provider credit balance and sender ID whitelist",
          "Check outbox relay queue for pending retry messages",
          "Enable automatic failover to secondary notification provider adapter",
        ],
      };
    }

    // 10. Default / Insufficient Evidence -> UNKNOWN
    return {
      category: "UNKNOWN",
      confidence: "UNKNOWN",
      rootCause: null,
      initialSymptom,
      recommendedActions: [
        "Gather additional diagnostic evidence and correlate with relevant request trace ID",
        "Inspect application server logs and stack traces around failure timestamp",
      ],
    };
  }
}

