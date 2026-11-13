# SSVM ERP — System Architecture Specification

**Canonical Document:** `docs/SYSTEM_ARCHITECTURE.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Comprehensive Architecture & Infrastructure Topology

---

## 1. High-Level System Architecture

SSVM ERP employs a decoupled, multi-tenant distributed architecture designed for horizontal scalability, zero-trust tenant isolation, and high resilience:

```
                            ┌─────────────────────────────────────────┐
                            │    Client Browsers / Hardware Devices   │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │   Edge Security & Load Balancing (WAF)  │
                            │   - Cloudflare SSL & Turnstile Bot Check │
                            │   - Edge Rate Limiting & Proxy Routing   │
                            └────────────────────┬────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
        ┌──────────▼──────────┐                                     ┌──────────▼──────────┐
        │ 7 Next.js Frontends │                                     │  Express.js Backend │
        │ (Ports 3000-3008)   │                                     │  Core REST API      │
        │ - SSR & App Router  │                                     │  (Port 5000)        │
        │ - React 19 Client   │                                     │  - Auth & Guard     │
        └──────────┬──────────┘                                     │  - Tenant RLS Wrap  │
                   │                                                │  - Business Domains │
                   └───────────────────── HTTP / JSON ──────────────►└──────────┬──────────┘
                                                                                │
                                       ┌────────────────────────────────────────┴────────────────────────────────────────┐
                                       │                                                                                 │
                            ┌──────────▼──────────┐                                                           ┌──────────▼──────────┐
                            │ PgBouncer Connection│                                                           │   Redis 7 In-Memory │
                            │ Pooler (Port 6432)  │                                                           │   (Port 6379)       │
                            └──────────┬──────────┘                                                           │   - BullMQ Workers  │
                                       │                                                                      │   - Webhook Locks   │
                            ┌──────────▼──────────┐                                                           │   - Rate Limit Keys │
                            │ PostgreSQL 16 DB    │                                                           │   - SSE Pub/Sub     │
                            │ (Port 5433)         │                                                           └─────────────────────┘
                            │ - Row-Level Security│
                            │ - 216 Prisma Tables │
                            │ - Unprivileged Role │
                            └─────────────────────┘
