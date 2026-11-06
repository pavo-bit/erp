# Phase 1: Application-Level RBAC and Ownership Verification

**Document Version:** 1.0.0  
**Phase:** 1 (P0 Security & Multi-Tenancy)  
**Status:** AUDITED & TEST-VERIFIED  
**Scope:** Express Route Handlers, Role Middleware, Ownership Constraints  

---

## 1. Role Matrix & Domain Authorization Boundaries

Every API endpoint in `ssvm-backend/src/routes/` is protected by `verifyToken` and `requireRole(...)`.

```
                      ┌─────────────────────────────────────────┐
                      │             Incoming Request            │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │        verifyToken (JWT Validation)     │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    requireSchoolAccess (Tenant Check)   │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    requireRole (Matrix Authorization)   │
                      └────────────────────┬────────────────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  ▼                                                 ▼
        [ Role Permitted ]                                [ Role Prohibited ]
         Proceeds to Route                                 HTTP 403 Forbidden
```

### Role Scope & Enforced Capabilities:
- **`SUPER_ADMIN`**: Global SaaS platform operations. Cannot query individual tenant data without explicit per-school context.
- **`ERP_ADMIN`**: Full administrative management of their authenticated school (`schoolId`). Rejected with HTTP 403 when requesting data or endpoints for another school.
- **`ACCOUNTANT`**: Restricted to financial routes (`/api/v1/invoices`, `/api/v1/finance/*`). Blocked from notice creation, HR salary management, and student academic grading.
- **`TEACHER`**: Permitted on class timetables, attendance, homework, and marks entry. Prohibited from financial ledger and invoice management.
- **`WEBSITE_ADMIN`**: Restricted to public notices, events, and gallery CMS routes. Blocked from invoices (`HTTP 403`) and HR salaries (`HTTP 403`).
- **`PARENT`**: Access strictly limited to linked children.
- **`STUDENT`**: Access strictly limited to own enrolled classes, attendance, assignments, and invoices.

---

## 2. Verified Test Assertions (`src/tests/security/` and `src/tests/unit/rbac.test.ts`)

### 2.1. Role Scoping Tests (`src/tests/security/role-scoping.spec.ts`)
- `WEBSITE_ADMIN fails when accessing POST /api/v1/invoices (403)` — **PASSED**
- `WEBSITE_ADMIN fails when accessing GET /api/v1/hr/salaries (403)` — **PASSED**
- `WEBSITE_ADMIN succeeds when accessing POST /api/v1/notices (201)` — **PASSED**
- `ACCOUNTANT succeeds when accessing POST /api/v1/invoices (201)` — **PASSED**
- `ACCOUNTANT fails when accessing POST /api/v1/notices (403)` — **PASSED**
- `ERP_ADMIN succeeds on both notices and invoices (201)` — **PASSED**

### 2.2. Cross-School Isolation Tests (`src/tests/api/tenant-isolation.test.ts`)
- `School A admin reads only School A students` — **PASSED**
- `School A admin cannot view School B student detail (404/500)` — **PASSED**
- `School A admin reads only School A invoices` — **PASSED**
- `School A admin cannot view School B invoice detail (404/500)` — **PASSED**
- `School A admin cannot update School B notice (404/500)` — **PASSED**
- `School A admin lists only School A books` — **PASSED**
- `School A admin cannot update School B book (404/500)` — **PASSED**
- `School A manager cannot approve School B purchase request (403/404/500)` — **PASSED**
- `School A admin cannot update School B alumni record (403/404/500)` — **PASSED**

### 2.3. Exhaustive RBAC Matrix Tests (`src/tests/unit/rbac.test.ts`)
- 50 discrete test assertions validating allowed and prohibited roles across `/api/v1/students`, `/api/v1/hr/salaries`, `/api/v1/schools`, and `/api/v1/users/:id/status`.
- Confirmed unauthenticated requests (`role = null`) return `HTTP 401 Unauthorized`.
- Confirmed unauthorized roles return `HTTP 403 Forbidden`.
- Confirmed authorized roles return `HTTP 200 / 201`.

