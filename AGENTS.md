# SSVM ERP — AI Agent Engineering Directives & Rules of Engagement

**Canonical Document:** `AGENTS.md`  
**Target:** All AI Assistant and Autonomous Engineering Subagents  
**Working Repository:** `pavo-bit/erp`  
**Default Working Branch:** `lane/d-portals`

---

## 1. Project Identity & Architecture

SSVM ERP is a mission-critical multi-tenant SaaS School Enterprise Resource Planning system serving K-12 educational institutions. The platform consists of:
- **Backend Core:** Express.js REST API with Prisma ORM 6.x, PostgreSQL 16 (with Row-Level Security), Redis 7 (BullMQ & Cache), and PgBouncer connection pooling.
- **Frontend Ecosystem (7 Portals):** Next.js 16 (React 19) applications:
  1. `erp-admin`: Comprehensive operational and academic administration (ports 3000 / 3005).
  2. `super-admin`: Platform multi-tenant SaaS management and global monitoring (port 3001).
  3. `teacher-portal`: Attendance, gradebook, timetable, and classroom LMS (port 3002).
  4. `student-portal`: Grades, timetable, homework, and fee ledger viewing (port 3003).
  5. `parent-portal`: Multi-child academic progress, fee payment, and communication (port 3006).
  6. `payment-portal`: Public invoice search and Razorpay payment checkout (port 3007).
  7. `saas-frontend`: Marketing landing and institutional onboarding tenant provisioning (port 3008).

---

## 2. Repository Structure

```
.
├── AGENTS.md                  # Authoritative AI engineering directives (this file)
├── README.md                  # System overview and getting started guide
├── docs/                      # 10 canonical architecture and specification documents
├── erp-admin/                 # School staff and ERP administrator portal (Next.js)
├── super-admin/               # SaaS super-admin platform management portal (Next.js)
├── teacher-portal/            # Faculty grading and roll-call portal (Next.js)
├── student-portal/            # Student portal (Next.js)
├── parent-portal/             # Guardian portal (Next.js)
├── payment-portal/            # Student/Parent payment portal (Next.js)
├── saas-frontend/             # SaaS marketing and school onboarding portal (Next.js)
├── ssvm-backend/              # Express.js REST API backend & BullMQ workers
│   ├── prisma/                # schema.prisma and migrations/
│   ├── src/                   # routes, services, middleware, lib, workers
│   └── src/tests/             # vitest unit, api, security, and db RLS suites
├── scripts/                   # Migration, maintenance, and verification scripts
└── docker-compose.yml         # Container definitions for databases, Redis, apps
```

---

## 3. Frontend / Next.js Guidelines

<!-- BEGIN:nextjs-agent-rules -->
### Next.js 16 / React 19 Rule
This version of Next.js introduces breaking changes — APIs, conventions, and file structure differ from older versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices. Always use Server Components where feasible, mark Client Components with `'use client'`, and avoid deprecated Next router paradigms.
<!-- END:nextjs-agent-rules -->

---

## 4. TypeScript & Coding Standards

1. **Strict Type-Checking:** All backend code, scripts, and frontend applications must pass `tsc --noEmit` with zero errors. Implicit `any` is strictly prohibited.
2. **Explicit Contracts:** All API payloads, query parameters, and database mutations must be strictly typed using Zod or Prisma-generated models.
3. **CommonJS Backend:** The backend operates as CommonJS (`"type": "commonjs"`). Keep imports and exports compliant with project configs.
4. **No Dead Code:** Never commit commented-out code, temporary debug logs, or orphan variables.

---

## 5. Database, Tenancy & PostgreSQL RLS Invariants

1. **Fail-Closed Tenancy:** Missing tenant context (`schoolId`) must fail closed immediately. Every tenant operation must run inside a transaction setting PostgreSQL local variable:
   ```sql
   SET LOCAL app.current_school_id = '<school-id>';
   ```