```

---

## 2. Backend Architecture (`ssvm-backend`)

The backend is built with Express.js 5 and TypeScript running in CommonJS mode. It consists of the following layered subsystems:

1. **Routing & Dispatch Layer (`src/routes/`):**
   - 36 route files exposing 428 endpoint declarations prefixed under `/api/v1/` and legacy `/api/`.
   - Clear domain separation: `admissions`, `students`, `academic`, `attendance`, `exams`, `finance`, `hr`, `library`, `transport`, `procurementOps`, `saas`, and `security`.
2. **Middleware Pipeline (`src/middleware/`):**
   - `helmet` and `cors` for HTTP header security and origin validation.
   - `authenticate` verifying RS256 signed JWTs with Argon2id session hashing.
   - `requireRole(...)` enforcing role-based access control.
   - `requireModule(...)` enforcing school plan and module entitlement.
   - `verifyTurnstile` and spam quality heuristics for unauthenticated lead-capture routes.
   - `csrfCheck` for state-changing browser cookie requests.
3. **Database Access & Tenant Wrapper (`src/lib/prisma.ts`):**
   - Single Prisma Client instance enhanced with transparent extensions for tenant isolation and soft-delete filtering.
   - `runWithTenantDatabaseTransaction(schoolId, txCallback)` guaranteeing transaction-scoped PostgreSQL session setting:
     ```sql
     SET LOCAL app.current_school_id = '<schoolId>';
     ```
4. **Asynchronous Background Processing (`src/workers/`):**
   - BullMQ workers backed by Redis 7 processing heavy workloads:
     - `communications`: Outbox email and SMS message delivery.
     - `lateFines`: Nightly invoice overdue assessment and fine accrual.
     - `maintenance`: Periodic soft-delete record archiving and session pruning.
     - `auditEvents`: Async persisting of security and compliance log entries.

---

## 3. Seven Frontend Applications

The user interface layer is composed of seven independent Next.js 16 (React 19) applications:

| Application | Directory | Default Port | Primary Target Role | Core Architectural Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **ERP Admin** | `erp-admin` | `3000` / `3005` | `ERP_ADMIN`, `ACCOUNTANT`, `HR`, `LIBRARIAN` | Primary administration dashboard containing all 35 operational modules, fee desks, staff records, and academic schedules. |
| **Super Admin** | `super-admin` | `3001` | `SUPER_ADMIN` | Multi-school platform administration, school provisioning, database migration monitoring, and global audit logs. |
| **Teacher Portal** | `teacher-portal` | `3002` | `TEACHER` | Class roll-call attendance, gradebook marks entry, homework assignment posting, and student evaluation. |
| **Student Portal** | `student-portal` | `3003` | `STUDENT` | Timetable viewing, homework submission, attendance statistics, exam mark sheets, and library book loans. |
| **Parent Portal** | `parent-portal` | `3006` | `PARENT` | Multi-child dashboard, fee balance inspection, online invoice payments, attendance notifications, and teacher messaging. |
| **Payment Portal** | `payment-portal` | `3007` | Anonymous / `STUDENT` / `PARENT` | Streamlined invoice payment checkout screen with Razorpay gateway integration and instant receipt download. |
| **SaaS Frontend** | `saas-frontend` | `3008` | Public Visitors / Prospective Schools | Public institutional marketing landing, platform feature showcase, pricing plans, and self-service school onboarding. |

---

## 4. Shared Services & Domain Boundaries

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SHARED SERVICE LAYER                                           │
├────────────────────────┬────────────────────────┬────────────────────────┬───────────────────────┤
│    Identity & Auth     │     General Ledger     │     Self-Healing       │    Communications     │
│   Token issuance, 2FA  │   Double-entry engine, │     Fault Isolation    │   Outbox queue,       │
│   verification, role   │   journal balances,    │     (SHFI) incident    │   email, SMS, and     │
│   checking, passwords  │   cash desk receipts   │     engine & alerts    │   internal messages   │
└────────────────────────┴────────────────────────┴────────────────────────┴───────────────────────┘
                                             │
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────────────┐
│              ACADEMIC DOMAIN                  │ │            OPERATIONS DOMAIN                  │
│ - Admissions, Enrolments & SIS                │ │ - Human Resources & Monthly Payroll           │
│ - Classes, Sections & Timetable               │ │ - Library Book Copies & Overdue Fines         │
│ - Attendance & Biometric Punches              │ │ - Transport Routes, Fleet & Telemetry         │
│ - Exams, Gradebook, Assessment & Promotion    │ │ - Procurement, Purchase Orders & GRN          │
└───────────────────────────────────────────────┘ └───────────────────────────────────────────────┘
```

---

## 5. Data Flow & Transaction Guarantees

### Flow 1: Offline Cash Fee Payment
1. Cashier enters student admission number in ERP Admin Fee Desk.
2. Backend queries student invoices scoped to tenant via RLS.
3. Cashier confirms partial/full amount.
4. `runWithTenantDatabaseTransaction` executes:
   - Increments cashier sequence to generate unique receipt number (`REC-yyyy-xxxxx`).
   - Updates `Invoice` status (`PAID` or `PARTIAL`).
   - If payment exceeds outstanding balance, records `StudentAdvanceCredit`.
   - Posts balanced `LedgerTransaction` (`Dr: 1020-CASH`, `Cr: 1200-AR` / `2100-ADVANCE`).
5. Transaction commits atomically; printable receipt rendered with verification hash.

### Flow 2: Webhook Payment Capture (Razorpay)
1. Razorpay dispatches `payment.captured` event to `/api/v1/payments/webhook`.
2. Backend computes HMAC-SHA256 signature using `RAZORPAY_WEBHOOK_SECRET` and validates against `x-razorpay-signature`.
3. Acquires distributed Redis idempotency lock: `redlock:pay:<paymentId>`.
4. If event was already processed, releases lock and responds `HTTP 200 { received: true }`.
5. Executes transaction: marks payment verified, settles invoice, posts general ledger journal entries.
6. Emits `PAYMENT_POSTED` domain event to outbox.

