# Production Readiness Checklist: SSVM ERP Multi-School SaaS

**Document Version:** 1.0.0  
**Scope:** Pre-Deployment Verification, Security Hardening, Operational Reliability  
**Target Environment:** Staging & Production Deployment  

---

## 1. Security & Multi-Tenancy Gate (P0 - Mandatory)

- [x] **PostgreSQL Row Level Security (RLS):**
  - `relrowsecurity = true` and `relforcerowsecurity = true` verified across all 177 tenant-classified tables.
  - No `USING (true)` bypass policies exist on tenant tables.
  - Non-tenant tables explicitly documented and restricted.
- [x] **Database Runtime Roles:**
  - Application connects exclusively as restricted role `ssvm_app` (or `ssvm_auth` for authentication).
  - Direct connection as PostgreSQL superuser prohibited in application runtime.
- [x] **Tenant Context Isolation:**
  - All tenant operations run inside `runWithTenantDatabaseTransaction` or fail-closed Prisma client.
  - Nesting with mismatched `schoolId` throws fatal `TenantMismatchError`.
- [x] **Authentication & Cryptography:**
  - Password hashing uses Argon2id or Bcrypt with >= 12 rounds.
  - Zero plaintext passwords in database or logs.
  - High-entropy generated passwords with `mustChangePassword = true` for legacy/backfilled accounts.
- [x] **CSRF & Session Protection:**
  - Double-submit CSRF cookie/header exchange active on all mutating endpoints (`POST`, `PUT`, `DELETE`).
  - Refresh tokens stored in `httpOnly`, `secure`, `sameSite: strict` cookies.
  - Sliding-window brute force rate limiting active on `/api/v1/auth/login`.

---

## 2. Financial Integrity & Accounting Gate (P0 - Mandatory)

- [x] **Exact Monetary Representation:**
  - All financial columns in PostgreSQL use `DECIMAL(12,2)`.
  - All JavaScript calculations use `Prisma.Decimal` or arbitrary-precision math (no floating-point arithmetic).
- [x] **Double-Entry General Ledger:**
  - Every financial transaction posts balanced journal entries (`SUM(debits) === SUM(credits)`).
  - Database constraint or trigger verifies ledger balance before commit.
- [x] **Sequential Per-School Receipts:**
  - Receipt numbers generated atomically per school and financial year (`REC-YYYY-XXXXXX`).
  - Unique index `(schoolId, receiptNo)` prevents duplicates under concurrent payment processing.
- [x] **Payment Webhook Idempotency:**
  - Webhooks enforce unique transaction ID locking.
  - Permanent errors (unknown invoice, mismatched currency) return HTTP 200 + error log to prevent gateway retries.
  - Transient errors (DB timeout, network drop) return HTTP 5xx to trigger gateway retry.
- [x] **Closed Period Ledger Lock:**
  - Modifying journal entries or invoices in a locked financial period strictly rejected (`FinancialCloseService`).
- [x] **Subsystem Ledger Integration:**
  - HR Payroll payout posts balanced double-entry transactions (Debit `5010-SAL`, Credit `1010-BANK`).
  - Procurement Goods Receipt posts balanced double-entry transactions (Debit `5020-GEN`, Credit `2010-AP`).
  - Cash collection fee receipts post balanced double-entry transactions (Debit `1020-CASH`, Credit `4000-TUIT` / `1200-AR` / `2100-ADV`).

---

## 3. Frontend Portals & User Experience Gate (P1)

- [x] **Portal Build & Typecheck Parity:**
  - All 7 frontend portals (`erp-admin`, `super-admin`, `teacher-portal`, `student-portal`, `parent-portal`, `payment-portal`, `saas-frontend`) compile cleanly with `npm run build` and `npx tsc --noEmit`.
- [x] **Unified API Client Architecture:**
  - All portals implement `fetchWithAuthRetry` with automatic 401 token refresh and redirect on session expiry.
  - Automated CSRF header inclusion on all state mutations.
- [x] **Mock-Free User Workflows:**
  - Zero mock or placeholder data in primary administrative, academic, and financial workflows.
  - Live backend endpoints integrated for analytics, schools, transport, salary, examination results, and SHFI operations.
- [x] **Responsive Design & Accessibility:**
  - Portals functional on desktop and tablet viewports; zero blocking layout breaks; standard error boundaries and empty state indicators.

---

## 4. Reliability, Observability & Performance Gate (P1)

- [x] **Metrics & Observability:**
  - Prometheus metrics exporter mounted at `/metrics` (request duration, status codes, active connections, queue depth).
  - Standardized health check probes mounted at `/api/v1/health` (liveness, readiness, deep storage read/write/unlink probes).
  - Centralized System Health, Failure Investigation & Incident Management Centre (SHFI) with deterministic classification and durable Redis + PostgreSQL `system_logs` persistence surviving container restarts.
- [x] **Fault Tolerance & Circuit Breaking:**
  - Circuit breaker protects backend from cascading failures when third-party gateways (Razorpay, SMS) are degraded.
  - Failed background jobs automatically routed to Dead Letter Queue (DLQ) with retry metadata.
- [x] **Automated Backup & Disaster Recovery (DR) & PITR:**
  - Daily automated PostgreSQL backup script configured.
  - Automated restore test script (`scripts/dr-test.js`) verifies database recovery from backup against an isolated ephemeral database across all 208 physical tables (RTO: 6.55s, RPO: 374ms).
  - Local PostgreSQL WAL Archiving and Point-In-Time Recovery harness (`scripts/wal-pitr-test.js`) verified with zero transaction loss at target LSN (RTO: 170ms, RPO: 1537ms).
- [x] **Fail-Closed Environment Validation:**
  - Multi-profile CLI validator (`scripts/validate-env.js`) enforces strict non-default secrets, valid encryption keys, and masked logging across development, test, pilot, and production profiles.
- [x] **Operational Runbooks:**
  - 6 production runbooks in `docs/runbooks/` covering SHFI response, DB restore, outages, security incidents, deployment, and queues.
- [x] **Database Connection Pool Sizing:**
  - PgBouncer configured to manage application connection concurrency safely within PostgreSQL limits.

---

## 5. Quality Assurance & CI/CD Ratchet Gate (P0 - Mandatory)

- [x] **Lint & Code Style Ratchet:**
  - Backend ESLint ratchet strictly enforced at or below baseline (640 problems). CI fails on any regression.
- [x] **Automated Test Coverage:**
  - Unit, API, and multi-tenancy tests pass in CI containerized pipeline.
  - High-performance parallel test execution coordinator (`scripts/run-parallel-checks.js`) running 16 tasks simultaneously with 100% pass rate.
  - Zero test skips or deletions; all assertions pass against active PostgreSQL test database.
- [x] **No Unapproved External Expenses:**
  - System operates entirely on open-source, local, or self-hosted services; no commercial SaaS dependencies required for baseline operation.
  - External cloud credentials (S3, Razorpay live keys, production SMS) identified as the sole prerequisite before live production promotion.

