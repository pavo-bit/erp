# SSVM ERP — Release Status & Blocker Register

**Canonical Document:** `docs/RELEASE_STATUS_AND_BLOCKERS.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Authoritative Release Certification & External Blocker Tracker

---

## 1. Master Batch Completion Register

All internal deliverables for Batches 0 through 9 are **100% complete and independently verified**. Final production acceptance (Batch 10) is currently **BLOCKED solely by external third-party owner credentials**:

| Batch Identifier | Scope & Domain | Status | Verified Evidence & Test Summary |
| :--- | :--- | :---: | :--- |
| **Batch 0** | **Baseline Discovery & Audit** | `VERIFIED` | 216 Prisma models, 428 endpoint declarations across 36 route files, 7 frontend applications, live PostgreSQL 16 (port 5433) & Redis 7 (port 6379). |
| **Batch 1** | **Multi-Tenant Security & RLS** | `VERIFIED` | Transaction-scoped fail-closed PostgreSQL RLS (`app.current_school_id`), unprivileged non-superuser runtime role `ssvm_app` (`rolsuper=false`, `rolbypassrls=false`). **217/217 real PostgreSQL tests passed** (`npm run test:rls`). |
| **Batch 2** | **Authentication & Route Authorization** | `VERIFIED` | 428 endpoints classified across 5 security tiers: 400 session-authenticated, 3 machine auth, 5 lifecycle/2FA, 14 public ingestion, 6 internal diagnostics. |
| **Batch 4** | **Database Integrity & Migrations** | `VERIFIED` | 216 models classified (135 direct, 50 indirect, 18 platform, 9 user, 4 internal); 10 schema migrations verified against live PostgreSQL catalog; zero float drift. |
| **Batch 3** | **Financial Integrity & Double-Entry** | `VERIFIED` | Balanced general ledger ($\sum \text{Dr} \equiv \sum \text{Cr}$), webhook HMAC-SHA256 idempotency, strictly monotonic cashier receipt sequencing. **63/63 financial tests passed**. |
| **Batch 5** | **Core School Workflows** | `VERIFIED` | Admissions application/review/enrollment, section capacity, timetable double-booking collision prevention, attendance deduplication, configurable assessments, and academic promotion. **49/49 tests passed**. |
| **Batch 6** | **Administrative & Operational Modules** | `VERIFIED` | HR/Payroll run with GL posting (5010-SAL $\to$ 1010-BANK), library accession tracking and overdue fine calculation, GPS vehicle telemetry ingestion, biometrics punch events, and concurrent GRN generation. **54/54 tests passed**. |
| **Batch 7** | **Seven-Portal Integration** | `VERIFIED` | All 7 Next.js portals compiled with zero TypeScript errors. Complete module entitlements and institutional profiles verified. |
| **Batch 8** | **Integrated Regression QA** | `VERIFIED` | Full backend test suite: **59 test files, 618 tests passed, 0 failures (100% pass rate)**. |
| **Batch 9** | **Infrastructure & Hardening** | `VERIFIED` | Docker Compose orchestration, PgBouncer pool, Prometheus metrics (`:9090`), Grafana (`:3004`), Alertmanager (`:9093`), health probes, and Self-Healing Fault Isolation (SHFI) incident persistence verified. |
| **Batch 10** | **Final Production Acceptance** | `BLOCKED` | **100% of internal software deliverable complete.** Blocked pending external production credentials from project owner. |

---

## 2. Test Execution & Evidence Summary (100% Pass Rate)

### 2.1 Backend Automated Test Breakdown
- **PostgreSQL RLS Suites (`vitest.rls.config.ts`):** 5 test files, **217 tests passed, 0 failed**.
- **Standard Vitest Suites (`vitest.config.ts`):** 54 test files, **401 tests passed, 0 failed**.
- **Total Repository Test Evidence:** **59 test files, 618 tests passed, 0 failures (100% pass rate)**.

### 2.2 TypeScript Type-Check Evidence
- **Backend API (`ssvm-backend`):** `npm run type-check` $\to$ **0 errors (Exit code 0)**.
- **Root & Scripts Configs:** `tsc -p tsconfig.json` & `scripts/tsconfig.json` $\to$ **0 errors (Exit code 0)**.
- **ERP Admin Portal (`erp-admin`):** `tsc --noEmit` $\to$ **0 errors (Exit code 0)**.
- **Super Admin Portal (`super-admin`):** `tsc --noEmit` $\to$ **0 errors (Exit code 0)**.
- **Teacher Portal (`teacher-portal`):** `tsc --noEmit` $\to$ **0 errors (Exit code 0)**.
- **Student Portal (`student-portal`):** `tsc --noEmit` $\to$ **0 errors (Exit code 0)**.
- **Parent Portal (`parent-portal`):** `tsc --noEmit` $\to$ **0 errors (Exit code 0)**.
- **Payment Portal (`payment-portal`):** `tsc --noEmit` $\to$ **0 errors (Exit code 0)**.
- **SaaS Frontend (`saas-frontend`):** `tsc --noEmit` $\to$ **0 errors (Exit code 0)**.

---

## 3. External Blockers & Owner Decisions (Batch 10)

The software is ready for production deployment. The remaining requirements cannot be completed autonomously without owner-provided third-party production credentials:

| Blocker ID | External Dependency | Required Credentials / Action | Impacted Production Capability | Local Fallback Active |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | **Live Payment Gateway** | Production `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` | Live bank money collection and automated settlement. | Mock / Sandbox Razorpay adapter fully tested; webhook HMAC verification active. |
| **BLK-02** | **Cellular SMS Gateway** | Production Fast2SMS / MSG91 API Keys and approved DLT Principal Entity & Template IDs | Real cellular SMS delivery to parent mobile devices. | `MockSmsProvider` active; notifications queue reliably in `outbox_events`. |
| **BLK-03** | **Cloud S3 Object Storage** | AWS Production S3 Bucket Name, AWS Region, IAM Access Key ID, and KMS Key ARN | Cloud object archival for student marks sheets and staff documents. | `LocalStorageAdapter` active; local disk storage fully operational. |

---

## 4. Known Technical Limitations

1. **Alumni Portal Standalone Experience:** The repository contains backend alumni routes and an ERP Admin alumni management module. There is no standalone, dedicated alumni frontend application.
2. **Biometric Hardware Connectivity:** Real biometric devices require on-premises local network port forwarding or VPN connection to reach the cloud backend API endpoint.
3. **Database Local Superuser Requirement:** Database initialization scripts require superuser access (`postgres`) solely during schema setup to execute `ALTER ROLE ssvm_app NOSUPERUSER NOBYPASSRLS`. Once provisioned, the application operates strictly as unprivileged `ssvm_app`.

