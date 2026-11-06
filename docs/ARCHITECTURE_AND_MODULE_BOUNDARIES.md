# Architecture and Module Boundaries: SSVM ERP Modular Monolith

**Document Version:** 1.0.0  
**Status:** Authoritative Architectural Specification  
**Architecture Style:** Modular Monolith with Domain-Driven Boundaries  

---

## 1. System Overview

SSVM College Square ERP follows a **Modular Monolith** architecture pattern. It provides high cohesive business capabilities encapsulated in discrete modules sharing a single unified backend runtime, backed by a multi-tenant PostgreSQL database with Row Level Security (RLS), a shared Redis instance for caching, pub/sub and job queues, and seven decoupled frontend Next.js applications.

```
+----------------------------------------------------------------------------------------------------+
|                                    7 Next.js Frontend Portals                                      |
| [erp-admin] [super-admin] [teacher-portal] [student-portal] [parent-portal] [payment] [saas-front] |
+----------------------------------------------------------------------------------------------------+
                                                  │ (HTTPS / JSON / SSE)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                  Express Application Gateway                                       |
|  Security Headers -> Rate Limiter -> CSRF -> JWT / Auth Context -> Tenant Context -> Versioning   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
+----------------------------------+                             +-----------------------------------+
|      Core Business Modules       |                             |     Operations & Platform         |
| - IAM & RBAC                     |                             | - SaaS & Billing Engine           |
| - Academic & Gradebook           |                             | - Notification & Communications   |
| - Finance, Fees & Ledger         |                             | - System Health & Audit Logging   |
| - HR, Staff & Payroll            |                             | - Backup & Disaster Recovery      |
| - Library, Inventory & Transport |                             | - MDM & Master Data Management    |
+----------------------------------+                             +-----------------------------------+
                 │                                                                 │
                 ▼                                                                 ▼
+----------------------------------------------------------------------------------------------------+
|                                    Shared Services & Data Layer                                    |
|   runWithTenantDatabaseTransaction  │  Fail-Closed Prisma Client  │  BullMQ Queue Workers          |
+----------------------------------------------------------------------------------------------------+
                 │                                                                 │
                 ▼                                                                 ▼
+----------------------------------+                             +-----------------------------------+
|     PostgreSQL (Multi-Tenant)    |                             |          Redis Infrastructure     |
|   - Row-Level Security (RLS)     |                             |   - BullMQ Jobs & Queues          |
|   - Strict Foreign Keys & Enums  |                             |   - Rate Limiting & Brute Force   |
|   - Exact Decimal Monetary Types |                             |   - Pub/Sub & Session Invalidation|
+----------------------------------+                             +-----------------------------------+
```

---

## 2. Request Lifecycle & Middleware Pipeline

Every HTTP request to the Express backend passes through a strictly ordered pipeline in `ssvm-backend/src/app.ts`:

1. **Security Headers (`helmet`, `security-headers.middleware.ts`)**: Injects CSP, HSTS, anti-clickjacking, and MIME sniffing protections.
2. **Global & Endpoint Rate Limiting (`rateLimiter.ts`, `brute-force.middleware.ts`)**: Redis-backed sliding-window counters protect against DoS and credential brute-forcing.
3. **CORS & Body Parsing**: Parses JSON payloads with 10MB limits, cookie parsing for secure refresh tokens.
4. **CSRF Protection (`csrf.ts`)**: Double-submit cookie with response header exchange (`X-CSRF-Token`) validated on all state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
5. **Tenant Context Extraction (`schoolContextMiddleware.ts`, `tenant.ts`)**:
   - Resolves tenant from authenticated user JWT claims (`schoolId`), or subdomain/header in public endpoints.
   - Sets PostgreSQL session variable `app.current_school_id` via connection pooling hooks or transaction wrappers.
6. **Authentication & RBAC (`auth.ts`)**:
   - `verifyToken`: Extracts and verifies JWT bearer token.
   - `requireRole`: Validates user role against allowed matrix (`SUPER_ADMIN`, `ERP_ADMIN`, `TEACHER`, `ACCOUNTANT`, `HR`, `PARENT`, `STUDENT`).
   - `requireSchoolAccess`: Guarantees user cannot access data for a school they do not belong to unless possessing global `SUPER_ADMIN` authorization.
7. **Route Handlers**: Dispatches request to the domain route module.
8. **Error Handling (`errorHandler.ts`)**: Catches operational and unhandled exceptions, sanitizes stack traces, and formats response as `{ success: false, error: { message, code } }`.

---

## 3. Domain Module Boundaries

To prevent coupling and maintain architectural integrity, modules must interact strictly through defined service interfaces and events, never by directly mutating tables owned by other domains.

### 3.1. Authentication & Identity Management (IAM)
- **Scope:** User registration, password hashing (Argon2/Bcrypt), MFA/2FA, session lifecycle, token exchange, password resets.
- **Key Models:** `User`, `UserSession`, `RefreshToken`, `OTP`, `RolePermission`, `Permission`.
- **Primary Service:** `auth.service.ts`, `identity.service.ts`.
- **Database Boundary:** Direct owner of credentials and sessions. Other modules reference `userId` as an immutable foreign key.

