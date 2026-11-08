# Phase 12 Technical Debt & Risk Register
**Project:** Multi-School SaaS School ERP  
**Working Branch:** `lane/d-portals`  
**Review Phase:** Phase 12 of 13  

---

## 1. Resolved Technical Debt & Hardening Accomplishments in Phase 12

| Debt / Gap ID | Description | Resolution in Phase 12 | Status |
| :--- | :--- | :--- | :--- |
| **DEBT-12-01** | SHFI diagnostic events and active incidents were stored purely in-memory and lost across container restarts. | Added dual persistence to Redis hash/list and PostgreSQL `system_logs` via `log_pre_tenant_system_log`. Added automatic startup hydration in `app.ts`. | **RESOLVED** |
| **DEBT-12-02** | Disaster recovery script `scripts/dr-test.js` only checked 205 tables, omitting Phase 2 cash collection tables. | Upgraded `dr-test.js` to dump and restore all 208 physical tables, including synthetic assertions on `fee_receipts`, `payment_allocations`, and `student_advance_credits`. | **RESOLVED** |
| **DEBT-12-03** | Lack of Point-In-Time Recovery (PITR) test harness. | Built `scripts/wal-pitr-test.js` demonstrating recovery to a target LSN/timestamp and exclusion of corrupt transactions. | **RESOLVED** |
| **DEBT-12-04** | Transport vehicle telemetry endpoint required staff JWT, preventing physical bus GPS hardware units from communicating. | Implemented `X-Device-Token` HMAC-SHA256 authentication, bound validation, drift check, and Redis caching. | **RESOLVED** |
| **DEBT-12-05** | No fail-closed CLI validator for deployment environments. | Created `scripts/validate-env.js` covering `development`, `test`, `pilot`, and `production` with entropy checks. | **RESOLVED** |
| **DEBT-12-06** | Absence of operational runbooks for incident commanders and SREs. | Authored 6 production runbooks in `docs/runbooks/`. | **RESOLVED** |

---

## 2. Residual Technical Debt & Platform Risks Handover to Phase 13

| Risk ID | Category | Description | Severity | Mitigation in Phase 13 / Pilot |
| :--- | :--- | :--- | :--- | :--- |
| **RISK-13-01** | External Services | SMS / WhatsApp notifications use local mock fallback when credentials are unconfigured. | Low | Configure verified Twilio / MSG91 credentials during school pilot onboarding. |
| **RISK-13-02** | Cloud Storage | Document uploads currently use local filesystem (`./uploads`) rather than AWS S3 / Cloudflare R2. | Low | Production deployment runbook documents S3 bucket configuration via `StorageService`. |
| **RISK-13-03** | Payment Gateway | Razorpay webhook keys use test sandbox (`rzp_test_*`) for local verification. | Low | Live Razorpay merchant keys to be injected at pilot launch; verified fail-closed by `validate-env.js`. |
| **RISK-13-04** | High Availability | Database runs on a single PostgreSQL container without streaming standby replica. | Medium | Pilot runs single-node with WAL archiving; streaming replication recommended for multi-school production. |

---

## 3. Risk Acceptance & Handover Sign-Off
All residual items are zero-investment compatible, documented in operational runbooks, and ready for pilot certification in Phase 13.

