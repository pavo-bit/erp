# SSVM ERP — Grafana Hardening & Platform Access Architecture

**Canonical Specification:** `docs/MONITORING/GRAFANA_ACCESS.md`  
**Governing Rule:** Block M4 Security Invariants  
**Target:** Infrastructure, Observability, and Platform Engineering

---

## 1. Architectural Overview & Hardening Summary

To protect multi-tenant integrity and prevent any exposure of sensitive student or institutional data, the SSVM ERP Grafana monitoring platform is strictly decoupled and hardened across three defense layers:

1. **Anonymous Authentication Disabled:**
   - Anonymous access (`auth.anonymous.enabled`) is permanently disabled in `grafana.ini` and container environment variables (`GF_AUTH_ANONYMOUS_ENABLED=false`).
   - Image version is strictly pinned to `grafana/grafana-enterprise:11.3.1` (no `:latest` tags permitted).

2. **Least-Privilege Database Role (`ssvm_grafana_ro`):**
   - Grafana connects to PostgreSQL using the dedicated unprivileged database role `ssvm_grafana_ro`.
   - `ssvm_grafana_ro` is completely revoked from accessing the `public` schema (`REVOKE ALL ON ALL TABLES IN SCHEMA public`).
   - `ssvm_grafana_ro` possesses `SELECT` privileges **only** on pre-aggregated views in the `platform_metrics` schema.
   - **Zero PII Exposure:** Views contain strictly numerical totals and status counts (`total_students`, `active_schools`, `total_faculty`, `total_fee_collected`). No student names, emails, guardian contacts, or individual records exist in `platform_metrics`.

3. **Elimination of Base Table Raw SQL Panels:**
   - All legacy panels that directly queried `students`, `schools`, `teachers`, `users`, or `invoices` have been migrated to point exclusively to `platform_metrics` aggregate views (`platform_overview_v`, `school_aggregates_v`, `fee_invoices_by_status_v`, `user_accounts_by_role_v`, `outbox_queue_stats_v`).

---

## 2. Embedding Mechanism Selection & Justification

### Options Evaluated

1. **Option (A) — Grafana auth.jwt with short-lived tokens:**
   - Mentions issuing a short-lived signed JWT by the backend and passing it via the `Authorization: Bearer <jwt>` or cookie directly to Grafana's exposed HTTP port.
   - *Limitation:* Exposes Grafana's HTTP port to client network paths and relies on Grafana's internal JWT parsing plugin configuration.

2. **Option (B) — Centralized Reverse Proxy Gateway (`/api/v1/platform/grafana/*`):**
   - Routes all monitoring dashboard traffic through the backend Express REST gateway guarded by `authenticate`, `requireRole("SUPER_ADMIN")`, and `requireAudience("PLATFORM")`.
   - Grafana container port 3000 is internal to the Docker network (`ssvm-network`) and never directly exposed to public ingress.

### Decision & Technical Justification

**Option (B) (Centralized Reverse Proxy Gateway) is selected as the primary architecture:**

1. **Strict Fail-Closed Tenancy:**
   - Any token originating from a school context (`ERP_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`) has audience `SCHOOL` and tenant context `schoolId`. The gateway automatically rejects school tokens with **HTTP 403 Forbidden** before any network packet reaches Grafana.
2. **Centralized Authentication & MFA Enforcement:**
   - Platform sessions are subject to the platform-wide session lifecycle, rate limiting, and Step-Up MFA re-authentication without relying on third-party Grafana plugins.
3. **Defense-in-Depth:**
   - Even in the catastrophic event of an auth bypass at the reverse proxy layer, Grafana's datasource role (`ssvm_grafana_ro`) has zero database permissions to read student or tenant base tables.

---

## 3. Access Control Verification Matrix

| Caller Identity | Token Type | Audience | Endpoint | Expected Status | Result |
|---|:---:|:---:|---|:---:|:---:|
| Anonymous (No Credentials) | *(none)* | *(none)* | `/api/v1/platform/grafana/` | **401 Unauthorized** | Verified |
| School ERP Admin | Bearer | `SCHOOL` | `/api/v1/platform/grafana/` | **403 Forbidden** | Verified |
| Teacher / Student / Parent | Bearer | `SCHOOL` | `/api/v1/platform/grafana/` | **403 Forbidden** | Verified |
| Super Admin Platform Session | Bearer | `PLATFORM` | `/api/v1/platform/grafana/` | **200 OK** | Verified |

