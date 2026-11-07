# Security and Tenancy Audit: SSVM Multi-School ERP

**Document Version:** 1.0.0  
**Audit Scope:** Multi-Tenancy Isolation, RBAC, Authentication, Cryptography, Data Protection  
**Auditor Assessment:** Rigorous RLS Spine; Zero-Trust Tenant Isolation Enforced  

---

## 1. Multi-Tenancy Architecture & Isolation Mechanics

The ERP enforces a **Defense-in-Depth Multi-Tenancy Strategy** operating across three distinct software layers:
1. **Network / HTTP Gateway Layer**
2. **Application / ORM Layer**
3. **Database Engine / Row Level Security (RLS) Layer**

```
   ┌─────────────────────────────────────────────────────────────┐
   │ HTTP Request (Subdomain / Header / JWT claim: schoolId)     │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 1. schoolContextMiddleware.ts:                              │
   │    Extracts & validates schoolId; validates active status;  │
   │    Sets request-scoped AsyncLocalStorage context.           │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 2. runWithTenantDatabaseTransaction:                        │
   │    Acquires DB connection; checks for mismatched nesting;   │
   │    Executes: SET LOCAL app.current_school_id = '<schoolId>' │
   │    Injects fail-closed tenant client.                       │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 3. PostgreSQL Database Engine (Row Level Security):         │
   │    relrowsecurity = true, relforcerowsecurity = true        │
   │    Policy: school_id = current_setting('app.current_school_id')│
   │    Tables reject queries without active tenant context.     │
   └─────────────────────────────────────────────────────────────┘
```

### 1.1. Database Engine Layer: Row Level Security (RLS)
- **Coverage:** All 177 tenant-scoped database tables have PostgreSQL RLS enabled and forced (`FORCE ROW LEVEL SECURITY`).
- **Policy Enforcement:** 
  ```sql
  CREATE POLICY tenant_isolation_policy ON <tenant_table>
    FOR ALL
    TO ssvm_app
    USING (school_id = current_setting('app.current_school_id', true))
    WITH CHECK (school_id = current_setting('app.current_school_id', true));
  ```
- **Force Row Security:** By setting `ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY`, table owners and elevated roles cannot bypass RLS accidentally.
- **Database Roles:**
  - `ssvm_app`: The runtime application role used by the Express backend. Has `SELECT`, `INSERT`, `UPDATE`, `DELETE` grants on tenant tables, restricted by RLS.
  - `ssvm_auth`: Restricted role used exclusively for authentication and session credential verification.
  - `SUPER_ADMIN_SEARCH`: Security-definer search function role restricted to authorized multi-school platform searches with audit logging.
  - `PAYMENTS_WEBHOOK`: Specialized role allowing cross-school lookup of payment orders strictly by `gateway_order_id` within the payment settlement transaction.

### 1.2. Application & ORM Layer: Fail-Closed Tenant Client
- **Transaction Wrapper (`runWithTenantDatabaseTransaction`):**
  - All tenant operations run inside `runWithTenantDatabaseTransaction(schoolId, async (tx) => { ... })`.
  - **Mismatched Nesting Prevention:** If `runWithTenantDatabaseTransaction` is invoked inside an active transaction with a different `schoolId`, it throws a fatal security exception (`TenantMismatchError`). Same-school nesting is permitted and reuses the existing transaction context.
- **Tenant Client Interceptors:**
  - Prisma extension automatically injects `where: { schoolId }` into generated queries as an additional safeguard.
  - If `schoolId` is missing or `null`, the client fails closed rather than querying across all schools.

### 1.3. Tenant Classification Verification
- Validated via `node ssvm-backend/scripts/generate-tenant-classification.cjs --check`:
  - **Total Models:** 211 (208 baseline + 3 cash collection models)
  - **Direct Tenant Models:** 130 (127 baseline + `FeeReceipt`, `PaymentAllocation`, `StudentAdvanceCredit`)
  - **Indirect Tenant Models:** 50
  - **Global Models:** 31
  - **Covered Tables with Forced RLS:** 180 classified tenant models possess verified RLS policies (`relrowsecurity = true`, `relforcerowsecurity = true`).
  - **Cross-Tenant Data Leakage:** 0 leaks detected across all multi-tenancy verification suites.

---

## 2. Authentication, RBAC & Identity Security

### 2.1. Role-Based Access Control (RBAC) Matrix
The application defines seven distinct user roles:
1. `SUPER_ADMIN`: Global SaaS platform operator; access to all schools, billing plans, audit hash chains.
2. `ERP_ADMIN`: School principal / institutional administrator; full administrative access to their specific `schoolId`.
3. `TEACHER`: Faculty member; access to assigned classes, timetable, attendance, marks, homework.
4. `ACCOUNTANT`: Financial administrator; fee collection, invoice management, ledger transactions, refunds.
5. `HR`: Human resources administrator; staff records, payroll, leave requests, biometric logs.
6. `PARENT`: Guardian; view linked children, attendance, fee payment, report cards.
7. `STUDENT`: Enrolled pupil; view personal timetable, grades, homework, library book loans.

