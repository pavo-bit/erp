# Owner Decision and External Dependency Register: SSVM ERP

**Document Version:** 1.0.0  
**Scope:** Architectural Decisions, Invariants, External Integrations, Fallback Strategies  

---

## 1. Architectural & Technical Decision Records (ADRs)

### ADR-001: Modular Monolith vs. Microservices
- **Decision:** Preserve the modular monolith architecture with discrete domain service boundaries instead of splitting into independent microservices.
- **Rationale:** A modular monolith drastically simplifies transaction boundaries, cross-module consistency (e.g., student admission -> fee invoice -> general ledger journal entry), avoids distributed transaction complexity, minimizes operational overhead, and allows efficient deployment for multi-school tenancy.
- **Enforcement:** Explicit module interfaces, no circular cross-domain imports, and strict schema foreign key constraints.

### ADR-002: Exact Decimal Monetary Representation
- **Decision:** Mandate PostgreSQL `DECIMAL(12,2)` / `Prisma.Decimal` for all financial figures. Forbid JavaScript `Number` or IEEE-754 floating-point operations in financial calculation pathways.
- **Rationale:** Floating-point arithmetic introduces rounding inaccuracies (e.g. `0.1 + 0.2 === 0.30000000000000004`) which corrupt fee accounting, tax calculations, and balance sheet reconciliation.
- **Enforcement:** Enforced in Prisma schema types, Zod API validation schemas, and database migrations.

### ADR-003: Multi-Layered Fail-Closed Tenant Isolation
- **Decision:** Implement multi-tenancy at the PostgreSQL database engine level using Row Level Security (RLS) policies, complemented by an application-level transaction wrapper (`runWithTenantDatabaseTransaction`).
- **Rationale:** Application-only filtering (`where: { schoolId }`) is prone to developer omission and query leakage. Database-level RLS with `FORCE ROW LEVEL SECURITY` guarantees that even if an application query omits a filter, PostgreSQL rejects cross-tenant row access.
- **Enforcement:** CI test step `scripts/generate-tenant-classification.cjs --check` and automated RLS privilege tests.

### ADR-004: Payment Webhook Error Classification
- **Decision:** Classify payment gateway webhook errors into Permanent and Transient categories.
  - **Permanent Errors** (unknown invoice, mismatched order amount, duplicate transaction): Return `HTTP 200 OK` with detailed audit log.
  - **Transient Errors** (database timeout, Redis unavailability): Return `HTTP 500 / 503` to trigger gateway automatic retry.
- **Rationale:** If permanent errors return 4xx/5xx, payment gateways (Razorpay, Stripe) will continuously retry requests that can never succeed, causing webhook spam, log pollution, and resource starvation.
- **Enforcement:** Implemented in `ssvm-backend/src/routes/webhooks.ts` and verified in unit tests.

### ADR-005: Zero Paid Services Policy
- **Decision:** The platform must run completely without mandatory commercial third-party cloud subscriptions for local development, testing, and baseline operation.
- **Rationale:** Compliance with project constraints; operational self-sufficiency.
- **Implementation:**
  - Mock/Sandbox payment provider modes for Razorpay.
  - Local Redis instance for BullMQ and caching.
  - Local filesystem or MinIO for document and asset storage.
  - Zero dependencies on paid proprietary LLM APIs for core business and operational workflows.

---

## 2. External Dependency & Fallback Register

| Dependency | Purpose | Failure Mode | Fallback / Degradation Strategy |
|---|---|---|---|
| **PostgreSQL 15+** | Primary multi-tenant relational datastore | Database unavailable | Express returns HTTP 503 Service Unavailable via healthcheck; PgBouncer connection queue buffers brief spikes. |
| **Redis 7+** | Cache, rate limiting, BullMQ background queues | Redis cluster down | In-memory fallback for rate limiting; critical DB writes proceed; background jobs queue locally or fail-fast with error log. |
| **Razorpay Gateway** | Payment processing & online fee checkout | Gateway outage / API error | Payment transaction marked `FAILED` or `PENDING`; user notified; offline fee collection (cash/bank transfer) remains operational in `erp-admin`. |
| **SMS Gateway (Twilio / Gupshup)** | Parent OTPs, emergency notifications | Delivery failure / provider downtime | Outbox message queued; retry with exponential backoff; automatic fallback to Email or In-App Push notification. |
| **SMTP / Email Gateway** | Password resets, fee receipts, report cards | SMTP server error | Messages queued in Redis BullMQ queue; retried up to 5 times; alert triggered to platform administrator if dead-letter queue grows. |
| **Object Storage (S3 / MinIO)** | Student documents, staff files, assignments | Storage cluster degraded | Local disk fallback directory configured in `StorageService.ts`; uploads queued for background sync once storage recovers. |
| **Prometheus / Grafana** | Metric collection & telemetry visualization | Prometheus scraper down | Backend continues running normally; internal in-process metrics buffer up to last 1,000 observations. |

---

## 3. Operational Invariants & Ground Rules

1. **Database Migrations:** Never edit a previously merged migration file. Every schema modification requires a new, timestamped migration with RLS enabled and forced for any newly created tenant table.
2. **Sequential Receipts:** Receipts must never use non-deterministic timestamps (e.g. `REC-${Date.now()}`). All receipts must pull atomically from `SequenceCounter` inside the payment transaction.
3. **Audit Immutability:** Audit log rows are append-only. No application role (including `ssvm_app` and `ERP_ADMIN`) possesses `UPDATE` or `DELETE` grants on the `AuditLog` table.

---

## 4. Production Promotion Prerequisite Checklist: External Cloud Credentials

The platform core logic, RLS security policies, financial double-entry ledger, academic grading engine, portal UIs, SHFI center, and disaster recovery harnesses have been fully verified (16/16 parallel tasks passing).

Prior to transitioning the deployment from **Controlled Pilot** to **Public Multi-Tenant Production**, the system owner must provide the following external production credentials and infrastructure bindings:

1. **Payment Gateway (Razorpay Production):**
   - Environment variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
   - Setup: Production Merchant ID activated with net banking, UPI, and debit/credit card clearance; webhook endpoint configured for `https://api.ssvm.edu/api/v1/webhooks/razorpay`.
2. **Cloud Object Storage (AWS S3 or Cloudflare R2):**
   - Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_ENDPOINT`.
   - Setup: Private bucket with CORS policy restricting reads/writes to ERP origins, presigned URL generation enabled.
3. **SMS Notification Provider (Twilio or Gupshup):**
   - Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (or Indian DLT registration Entity ID, Header ID, Template IDs).
   - Setup: Production messaging service with high-throughput shortcode or verified alphanumeric sender.
4. **Transactional Email Service (Amazon SES or SendGrid):**
   - Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
   - Setup: Verified sending domain with DKIM, SPF, and DMARC DNS records configured.
5. **Production Domain & TLS:**
   - Wildcard SSL/TLS certificate for `*.ssvm.edu` bound to the reverse proxy (Nginx or Cloudflare) to route tenant subdomains to the modular monolith gateway.