---

## 4. Database Schema Specification (`platform_metrics`)

```sql
CREATE SCHEMA IF NOT EXISTS platform_metrics;

-- 1. High-level system statistics (Zero PII)
CREATE OR REPLACE VIEW platform_metrics.platform_overview_v AS
SELECT
  (SELECT COUNT(*) FROM schools WHERE status = 'ACTIVE' AND "deletedAt" IS NULL) AS active_schools,
  (SELECT COUNT(*) FROM students WHERE "deletedAt" IS NULL) AS total_students,
  (SELECT COUNT(*) FROM teachers WHERE "deletedAt" IS NULL) AS total_faculty,
  (SELECT COUNT(*) FROM users WHERE "isActive" = true AND "deletedAt" IS NULL) AS total_users;

-- 2. School-level volume aggregates
CREATE OR REPLACE VIEW platform_metrics.school_aggregates_v AS
SELECT
  s.id AS school_id,
  s.code AS school_code,
  s.status AS school_status,
  COUNT(DISTINCT st.id) AS total_students,
  COUNT(DISTINCT t.id) AS total_teachers,
  COALESCE(SUM(fr."totalAmount"), 0) AS total_fee_collected
FROM schools s
LEFT JOIN students st ON st."schoolId" = s.id AND st."deletedAt" IS NULL
LEFT JOIN teachers t ON t."schoolId" = s.id AND t."deletedAt" IS NULL
LEFT JOIN fee_receipts fr ON fr."schoolId" = s.id AND fr."isCancelled" IS FALSE
WHERE s."deletedAt" IS NULL
GROUP BY s.id, s.code, s.status;

-- 3. Invoices distribution
CREATE OR REPLACE VIEW platform_metrics.fee_invoices_by_status_v AS
SELECT status AS "Status", COUNT(id) AS "Invoices" FROM invoices GROUP BY status;

-- 4. User role distribution
CREATE OR REPLACE VIEW platform_metrics.user_accounts_by_role_v AS
SELECT role AS "Role", COUNT(id) AS "Users" FROM users WHERE "deletedAt" IS NULL GROUP BY role;

-- 5. Outbox queue backlog
CREATE OR REPLACE VIEW platform_metrics.outbox_queue_stats_v AS
SELECT status, COUNT(*) AS event_count FROM "OutboxMessage" GROUP BY status;
```

---

## 5. Database Role & Secret Rotation Procedures

### 5.1 `ssvm_grafana_ro` Database Credential Rotation

The database password for `ssvm_grafana_ro` is decoupled from static migration definitions. Deploy-time migration `20261119183000_alter_ssvm_grafana_ro_password` enables dynamic alteration.

To rotate the password in any environment:

1. **Deploy-Time Environment Variable:**
   ```bash
   export GRAFANA_DB_PASSWORD="<new-secure-password>"
   ```

2. **Execute PostgreSQL ALTER Command:**
   ```bash
   psql -h $DATABASE_HOST -p 5432 -U postgres -d ssvm_platform -c "ALTER ROLE ssvm_grafana_ro WITH LOGIN PASSWORD '${GRAFANA_DB_PASSWORD}';"
   ```

3. **Update Grafana Container / Helm Config:**
   Update the datasource password or container environment variable `GRAFANA_DB_PASSWORD` in `docker-compose.yml` or Kubernetes Secret, then restart Grafana.

### 5.2 Prometheus `METRICS_TOKEN` Rotation

1. **Generate New Cryptographic Token:**
   ```bash
   openssl rand -hex 32 > prometheus/metrics_token
   chmod 600 prometheus/metrics_token
   ```

2. **Update Backend Service:**
   Set `METRICS_TOKEN` environment variable on the backend API container and restart. The backend fails to start in production if `METRICS_TOKEN` is unset or blank.

3. **Reload Prometheus Ingress:**
   Send `POST /-/reload` to the Prometheus server container to read the mounted `/etc/prometheus/metrics_token:ro`.

