# Database Roles and Permissions Specification

**Authoritative Specification for SSVM ERP Database Roles**  
**Lane A (Database Spine)**

---

## 1. Role Architecture Overview

The SSVM database security model enforces least privilege across four functional tiers:

| Role Name | Type | Superuser? | BypassRLS? | Primary Purpose | Privilege Boundary |
|-----------|------|------------|------------|-----------------|-------------------|
| `ssvm_app` | LOGIN | NO | NO | Core application runtime | Full CRUD on tables, strictly filtered by tenant RLS (`"schoolId" = current_tenant_id()`). Restricted from creating `SUPER_ADMIN`/`ERP_ADMIN` users or changing `role`/`schoolId`. |
| `ssvm_auth` | LOGIN | NO | NO | Authentication & Session Management | **Zero table privileges.** Granted `EXECUTE` exclusively on narrow `SECURITY DEFINER` functions (`auth_find_user_by_email`, `auth_find_student_by_admission`, session/token functions). |
| `ssvm_trusted` | LOGIN | NO | NO | Server-Side Audited Tasks | **Zero USING (true) policies.** Operations execute via audited transactions (`runWithTrustedDatabaseTransaction`) with strict purpose allowlists or via the tenant wrapper. |
| `ssvm_fixture` | LOGIN | NO | YES | Test Suite Fixture Generation | Full table privileges with `BYPASSRLS` for provisioning cross-school multi-tenant fixture state in automated test suites. |

---

## 2. NOLOGIN Group Roles

To decouple role permissions from deployment-specific login credentials and passwords, privileges are assigned to NOLOGIN group roles in database migrations:

```
[ ssvm_app_group ]     <-- Granted to ssvm_app
[ ssvm_auth_group ]    <-- Granted to ssvm_auth
[ ssvm_trusted_group ] <-- Granted to ssvm_trusted
[ ssvm_fixture_group ] <-- Granted to ssvm_fixture
```

- Schema migrations (`prisma/migrations`) manage:
  - Role definition (NOLOGIN group roles)
  - Table grants and sequence grants
  - Row Level Security policies
  - `SECURITY DEFINER` functions and trigger guards
- Provisioning script (`scripts/db/provision-roles.sql`) manages:
  - Creation of LOGIN roles (`WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`)
  - Assignment of passwords from environment/variables
  - Assignment of group role memberships (`GRANT ssvm_*_group TO ssvm_*`)

---

## 3. Least Privilege Enforcement Details

### 3.1 `ssvm_app` (Application Runtime)
- **Tenant Isolation**: Row Level Security is `ENABLED` and `FORCED` on all 174 tenant tables. The standard policy enforces:
  ```sql
  CREATE POLICY school_isolation ON <table>
    FOR ALL
    USING ("schoolId" = current_tenant_id())
    WITH CHECK ("schoolId" = current_tenant_id());
  ```
- **Privilege Escalation Guard**: The `trg_guard_user_role_school` trigger on `users` blocks `ssvm_app` from:
  1. Creating users with `role IN ('SUPER_ADMIN', 'ERP_ADMIN')`
  2. Modifying `users.role` on UPDATE
  3. Modifying `users.schoolId` on UPDATE
- **Student Enrollment**: Enrolling a student generates a login `User` record inside `runWithTenantDatabaseTransaction(schoolId, ...)` with `role = 'STUDENT'`.

### 3.2 `ssvm_auth` (Login & Token Management)
- **Zero Table Access**: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_auth, ssvm_auth_group;`
- **Zero Interim Policies**: All interim `USING (true)` table policies (`auth_user_select`, `auth_user_update`, etc.) are removed.
- **SECURITY DEFINER Functions**:
  - `auth_find_user_by_email(p_email text) RETURNS jsonb`: Resolves user credentials, guardian, and alumni records.
  - `auth_find_user_by_id(p_user_id text) RETURNS jsonb`: Resolves user profile by ID for session validation.
  - `auth_find_student_by_admission(p_admission_no text, p_school_id text) RETURNS jsonb`: Resolves student records matching admission number.
  - `auth_find_student_by_user_id(p_user_id text) RETURNS jsonb`: Resolves student profile linked to a user.
  - `auth_find_student_by_id(p_student_id text) RETURNS jsonb`: Resolves student record by student ID.
  - `auth_find_school_by_code(p_code text) RETURNS jsonb`: Resolves school code during multi-school student login.
  - `auth_update_password_hash(p_id text, p_type text, p_new_hash text)`: Performs in-place Argon2id password hash upgrades.
  - `auth_create_refresh_token(...)`, `auth_find_refresh_token(...)`, `auth_revoke_user_tokens(...)`: Refresh token lifecycle.
  - `auth_find_session(...)`, `auth_create_session(...)`, `auth_update_session(...)`, `auth_revoke_session(...)`, `auth_revoke_all_sessions(...)`: User session lifecycle.
  - `log_pre_tenant_auth_event(...)`: Logs pre-tenant login failures and authentication events.

### 3.3 `ssvm_trusted` (Audited System Operations)
- **Zero USING (true) Policies**: All 31 interim `trusted_*` table policies with `USING (true)` have been dropped.
- **Replacement Purpose Mapping**:
  1. **Payment Webhook**: Replaced by `resolve_payment_school(orderId)` function (returns `schoolId`), and subsequent execution runs inside `runWithTenantDatabaseTransaction(schoolId)`.
  2. **Student Enrollment User Creation**: Replaced by standard `prisma.user.create({ ... role: "STUDENT" })` inside the tenant wrapper as `ssvm_app`.
  3. **Super-Admin Cross-School Search**: Replaced by iterating schools through the tenant wrapper `runWithSchoolContext(school.id)`.
  4. **Session Management**: Replaced by `prisma.userSession` under authenticated tenant context.
  5. **Admin Audit Viewer**: Runs via audited `runWithTrustedDatabaseTransaction({ purpose: "ADMIN_AUDIT", actorId })`.
  6. **Logging**: Callers with known `schoolId` use the tenant wrapper; pre-tenant events use `log_pre_tenant_*` functions.

---

## 4. Security Invariants Verified by Automated Tests

1. `ssvm_app` query without tenant context returns 0 rows (fail-closed).
2. `ssvm_app` in tenant context A cannot read or write rows belonging to tenant context B.
3. `ssvm_app` cannot create users with `SUPER_ADMIN` or `ERP_ADMIN` role.
4. `ssvm_app` cannot update `users.role` or `users.schoolId`.
5. `ssvm_auth` has no table permissions and cannot query `invoices` or any application table directly.
6. `ssvm_trusted` has zero `USING (true)` policies in `pg_policy`.
