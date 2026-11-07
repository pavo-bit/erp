/**
 * ssvm-backend/src/types/shfi.types.ts
 * Canonical contracts for System Health, Failure Investigation & Incident Management Centre (SHFI)
 */

export type DiagnosticEventSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type DiagnosticEventCategory =
  | "USER_VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "TENANT_CONTEXT"
  | "BUSINESS_RULE"
  | "DATABASE"
  | "REDIS"
  | "QUEUE"
  | "BACKGROUND_JOB"
  | "NETWORK_API"
  | "STORAGE"
  | "PAYMENT_PROVIDER"
  | "PAYER_BANK"
  | "RECEIVING_BANK"
  | "WEBHOOK"
  | "LEDGER_RECONCILIATION"
  | "NOTIFICATION_PROVIDER"
  | "INFRASTRUCTURE"
  | "SECURITY_INCIDENT"
  | "UNKNOWN";

export type DiagnosticConfidence = "CONFIRMED" | "PROBABLE" | "UNKNOWN";

export type IncidentStatus =
  | "DETECTED"
  | "TRIAGED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "INVESTIGATING"
  | "ACTION_REQUIRED"
  | "ESCALATED"
  | "RESOLVED"
  | "VERIFIED"
  | "CLOSED"
  | "REOPENED";

export type EscalationLevel = "L1" | "L2" | "L3" | "EXECUTIVE";

export interface DiagnosticEvent {
  id: string;
  schemaVersion: string;
  eventType: string;
  eventTime: string;
  detectionTime: string;
  schoolId: string | null;
  module: string;
  service: string;
  environment: string;
  severity: DiagnosticEventSeverity;
  errorCode: string;
  sanitizedDescription: string;
  requestId: string | null;
  traceId: string | null;
  correlationId: string;
  relatedOperationRef: string | null;
  sourceSystem: string;
  evidence: Record<string, any>;
  stateTransition: string | null;
  processingAttempt: number;
}

export interface IncidentTimelineEntry {
  timestamp: string;
  event: string;
  actor?: string;
  details?: any;
}

export interface IncidentAuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  metadata?: any;
}

export interface PlatformIncident {
  id: string;
  title: string;
  summary: string;
  severity: DiagnosticEventSeverity;
  category: DiagnosticEventCategory;
  confidence: DiagnosticConfidence;
  status: IncidentStatus;
  schoolId: string | null;
  affectedService: string;
  affectedModule: string;
  rootCause: string | null;
  initialSymptom: string;
  correlationId: string;
  eventCount: number;
  events: DiagnosticEvent[];
  evidence: Record<string, any>[];
  timeline: IncidentTimelineEntry[];
  assignedToUserId: string | null;
  assignedToRole: string | null;
  escalationLevel: EscalationLevel;
  recommendedActions: string[];
  resolutionNotes: string | null;
  resolvedAt: string | null;
  verifiedAt: string | null;
  closedAt: string | null;
  closureReason: string | null;
  auditHistory: IncidentAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthDependencyStatus {
  name: string;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  latencyMs: number;
  details?: Record<string, any>;
  lastChecked: string;
}

export interface SystemHealthOverview {
  overallStatus: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  timestamp: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  dependencies: {
    database: HealthDependencyStatus;
    redis: HealthDependencyStatus;
    queues: HealthDependencyStatus;
    storage: HealthDependencyStatus;
  };
  metrics: {
    openIncidents: number;
    criticalIncidents: number;
    eventsInLastHour: number;
    memoryUsageMB: number;
    cpuLoadAverage: number[];
  };
}

