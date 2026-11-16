# SSVM ERP — Unified Prometheus Metrics Vocabulary

**Canonical Specification:** `docs/MONITORING/METRICS.md`  
**Metric Prefix:** `ssvm_` (Strict Invariant across default runtime and custom application metrics)  
**Verification:** Validated mechanically in CI via `scripts/check-metrics-vocabulary.cjs`.

---

## 1. Architectural Principles & Invariants

1. **Uniform Metric Prefix:** All metrics exposed by the SSVM ERP platform must begin with the prefix `ssvm_`.
2. **Cardinality Bounds:**
   - **No Personal Data (PII):** User IDs, usernames, passwords, student IDs, parent IDs, phone numbers, and email addresses are strictly forbidden as metric labels.
   - **Bounded Enums Only:** All label values must be bounded finite sets (e.g., HTTP methods, response status codes, queue names, audit actions).
   - **Tenant Boundedness:** The label `schoolId` is permitted **only** on `ssvm_tenant_requests_total`. For 100 active schools, cardinality is bounded to 100 series.
3. **Standard Prometheus Units:**
   - Durations and latencies use **seconds** (`_seconds`), conforming to standard Prometheus naming conventions.
   - Memory and storage use **bytes** (`_bytes`).
   - Cumulative totals use counter suffix `_total`.
4. **Single Source of Truth:**
   - Every metric referenced in `prometheus/alert.rules.yml` and `grafana/dashboards/*.json` must be declared and registered in `ssvm-backend/src/middleware/metrics.ts`.

---

## 2. Core Application & Operational Metrics

