-- ═══════════════════════════════════════════
-- A3: Database Performance Indexes
-- ═══════════════════════════════════════════
-- This script contains CREATE INDEX CONCURRENTLY commands for high-traffic tables.
-- Run this script directly against the database using psql (or your DB client)
-- during off-peak hours.
--
-- Why not Prisma migrations?
-- Prisma runs migrations inside a single transaction. PostgreSQL does NOT allow
-- CREATE INDEX CONCURRENTLY inside a transaction block. Separating this script
-- ensures zero-downtime indexing for large tables without blocking migrations.

-- 1. PaymentTransactions: High traffic filtering by school, status, and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_transactions_school_status_createdAt"
  ON "payment_transactions"("schoolId", "status", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_transactions_invoiceId"
  ON "payment_transactions"("invoiceId");

-- 2. Invoices: Heavy analytical queries on overdue status and due dates
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_invoices_schoolId_status_dueDate"
  ON "invoices"("schoolId", "status", "dueDate");

-- 3. Webhooks: Fast DLQ polling
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_failed_webhooks_nextRetryAt"
  ON "failed_webhooks"("nextRetryAt")
  WHERE "retryCount" < 5; -- Partial index for active retry queue

-- 4. LedgerTransactions: Faster reporting per school
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ledger_transactions_schoolId_postingDate"
  ON "ledger_transactions"("schoolId", "postingDate" DESC);

-- 5. AuditLogs: Fast lookup by entity and user
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_entity_entityId"
  ON "audit_logs"("entity", "entityId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_userId"
  ON "audit_logs"("userId");