2. **Unprivileged Application Role:** The application runtime database user `ssvm_app` is non-superuser (`rolsuper=false`) and cannot bypass RLS (`rolbypassrls=false`). Never grant superuser privileges to `ssvm_app`.
3. **Transaction Helper:** Never invoke raw `prisma.$transaction` for tenant data modification. Always use:
   ```typescript
   import { runWithTenantDatabaseTransaction } from "../lib/prisma";
   await runWithTenantDatabaseTransaction(schoolId, async (tx) => { ... });
   ```
4. **Soft Deletes:** Direct-school models inherit soft-delete semantics (`deletedAt`). The transparent Prisma client extension automatically filters out soft-deleted records unless explicitly queried.
5. **Decimal Precision:** Financial values, balances, and fee amounts must strictly use Prisma `Decimal` with half-up rounding. Floating point numbers (`number`) are forbidden for monetary calculations.

---

## 6. Authentication, Authorization & Route Security

All 428 endpoints are classified into 5 security tiers:
- **Tier 1 (Session Authenticated):** Requires `authenticate` middleware, valid session token, and specific `requireRole(...)` / `requireModule(...)` guards.
- **Tier 2 (Independent Machine Auth):** Uses dedicated credentials (e.g., biometric attendance device headers, telemetry bearer tokens).
- **Tier 3 (Token / Challenge Lifecycle):** Specific stateful tokens (2FA verification, password reset tokens, token refresh).
- **Tier 4 (Public Anonymous Ingestion):** Public admissions, contact forms, alumni registration, and public notices. Must be protected by Cloudflare Turnstile (`verifyTurnstile`) and strict IP rate limiting.
- **Tier 5 (Internal Diagnostics):** `/health/deep`, `/metrics`, and `/database-identity`. Restricted to loopback, internal cluster networks, or `SUPER_ADMIN`.

---

## 7. Financial Integrity & Ledger Invariants

1. **Double-Entry Principle:** Every financial ledger transaction must balance:
   $$\sum \text{Debit} \equiv \sum \text{Credit}$$
2. **Standard Account Codes:**
   - `1010-BANK`: School Operating Bank Account
   - `1020-CASH`: Cashier Cash-on-Hand Account
   - `1200-AR`: Accounts Receivable (Student Tuition Outstanding)
   - `2100-ADVANCE`: Student Advance Fee Liability
   - `4010-TUITION`: Fee Income
   - `5010-SAL`: Staff Payroll Expense
3. **Payment Webhook Idempotency:** Webhook processing must use distributed Redis locking and HMAC-SHA256 signature verification. Replayed webhooks must return HTTP 200 without duplicating ledger entries.
4. **Monotonic Receipt Sequence:** Offline cash desk payments must generate monotonically increasing receipt numbers per school using database sequence prechecks to prevent race conditions.

---

## 8. Testing & Quality Assurance Mandates

1. **Evidence-Based Rule:** Never declare a feature, fix, or requirement complete without executing real test suites and reporting exact pass/fail counts.
2. **PostgreSQL RLS Suites:** Run using real PostgreSQL 16 on port 5433:
   ```bash
   npm --prefix ssvm-backend run test:rls
   ```
3. **Full Backend Test Suites:**
   ```bash
   npm --prefix ssvm-backend test
   ```
4. **Frontend Compilations:**
   ```bash
   npx --prefix erp-admin tsc --noEmit
   npx --prefix super-admin tsc --noEmit
   npx --prefix teacher-portal tsc --noEmit
   npx --prefix student-portal tsc --noEmit
   npx --prefix parent-portal tsc --noEmit
   npx --prefix payment-portal tsc --noEmit
   npx --prefix saas-frontend tsc --noEmit
   ```

---

## 9. Safe Migration & Git Safety Rules

1. **No Migration Destruction:** Never delete or alter existing Prisma migration folders in `ssvm-backend/prisma/migrations/`.
2. **Database Isolation:** Tests run against dedicated test databases (`ssvm_test`, `ssvm_test_worker_*`). Never execute destructive schema migrations on production databases without review.
3. **No Automatic Unchecked Commits:** AI assistants must present changes and test verification results cleanly before committing.
4. **Documentation Discipline:** Maintain only the 10 canonical documents in `docs/` plus `README.md` and `AGENTS.md`. Do not create temporary or phase-specific Markdown files.