### 3.2. Multi-Tenancy & School Administration
- **Scope:** School onboarding, branch configurations, academic terms, session years, school settings.
- **Key Models:** `School`, `SchoolGroup`, `AppConfiguration`, `ConfigHistory`.
- **Primary Service:** `tenant.service.ts`, `config.service.ts`.
- **Invariants:** `School` is a global table. Tenant tables must reference `schoolId` with foreign keys to `School(id)`.

### 3.3. Academic Management
- **Scope:** Class/sections, subjects, timetables, attendance, examinations, grading, report cards, student promotions.
- **Key Models:** `Class`, `Section`, `Subject`, `TimetableSlot`, `Attendance`, `Exam`, `StudentMark`, `ReportCard`.
- **Primary Service:** Academic controller/services.
- **Dependencies:** Consumes student IDs from Student module, teacher IDs from HR module.

### 3.4. Finance, Invoicing & General Ledger
- **Scope:** Fee structures, fee components, invoices, receipts, payment gateway integrations, double-entry bookkeeping, chart of accounts, journal entries, fine calculation, tax.
- **Key Models:** `Invoice`, `FeeStructure`, `PaymentTransaction`, `Receipt`, `LedgerAccount`, `JournalEntry`, `LedgerEntry`, `FineRule`.
- **Primary Service:** `ledger.service.ts`, `razorpay-settlement.service.ts`, `reconciliation.service.ts`, `FinancialCloseService.ts`.
- **Critical Invariants:**
  - All monetary values must use `Decimal` (no floating-point rounding errors).
  - All ledger transactions must balance: `SUM(debits) === SUM(credits)`.
  - Sequential receipt numbers generated per-school within transaction boundary (`REC-YYYY-XXXXXX`).

### 3.5. HR, Staff & Payroll
- **Scope:** Staff records, teacher profiles, department management, leave tracking, payroll generation, salary structures, payslips.
- **Key Models:** `Staff`, `Teacher`, `Department`, `LeaveRequest`, `Payroll`, `Payslip`.
- **Dependencies:** Interacts with Finance module to post payroll journal entries to the General Ledger.

### 3.6. Procurement & Inventory
- **Scope:** Vendor management, purchase requests, purchase orders (PO), goods receipt notes (GRN), inventory stock tracking, asset depreciation.
- **Key Models:** `Vendor`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceipt`, `GoodsReceiptLine`, `InventoryItem`, `StockTransaction`, `Asset`.
- **Dependencies:** Goods receipts generate accounting entries in Finance.

### 3.7. Library & Transport Operations
- **Scope:** Book catalogue, borrowing/returns, library fine rules; transport routes, stops, vehicle tracking, driver allocation.
- **Key Models:** `Book`, `BookIssue`, `TransportRoute`, `TransportStop`, `Vehicle`, `Driver`.
- **Dependencies:** Overdue library book fines generate invoices via the Finance module.

### 3.8. Communications & Notifications
- **Scope:** Unified multi-channel routing (Email, SMS, Push, In-App, SSE), notification preferences, template rendering.
- **Key Models:** `Notification`, `NotificationPreference`, `OutboxMessage`, `Message`.
- **Primary Service:** `NotificationRouter.ts`, `communication.service.ts`, `outboxRelay.ts`.
- **Reliability:** Outbox pattern ensures transactional message dispatch without loss during network failures.

---

## 4. Frontend Application Boundaries

| Portal Application | Target Audience | Primary Role Boundaries | Core Capabilities |
|---|---|---|---|
| `erp-admin` | School Principals, Administrators, Registrars | `ERP_ADMIN`, `ACCOUNTANT`, `HR` | Complete school management, fee collection, admissions, grading, staff, inventory. |
| `super-admin` | SaaS Platform Operators | `SUPER_ADMIN` | Multi-school onboarding, billing plans, audit logs, queue telemetry, system configuration. |
| `teacher-portal` | Teachers & Faculty | `TEACHER` | Attendance marking, homework assignments, exam grade entry, student discipline logs. |
| `student-portal` | Enrolled Students | `STUDENT` | Timetable viewing, assignment submission, report cards, library search. |
| `parent-portal` | Parents & Guardians | `PARENT` | Fee payment, child progress reports, attendance tracking, teacher messaging. |
| `payment-portal` | Public / Hosted Checkout | Public / Student Token | Secure tokenized fee checkout, invoice download, payment receipts. |
| `saas-frontend` | Public Website & Marketing | Anonymous | School registration inquiries, pricing, product information. |

---

## 5. Architectural Non-Negotiables

1. **Strict Multi-Tenant Isolation:** No database query may execute against tenant-scoped tables without setting `app.current_school_id` or executing through `runWithTenantDatabaseTransaction`.
2. **No Monolithic Leaks:** Frontends must communicate exclusively through `/api/v1/*` contracts. Frontends never access the database directly.
3. **No Float for Currency:** All financial columns, calculations, and DTOs use `Prisma.Decimal` or arbitrary-precision strings.
4. **Idempotency Everywhere:** All payment webhooks, invoice creation, and ledger postings must require unique idempotency keys.
5. **No Blind Catching:** Errors must be classified into client-recoverable, operational, or catastrophic faults, with audit logging on security anomalies.