### 2.2. Route Authorization Enforcement
- Every route group in `ssvm-backend/src/app.ts` is protected by `verifyToken` and `requireRole(...)`.
- `requireSchoolAccess`: Middleware compares `req.user.schoolId` with `req.params.schoolId` or `req.headers['x-school-id']`. If mismatched and user is not `SUPER_ADMIN`, access is immediately denied (`HTTP 403 Forbidden`).

### 2.3. Token & Session Management
- **Access Tokens:** Short-lived JSON Web Tokens (15-minute expiration) signed with asymmetric or high-entropy HMAC keys.
- **Refresh Tokens:** Long-lived (7-day) opaque tokens stored in httpOnly, secure, sameSite cookies.
- **Token Invalidation:** Redis-backed blacklist and `UserSession` table tracking allow instant revocation upon logout or password change.
- **Automatic Client Token Refresh:** All 7 frontend portals implement `fetchWithAuthRetry` — upon encountering an `HTTP 401`, the client automatically calls `/api/v1/auth/refresh-token`, updates the CSRF token, and retries the failed request transparently.

---

## 3. Cryptography & Data Protection

### 3.1. Password Security
- **Algorithm:** Argon2id / Bcrypt with configurable cost factors (minimum 12 rounds).
- **Enforcement:**
  - Zero plaintext passwords in memory or logs.
  - Legacy or backfilled users have `mustChangePassword = true` and high-entropy generated password hashes. Empty passwords strictly prohibited at the database schema level (`CHECK (length(password_hash) > 20)`).

### 3.2. CSRF (Cross-Site Request Forgery) Protection
- **Double-Submit Pattern:** On initial page load and authentication, the server injects an encrypted `XSRF-TOKEN` cookie and a matching header.
- State-mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) require the `x-csrf-token` header matching the cookie.
- Unit and integration tests verify rejection of mismatched or absent CSRF tokens.

### 3.3. Audit Hash Chain
- The ERP features an immutable audit log (`AuditLog` table) secured with cryptographic hash chaining (`audit-hash-chain.service.ts`).
- Each audit log entry calculates `SHA-256(previous_hash + current_entry_payload)`, preventing retroactive log tampering by rogue administrators.

### 3.4. Diagnostic Data Sanitization & Tenant-Scoped Incident Isolation
- **Recursive Payload Sanitization:** All raw error payloads, stack traces, and request contexts captured by `DiagnosticEventService` undergo recursive redaction before persistence or caching.
  - Redacted keys: `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, `creditCard`, `pan`, `cvv`, `cardNumber`, `ssn`.
- **Tenant-Scoped Incident Isolation:**
  - `ERP_ADMIN` access to `/api/v1/shfi/*` is forced to `schoolId = req.user.schoolId`. School administrators can never query, observe, or update incidents belonging to other schools.
  - End-user support facade (`/api/v1/support`): Parents, students, and teachers submit inquiries without direct visibility into internal diagnostic events, database queries, or server stack traces. Responses provide safe reference tokens and generic operational status.
- **Traceability & Request Binding:**
  - `addResponseHeaders` injects `X-Correlation-ID` and `X-Request-ID` across all HTTP responses, linking client telemetry with server diagnostic events without exposing sensitive metadata.

---

## 4. Threat & Vulnerability Assessment

| Threat Vector | Mitigation Strategy | Status |
|---|---|---|
| **Cross-Tenant Data Leakage** | Database-level RLS policies + ORM query scoping + transaction checks. | **VERIFIED (0 Leaks)** |
| **Privilege Escalation** | Rigid role middleware (`requireRole`); DB role `ssvm_app` cannot modify permissions or grant superuser. | **VERIFIED** |
| **SQL Injection** | Prisma parameterized queries + strict validation schemas (`zod`). | **MITIGATED** |
| **Brute Force & Credential Stuffing** | Redis sliding-window rate limiters on `/auth/login` and `/auth/password-reset`. | **VERIFIED** |
| **Financial State Tampering** | Double-entry ledger invariants enforced via database triggers and application transactions. | **VERIFIED** |
| **Session Hijacking** | HttpOnly, Secure, SameSite cookies for refresh tokens; IP / User-Agent pinning in `UserSession`. | **VERIFIED** |
| **Diagnostic Data Leakage** | Recursive sanitization redacting credentials, tokens, PAN, CVV from telemetry and error traces. | **VERIFIED** |
| **Cross-Tenant Diagnostic Visibility** | Automatic `schoolId` scoping on SHFI admin routes; safe support inquiry facade for end-users. | **VERIFIED** |