---

## 6. Observability & Self-Healing Architecture

1. **Metrics Collection:** Prometheus scrapes backend metrics endpoint (`/metrics`) exposing request rates, error distributions, database connection pool utilization, and JWT verification algorithms.
2. **Visualizations:** Grafana dashboards provide pre-configured panels for platform overview, tenant request distribution, and queue backlogs.
3. **Self-Healing Fault Isolation (SHFI):** Ingests runtime exceptions into structured diagnostic events (`/api/v1/shfi/events`). Severe incidents (e.g., database pool exhaustion, gateway failure) trigger incident auto-creation and administrator alert dispatch.

---

## 7. Implementation Map (Code-Verified)

Generated from the codebase (post-merge `main`). Counts: 83 route files, 59 service files, 221 Prisma models, 501 route handlers, 109 frontend pages (page.tsx).

### 7.1 Backend route files (ssvm-backend/src/routes/)

Core/cross-cutting: auth.ts, users.ts, schools.ts, sessions.ts, health.ts, search.ts, support.ts, communications.ts, admin/audit.ts, webhooks.ts + webhooks/payments.ts.

Academic: academic.ts, attendance.ts, exams.ts, timetable.ts, students.ts, admin/admissions-bulk.ts, admin/import.ts.

Finance: finance.ts, finance-governance.ts, finance-cashier.ts, invoices.ts, payments.ts, scholarships.ts, admin/billing.ts, admin/purchaseOrders.ts.

HR: hr.ts, admin/payroll.ts.

Campus ops: admin/transport.ts, admin/ancillary.ts (hostel), library.ts, admin/shfi.ts.

Procurement/inventory: inventory.ts, procurement.ts.

SaaS/platform: saas.ts, schools.ts.

CRM/alumni: crm.ts, alumni.ts.

### 7.2 Backend service files (ssvm-backend/src/services/)

