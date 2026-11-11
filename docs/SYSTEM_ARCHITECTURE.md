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

