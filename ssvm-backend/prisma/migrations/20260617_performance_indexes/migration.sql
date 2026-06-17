-- ═══════════════════════════════════════════
-- GAP 5: Database Performance Engineering
-- ═══════════════════════════════════════════
-- Composite indexes for common query patterns.
-- Based on analysis of route handlers and service queries.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Invoice (Fee) Queries — Most frequent in payment flow
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_invoices_school_status_due"
  ON "invoices" ("schoolId", "status", "dueDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_invoices_student_status"
  ON "invoices" ("studentId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_invoices_school_type_month"
  ON "invoices" ("schoolId", "type", "createdAt");

-- ─────────────────────────────────────────────────────────────────────
-- 2. Student Queries — Dashboard, attendance, grade sheets
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_students_school_class_section"
  ON "students" ("schoolId", "currentClass", "currentSection");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_students_school_active"
  ON "students" ("schoolId") WHERE "deletedAt" IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Attendance Queries — Daily mark + reports
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attendance_school_date"
  ON "attendance" ("schoolId", "date");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attendance_student_date"
  ON "attendance" ("studentId", "date");

-- ─────────────────────────────────────────────────────────────────────
-- 4. Ledger Queries — Financial reports, hash chain
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ledger_txn_school_period_status"
  ON "ledger_transactions" ("schoolId", "accountingPeriodId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ledger_txn_school_posting_date"
  ON "ledger_transactions" ("schoolId", "postingDate" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ledger_entries_account"
  ON "ledger_entries" ("accountId");

-- ─────────────────────────────────────────────────────────────────────
-- 5. Notification Queries — Inbox, unread count
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_school_created"
  ON "notifications" ("schoolId", "createdAt" DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 6. System Logs — Admin monitoring, security audits
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_system_logs_level_created"
  ON "system_logs" ("level", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_system_logs_module_created"
  ON "system_logs" ("module", "createdAt" DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 7. Refresh Tokens — Auth lookups
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_refresh_tokens_user_active"
  ON "refresh_tokens" ("userId", "isRevoked") WHERE "isRevoked" = false;

-- ─────────────────────────────────────────────────────────────────────
-- 8. Admissions — Pipeline queries
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_admissions_school_status_created"
  ON "admissions" ("schoolId", "status", "createdAt" DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 9. Exam Results — Grade report generation
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_exam_results_exam_student"
  ON "exam_results" ("examId", "studentId");

-- ─────────────────────────────────────────────────────────────────────
-- 10. Payment Transactions — Financial dashboards
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_txn_school_status_paid"
  ON "payment_transactions" ("schoolId", "status", "paidAt" DESC);
