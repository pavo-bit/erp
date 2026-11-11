# SSVM ERP — Security & Multi-Tenancy Architecture

**Canonical Document:** `docs/SECURITY_AND_TENANCY.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Security Guarantees, Tenant Isolation & Access Control

---

## 1. Multi-Tenant Isolation & PostgreSQL Row-Level Security (RLS)

SSVM ERP implements zero-trust, fail-closed multi-tenancy backed directly by PostgreSQL 16 Row-Level Security:

### 1.1 Model Tenancy Classification (216 Total Models)
- **Direct School-Owned (135 Models):** Tables containing a direct foreign key column `schoolId`. `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` are active on every table.
- **Indirect / Junction Models (50 Models):** Sub-resources (e.g., `Section`, `TimetablePeriod`, `InvoiceItem`) inheriting tenant ownership via parent foreign keys (`classId`, `invoiceId`).
- **Platform / Global Models (18 Models):** Administrative tables (`School`, `FeatureFlag`, `SystemLog`, `AuditLog`) accessible solely via trusted platform-admin scopes.
- **User & Session Identity (9 Models):** Global authentication and credentials records (`User`, `RefreshToken`, `TwoFactorSecret`).
- **Internal Queues & Diagnostics (4 Models):** System event outboxes and dead-letter queues (`OutboxEvent`, `DiagnosticEvent`).

### 1.2 The RLS Mechanism & Context Propagation
Each tenant-scoped table has a PostgreSQL RLS policy defined as:
```sql
CREATE POLICY tenant_isolation_policy ON <table>
  FOR ALL
  TO ssvm_app
  USING (school_id = NULLIF(current_setting('app.current_school_id', true), ''))
  WITH CHECK (school_id = NULLIF(current_setting('app.current_school_id', true), ''));
```
- **Fail-Closed Guarantee:** If `app.current_school_id` is empty or unset, the policy evaluates to `NULLIF('', '')` $\to$ `NULL`. In SQL `column = NULL` always evaluates to `UNKNOWN` (falsy), blocking all reads and writes.
- **Transaction Scoping:** Tenant context is injected on the active transaction using:
  ```typescript
  export async function runWithTenantDatabaseTransaction<T>(
    schoolId: string,
    callback: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_school_id = '${schoolId}'`);
      return callback(tx as unknown as PrismaClient);
    });
  }
  ```

### 1.3 Unprivileged Runtime Role (`ssvm_app`)
The backend connects to PostgreSQL using the unprivileged application role `ssvm_app`. This role has:
- `rolsuper = false`: Non-superuser.
- `rolbypassrls = false`: Cannot bypass Row-Level Security under any circumstances.
- Table-level `SELECT, INSERT, UPDATE, DELETE` grants only on necessary schemas.

---

## 2. Authentication Architecture

### 2.1 Password Hashing & Upgrade Path
- Primary password hashing uses **Argon2id** (`argon2.hash(password, { type: argon2.argon2id })`).
- Legacy passwords (e.g., bcrypt during migrations) are automatically upgraded in-place to Argon2id upon successful authentication without user disruption.

### 2.2 Token Lifecycle & Asymmetric Signing
- **Access Tokens:** Signed with **RS256** using a private RSA key; verified using the public key (`ACCESS_TOKEN_PUBLIC_KEY`). Lifespan: 15 minutes.
- **Refresh Tokens:** Opaque cryptographically random tokens stored in the database (`refresh_tokens`), exchanged via HTTP-only, secure, same-site cookies. Lifespan: 7 days.
- **Two-Factor Authentication (2FA):** Time-based One-Time Passwords (TOTP via RFC 6238) supported for administrative and faculty roles. Temporary `2fa_pending` tokens gate full access until verified.

---

## 3. Role-Based Access Control (RBAC)

The system enforces 12 distinct roles defined in the `Role` enum:

| Role | Scope & Permissions | Permitted Portals |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Platform owner. School provisioning, global feature flags, system logs. | `super-admin` |
| **ERP_ADMIN** | School principal/headmaster. Complete management within tenant school. | `erp-admin` |
| **WEBSITE_ADMIN**| School website content editor. Notices, events, and gallery only. | `erp-admin` |
| **TEACHER** | Faculty. Class roll call, gradebook marks entry, homework assignments. | `teacher-portal` |
| **ACCOUNTANT** | School finance. Invoices, cash collections, ledger reports, reconciliations. | `erp-admin` |
| **HR** | Human resources. Staff records, leave approvals, payroll generation. | `erp-admin` |
| **RECEPTIONIST** | Front desk. Inquiries, visitor logs, admissions lead entry. | `erp-admin` |
| **LIBRARIAN** | Campus library. Book titles, copy accessions, issues, and fine fees. | `erp-admin` |
| **ASSET_MANAGER** | Campus inventory. Asset cataloguing, maintenance, procurement POs. | `erp-admin` |
| **STUDENT** | Student. Own grades, homework, personal timetable, fee receipts. | `student-portal`, `payment-portal` |
| **PARENT** | Guardian. Own children's academic progress, fee balances, online payments. | `parent-portal`, `payment-portal` |
| **ALUMNI** | Graduate. Directory listing, public contributions, reunions. | Public, `erp-admin` (management) |

Enforced using middleware:
```typescript
router.get("/reports", authenticate, requireRole("ERP_ADMIN", "ACCOUNTANT"), handler);
```

---

## 4. API Security Tiers

All 428 endpoints are grouped into five distinct security tiers:

| Tier | Classification | Count | Authentication & Authorization Guard |
| :---: | :--- | :---: | :--- |
| **Tier 1** | **Session Authenticated** | **400** | Requires standard `authenticate` middleware, valid session token, tenant context, and `requireRole(...)` / `requireModule(...)`. |
| **Tier 2** | **Independent Machine Auth** | **3** | Machine-to-machine endpoints (biometric device punch sync, vehicle GPS telemetry) authenticated via hardware API keys or bearer tokens. |
| **Tier 3** | **Token / Challenge Lifecycle** | **5** | Session bootstrap routes (login, token refresh, 2FA challenge verification, logout). |
| **Tier 4** | **Public Anonymous Ingestion** | **14** | Public admissions application (`POST /api/v1/admissions/apply`), alumni registration, public notices, and student invoice query by admission number. Protected by Turnstile bot verification and IP rate limiting. |
| **Tier 5** | **Internal Diagnostics** | **6** | Health probes (`/health/liveness`, `/health/readiness`, `/health/deep`), Prometheus `/metrics`, and `/database-identity`. Restricted to loopback or `SUPER_ADMIN`. |

---

## 5. Webhook Security & Idempotency

- **Razorpay Payments:** Webhook requests to `/api/v1/payments/webhook` require strict HMAC-SHA256 signature verification matching `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET`.
- **Replay Protection:** Distributed locks (`redlock:pay:<paymentId>`) in Redis prevent concurrent race conditions. Replayed webhooks return HTTP 200 without duplicate database mutations.

---

## 6. Audit Logging & Compliance

1. **Security Event Logging:** Failed login attempts, password changes, 2FA resets, and permission denials are written to `auth_events` and `audit_events`.
2. **Financial Mutation Audits:** Invoice cancellations, fee discounts, manual fine waivers, and ledger adjustments record `createdById` and immutable audit logs.
3. **Verified Evidence:**
   - **PostgreSQL RLS Suites:** 217/217 real PostgreSQL 16 tests passing (`npm run test:rls`).
   - **Route Boundaries Suite:** 10/10 security test files passing (`vitest run src/tests/security/`).

