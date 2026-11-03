# Tenant Context Architecture & Background Workers

## Overview
All database interactions with tenant-scoped tables require an explicit tenant context. In HTTP requests, this context is derived exclusively from the verified JWT access token (never headers or body) and held in Node.js `AsyncLocalStorage`.

For asynchronous BullMQ queues, scheduled cron jobs, and background workers, each tenant job carries `schoolId` in its payload and executes inside `runWithTenantDatabaseTransaction(schoolId, fn)`. This sets `app.current_school_id` transaction-locally (`SET LOCAL` / `set_config(..., true)`) before executing database queries, ensuring PostgreSQL Row-Level Security (RLS) is strictly enforced.

## Workers and Cron Jobs Inventory

| Worker / Job Name | Queue / Scheduler | Payload `schoolId` | Wrapper Implementation | Status |
|---|---|---|---|---|
| `importWorker` | `importQueue` | Required (`job.data.schoolId`) | Wrapped in `runWithTenantDatabaseTransaction(schoolId, async () => { ... })`. Scopes `bulkJob`, `student`, `teacher`, `user` operations. | Wrapped |
| `exportWorker` | `exportQueue` | Required (`job.data.schoolId`) | Wrapped in `runWithTenantDatabaseTransaction(schoolId, async () => { ... })`. Scopes data extraction for students, teachers, users. | Wrapped |
| `pdfWorker` | `PDF_QUEUE` | Carried (`job.data.schoolId`) | Wrapped in `runWithTenantDatabaseTransaction(schoolId, async () => { ... })`. Scopes notification creation upon PDF generation completion. | Wrapped |
| `notificationWorker` | `notificationQueue` | Carried (`job.data.schoolId`) | Wrapped in `runWithTenantDatabaseTransaction(schoolId, async () => { ... })`. Scopes `communicationLog` updates and message delivery. | Wrapped |
| `scanWorker` | `SCAN_QUEUE` | Carried (`job.data.schoolId`) | Wrapped in `runWithTenantDatabaseTransaction(schoolId, async () => { ... })`. Scopes `storageObject` virus scan status updates. | Wrapped |
| `webhookWorker` | `webhookQueue` | Optional / Global | Dispatches outbound HTTP webhooks with HMAC signatures; failure routing writes to Dead Letter Queue (DLQ). | Outbound HTTP |
| `emailWorker` | `emailQueue` | Optional / Global | Sends emails via external provider (SendGrid/SMTP). No direct tenant table queries. | Outbound Email |
| `smsWorker` | `smsQueue` | Optional / Global | Sends SMS via external provider (Twilio). No direct tenant table queries. | Outbound SMS |
| `idempotency-cleanup` | `maintenanceQueue` (cron: every 6h) | System Cron | Global maintenance job cleaning expired idempotency records from Redis and system tables. | System Scope |
| `validate-backup` | `maintenanceQueue` (cron: Sun 2am) | System Cron | Global maintenance job validating backup integrity and archive signatures. | System Scope |
| `daily-reconciliation` | `reconciliationQueue` (cron: 9am) | System Cron | Server-side job reconciling Razorpay payment settlements across schools. | System Scope |
| `cleanupTokens` | In-process timer (24h) | System Cron | Cleans expired refresh tokens and OTP records. | System Scope |
| `cleanupSoftDeletes` | `maintenanceQueue` (daily) | System Cron | Purges soft-deleted records older than 30-day retention window across tenants via super/trusted context. | System Scope |

## Fail-Closed Guarantees
If any worker or query attempts to access a tenant-classified table without a tenant context (`schoolId` missing or null):
1. **Reads** (`findMany`, `count`, `findFirst`, etc.): Automatically execute in an empty-tenant transaction (`set_config('app.current_school_id', '', true)`), causing RLS policies to evaluate to false and return 0 rows.
2. **Writes** (`create`, `update`, `delete`, `upsert`): Immediately throw an error (`Tenant context required for write operation on tenant table`), preventing un-scoped data modification.