Admissions bulk pipeline: admissions-bulk/* (admission-types, admission-validation-engine, admission-workbook-parser, admission-registration-service, admission-pdf, admission-fee-config, admission-paper-forms, admission-template-registry) + import-framework/* (file-parser, column-mapper, validation-engine, duplicate-detector, import-processor, template-generator, template-registry).

Finance: ledger.service.ts, BankReconciliationService.ts, cash-collection.service.ts, cash-receipt-pdf.service.ts, reconciliation.service.ts, chartOfAccounts.ts, amount-to-words.ts, money.ts.

Academic: gradebook.service.ts, report-card.service.ts, promotion.service.ts, timetable.service.ts, library.service.ts.

Campus/ops: campus-operations-meta.service.ts, module-registry.service.ts, health-monitor.service.ts, incident.service.ts, incident-classification.service.ts, diagnostic-event.service.ts.

Identity/tenant: auth.service.ts, identity.service.ts, tenant.service.ts, authPrisma.ts (lib), trustedPrisma.ts (lib), policy.service.ts, mdm.service.ts.

Infra: audit-hash-chain.service.ts, authEventLogger.ts, eventStore.service.ts, integration.service.ts, intercompany.service.ts, projection.service.ts, revenue.service.ts, workflow.service.ts, serializableRetry.ts.

Mail: mail.service.ts.

### 7.3 Frontend pages (page.tsx) by portal

erp-admin: dashboard, admin/* (admissions, admissions/bulk, admissions/history, students, students/[id], students/guardians, users, fees, fees/defaulters, fees/ledger, finance/close, finance/fee-collection, hostel, transport, library, discipline, documents, institution/*, settings/*, notifications/templates, analytics, alumni-mgmt, assets, reception, events, notices, exams, results, attendance, timetable, assignments, hr, teachers, saas-requests, system/shfi). Plus (dashboard)/* and set-password.

super-admin: dashboard, dashboard/schools, dashboard/analytics, dashboard/shfi, login, set-password.

teacher-portal: portal/* (discipline, exams, salary), set-password.

student-portal: (dashboard)/* (fees, profile), login, set-password.

parent-portal: (dashboard)/* (behavior, fees, results, transport), dashboard/*, login, set-password.

payment-portal: checkout, login, set-password.

saas-frontend: page (landing), set-password.

### 7.4 Key middleware (ssvm-backend/src/middleware/)

auth.ts (authenticate, requireRole, requireDirectRole, hashPassword, student account linking, mustChangePassword, runWithTenant/Trusted helpers), csrf.ts, school-context.middleware.ts, tenant.ts, featureGuard.ts, moduleGuard.ts.

### 7.5 Async workers (ssvm-backend/src/jobs/)

worker.ts, queue.ts, backup.ts, bulkImportWorker.ts, exportWorker.ts, lateFines.ts, maintenanceWorker.ts, notificationWorker.ts, outboxRelay.ts, scanWorker.ts, webhookWorker.ts. BullMQ-backed, mocked in tests.

### 7.6 Prisma models (221 total)

Grouped by domain (representative): User, Student, Guardian, Teacher, Staff, School, Branch, Session, Class, Section, Subject, Attendance, Exam, Grade, ReportCard, Invoice, Payment, LedgerTransaction, LedgerEntry, Account (chart of accounts), BankStatement, CashReceipt, StudentAdvanceCredit, Scholarship, FeeStructure, LateFineRule, LibraryBook, LibraryCopy, LibraryIssue, Vehicle, Driver, Route, RouteStop, HostelRoom, HostelBed, HostelAllocation, PurchaseOrder, Vendor, GoodsReceipt, Asset, Visitor, Alumni, Notice, Event, Message, Notification, AuditLog, RetentionPolicy, Document, Module, ModuleEntitlement, ShfiEvent, Incident, etc. Full list: grep "^model " ssvm-backend/prisma/schema.prisma.

### 7.7 API surface

- 501 route handlers across 83 route files, mounted under /api/v1/ (and legacy /api/, /api/v2/).
- OpenAPI spec generated via npm run generate:openapi -> openapi.json / ssvm_openapi_documentation.md.
- 428 endpoints classified into 5 security tiers (per AGENTS.md section 6).

### 7.8 Migrations (chronological)

20260612* (phase features, indexes, library, 2FA, models), 20260617* (RLS policies, payment idempotency), 20261101* (full schema baseline, FTS indexes, ledger integrity, generated tenant RLS, password setup tokens/functions, security definer roles), 20261102* (security definer roles & guards), 20261103* (schema updates & decimal), 20261104* (receipt unique indexes), 20261105* (B2 finance followups), 20261107* (cash collection & allocations), 20261108* (library enterprise), 20261112* (admission operational handoff).

### 7.9 Drift notes (code vs docs)

- docs/ARCHITECTURE.md (old) deleted; replaced by docs/SYSTEM_ARCHITECTURE.md, docs/MODULES_AND_PORTALS.md, docs/CORE_MODULE_IMPLEMENTATION_STATUS.md.
- docs/KNOWN_LIMITATIONS.md, docs/TESTING_MASTER_PLAN.md, docs/BUILD_AND_TEST_REPORT.md, docs/RELEASE_CRITERIA.md, docs/TECHNICAL_DECISIONS.md, docs/REMEDIATION_DECISIONS.md deleted in merge; superseded by new canonical docs (PRODUCT_SCOPE, DEPLOYMENT_AND_OPERATIONS, DEVELOPMENT_AND_TESTING, SECURITY_AND_TENANCY, etc.).
- docs/security/ROUTE_AUTHORIZATION_MATRIX.md deleted; replaced by docs/security/AUDIT_ALLOWLIST.json + DEPENDENCY_TRIAGE.md.
- Portal AGENTS.md / CLAUDE.md / README.md deleted from sub-portals; root AGENTS.md is now the authoritative instruction file.
- ssvm-backend/docs/cloudflare-config.md and runbooks/incident-response.md deleted.
- Port numbers in docs now consistent with docker-compose.yml (student portal host 3003, saas 3008).
- Backend lint count (567) and test DB guard claims remain accurate.
