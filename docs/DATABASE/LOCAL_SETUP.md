# SSVM Database Local Setup & Role Provisioning

This guide describes how to configure, migrate, and provision the SSVM PostgreSQL database for local development and test execution.

---

## 1. Role Architecture & Principle of Least Privilege

The database enforces row-level security (RLS) across all tenant-scoped tables and separates operational responsibilities into four dedicated database roles:

| Role Name | Purpose | Superuser | Bypass RLS | Access Scope |
| :--- | :--- | :---: | :---: | :--- |
| `postgres` | Migration & Schema Owner | Yes | Yes | Schema migrations, DDL, extension maintenance |
| `ssvm_app` | Runtime Application | **No** | **No** | Full CRUD on application tables scoped by `current_tenant_id()` session setting |
| `ssvm_auth` | Authentication / Login | **No** | **No** | Read-only credential lookups, token & session creation, column-level password hash / last login updates |
| `ssvm_trusted` | Named Server Background Jobs | **No** | **No** | Webhook processing, event & audit log persistence, super-admin cross-school search |
| `ssvm_fixture` | Test-Only Fixture Generator | **No** | **Yes** | Seed data setup across multiple tenant schools (test harnesses only) |

---

## 2. Idempotent Provisioning Script

All role creations, table grants, sequence permissions, and specialized RLS policies are defined in a single, authoritative, version-controlled script:
[`ssvm-backend/scripts/db/provision-roles.sql`](file:///c:/Users/MAYURESH/Desktop/all%20projects/erp/ssvm-backend/scripts/db/provision-roles.sql).

### Security Requirements:
- **No hardcoded secrets**: Passwords must be passed as `psql` variables.
- **Idempotency**: Running the script multiple times produces identical state without destructive errors.

---

## 3. Provisioning Roles via `psql`

To provision roles on a local or remote PostgreSQL instance:

```bash
psql -h localhost -p 5432 -U postgres -d ssvm_test --set=ON_ERROR_STOP=1 \
  -v app_password="your_app_password" \
  -v auth_password="your_auth_password" \
  -v trusted_password="your_trusted_password" \
  -v fixture_password="your_fixture_password" \
  -f ssvm-backend/scripts/db/provision-roles.sql
```

### In PowerShell:

```powershell
docker exec -i ssvm-database psql -U postgres -d ssvm_test `
  -v app_password=app_pw `
  -v auth_password=authpassword `
  -v trusted_password=trustedpassword `
  -v fixture_password=fixture_pw `
  -f - < ssvm-backend/scripts/db/provision-roles.sql
```

---

## 4. Environment Configuration

Define connection strings in `.env` or load them via `scripts/test-env.ps1`:

```ini
# Application runtime (strictly tenant-isolated)
DATABASE_URL="postgresql://ssvm_app:app_pw@localhost:5433/ssvm_test?schema=public"

# Auth / Login only (narrow least-privilege)
DATABASE_URL_AUTH="postgresql://ssvm_auth:authpassword@localhost:5433/ssvm_test?schema=public"

# Trusted background jobs (webhooks, audit logging, super-admin search)
DATABASE_URL_TRUSTED="postgresql://ssvm_trusted:trustedpassword@localhost:5433/ssvm_test?schema=public"

# Test fixtures only (tests bypass RLS to seed multiple schools)
DATABASE_URL_TEST_FIXTURE="postgresql://ssvm_fixture:fixture_pw@localhost:5433/ssvm_test?schema=public"

# Schema migrations only (Postgres owner)
DIRECT_URL="postgresql://postgres:postgres@localhost:5433/ssvm_test?schema=public"
```

---

## 5. Verification & Health Probes

Verify that each role connects correctly and adheres to permission boundaries:

```bash
# Check role attributes
psql -U postgres -d ssvm_test -c "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('ssvm_app', 'ssvm_auth', 'ssvm_trusted', 'ssvm_fixture');"

# Run startup database health check
npm run test:ci -- src/tests/api/db-roles-health.test.ts
```