| Metric Name | Type | Labels | Description / Help |
|---|:---:|---|---|
| `ssvm_http_request_duration_seconds` | Histogram | `method`, `route`, `code` | Duration of HTTP requests in seconds (SLI: latency). Buckets: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`. |
| `ssvm_http_errors_total` | Counter | `method`, `route`, `code` | Cumulative number of HTTP 4xx and 5xx client/server errors. |
| `ssvm_http_active_connections` | Gauge | *(none)* | Current number of concurrent active HTTP connections. |
| `ssvm_jwt_verification_total` | Counter | `algorithm` | Total successful JWT verifications classified by cryptographic algorithm (`RS256`, `HS256`). |
| `ssvm_public_form_submissions_total` | Counter | `endpoint`, `status` | Public admissions/enquiry form submissions with Cloudflare Turnstile status (`ACCEPTED`, `CAPTCHA_FAILED`, `SPAM_SUSPECTED`). |
| `ssvm_tenant_requests_total` | Counter | `schoolId` | Total requests processed per school tenant. Bound to active school UUIDs. |
| `ssvm_auth_attempts_total` | Counter | `method`, `result` | Total authentication attempts categorized by mechanism and outcome. |
| `ssvm_active_sessions_total` | Gauge | `role` | Number of currently active user sessions grouped by user role. |
| `ssvm_db_query_duration_seconds` | Histogram | `operation`, `model` | Database query execution duration in seconds. Buckets: `[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]`. |
| `ssvm_bullmq_job_duration_seconds` | Histogram | `queue`, `name`, `status` | BullMQ background worker job execution duration in seconds. Buckets: `[0.1, 0.5, 1, 5, 10, 30]`. |
| `ssvm_bullmq_queue_size` | Gauge | `queue` | Number of waiting/delayed jobs in BullMQ queues. |

---

## 3. Financial & Integration Metrics

| Metric Name | Type | Labels | Description / Help |
|---|:---:|---|---|
| `ssvm_payment_total` | Counter | `gateway`, `status` | Total payments processed by gateway (`razorpay`, `cash`) and result status (`success`, `failed`). |
| `ssvm_payment_processing_duration_seconds` | Histogram | `gateway`, `status` | Duration of payment transaction settlement. Buckets: `[0.1, 0.5, 1, 2, 5, 10]`. |
| `ssvm_payment_refunds_total` | Counter | `gateway`, `status` | Total refunds processed. |
| `ssvm_webhook_processing_total` | Counter | `gateway`, `status`, `event` | Total webhook callbacks processed with status (`success`, `error_signature`, etc.) and event type. |
| `ssvm_reconciliation_gaps_total` | Counter | *(none)* | Total detected discrepancies between payment gateway ledger and double-entry school accounts. |
| `ssvm_outbox_events_total` | Counter | `status` | Transactional outbox events processed (`PENDING`, `PUBLISHED`, `FAILED`). |
| `ssvm_outbox_dead_letters_total` | Counter | *(none)* | Total outbox events moved to dead-letter storage after exceeding retry limits. |

---

## 4. Security Metrics (Block M3 Invariants)

| Metric Name | Type | Labels | Description / Help |
|---|:---:|---|---|
| `ssvm_auth_failures_total` | Counter | `reason` | Authentication failures by failure cause (`invalid_credentials`, `user_not_found`, `account_locked`, `inactive_user`, `mfa_failed`, `invalid_token`). |
| `ssvm_account_lockouts_total` | Counter | *(none)* | Total security account lockouts triggered after consecutive failed attempts. |
| `ssvm_wrong_portal_denials_total` | Counter | *(none)* | Total access denials where an authenticated user attempts to reach an unauthorized portal. |
| `ssvm_csrf_failures_total` | Counter | *(none)* | Total CSRF verification failures on state-modifying requests. |
| `ssvm_rate_limit_hits_total` | Counter | `limiter` | Rate limiter throttles triggered (`general`, `auth`, `public`, `financial`). |
| `ssvm_webhook_signature_failures_total` | Counter | *(none)* | Webhook requests with invalid HMAC signatures. |
| `ssvm_rls_context_missing_total` | Counter | *(none)* | Tenant queries attempted without mandatory PostgreSQL RLS session context (`SET LOCAL app.current_school_id`). |
| `ssvm_support_sessions_active` | Gauge | *(none)* | Current number of active platform support sessions granted to Super Admins. |
| `ssvm_audit_events_total` | Counter | `action` | Total immutable audit logs generated (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `EXPORT`, `SUPPORT_GRANT`, `SUPPORT_REVOKE`). |

---

## 5. Node.js Runtime & Process Metrics (Default Collection)

Every default metric registered via `client.collectDefaultMetrics` carries the `ssvm_` prefix:
- `ssvm_process_cpu_user_seconds_total`
- `ssvm_process_cpu_system_seconds_total`
- `ssvm_process_cpu_seconds_total`
- `ssvm_process_start_time_seconds`
- `ssvm_process_resident_memory_bytes`
- `ssvm_nodejs_eventloop_lag_seconds`
- `ssvm_nodejs_eventloop_lag_min_seconds`
- `ssvm_nodejs_eventloop_lag_max_seconds`
- `ssvm_nodejs_eventloop_lag_mean_seconds`
- `ssvm_nodejs_eventloop_lag_stddev_seconds`
- `ssvm_nodejs_eventloop_lag_p50_seconds`
- `ssvm_nodejs_eventloop_lag_p90_seconds`
- `ssvm_nodejs_eventloop_lag_p99_seconds`
- `ssvm_nodejs_active_resources`
- `ssvm_nodejs_active_resources_total`
- `ssvm_nodejs_active_handles`
- `ssvm_nodejs_active_handles_total`
- `ssvm_nodejs_active_requests`
- `ssvm_nodejs_active_requests_total`
- `ssvm_nodejs_heap_size_total_bytes`
- `ssvm_nodejs_heap_size_used_bytes`
- `ssvm_nodejs_external_memory_bytes`
- `ssvm_nodejs_heap_space_size_total_bytes`
- `ssvm_nodejs_heap_space_size_used_bytes`
- `ssvm_nodejs_heap_space_size_available_bytes`
- `ssvm_nodejs_version_info`
- `ssvm_nodejs_gc_duration_seconds`

---

## 6. Verification Command

Run the mechanical metrics vocabulary validation script:
```bash
node scripts/check-metrics-vocabulary.cjs
```
This script fails with exit code 1 if any alert rule in `prometheus/alert.rules.yml` or panel expression in `grafana/dashboards/*.json` references a metric that is missing from `ssvm-backend/src/middleware/metrics.ts`.
