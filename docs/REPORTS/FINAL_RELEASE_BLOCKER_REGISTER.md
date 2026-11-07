# Final Release Blocker & Prerequisite Register: SSVM ERP

**Document Version:** 1.0.0  
**Audit Timestamp:** 2026-11-07T23:36:00+05:30  
**Status:** Pre-Release Gate Tracking  
**Auditor:** Principal Release & Platform Architect  

---

## 1. Blocker Severity Classification Standard

- **CRITICAL (P0):** Blocks pilot and production deployment. Must be resolved before any user traffic.
- **HIGH (P1):** Permissible in controlled pilot with documented fallbacks; strictly blocks public production.
- **MEDIUM (P2):** Operational optimization; recommended before full multi-tenant scaling.
- **LOW (P3):** Non-blocking cosmetic or minor documentation enhancement.

---

## 2. Active Blocker & Prerequisite Matrix

| ID | Severity | Domain | Blocker Title | Affected Scope | Owner | Resolution Strategy | Required Verification | Status |
|---|---|---|---|---|---|---|---|---|
| **BLK-001** | **HIGH (P1)** | Finance | Live Razorpay Credentials & Webhook Signing Secret | Public online fee checkout via payment portal | School Finance Owner / DevOps | Provision live Razorpay Merchant Account; configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in production `.env`. | Execute live ₹1 test payment and verify automatic webhook receipt generation in PostgreSQL. | **PENDING CREDENTIALS** (Offline cash/counter collection active for pilot) |
| **BLK-002** | **HIGH (P1)** | Storage | Cloud Object Storage Bucket & CDN Binding | Student/staff document uploads, report card PDF storage | Platform Architect / Cloud Ops | Configure AWS S3 or Cloudflare R2 bucket credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`). | Verify document upload, presigned URL generation, and deletion through `StorageService.ts`. | **PENDING CREDENTIALS** (Local disk storage active for pilot) |
| **BLK-003** | **HIGH (P1)** | Notifications | Commercial SMS Gateway & DLT Registration | Emergency SMS alerts, Parent OTP verification | School Admin / Telecommunications Lead | Procure Twilio or Gupshup SMS credits; register Indian DLT Principal Entity, Sender Headers, and SMS templates. | Send live test OTP to pilot mobile number and verify delivery status in `communicationLog`. | **PENDING CREDENTIALS** (In-app notifications & simulated outbox active for pilot) |
| **BLK-004** | **HIGH (P1)** | Communications | Production SMTP / Transactional Email Service | Automated fee receipt PDF emails, password reset links | DevOps Engineer | Configure Amazon SES or SendGrid with verified SPF, DKIM, and DMARC DNS records. | Trigger password reset email from `teacher-portal` and verify inbox delivery without spam flagging. | **PENDING CREDENTIALS** (Simulated email logging active for pilot) |
| **BLK-005** | **HIGH (P1)** | Security | Multi-Tenant Wildcard TLS Certificate (`*.ssvm.edu`) | Tenant subdomain routing and HTTPS termination | Infrastructure Engineer | Procure and bind Let's Encrypt or Cloudflare wildcard SSL certificate to the production reverse proxy. | Verify HTTPS handshake on `school1.ssvm.edu` and `school2.ssvm.edu` with A+ SSL Labs rating. | **PENDING DEPLOYMENT** (Localhost / single-domain IP active for pilot) |
| **BLK-006** | **MEDIUM (P2)**| Architecture | Multi-Instance SHFI Persistence | Distributed incident monitoring across multiple backend nodes | Platform Architect | Migrate SHFI in-memory ring buffer and incident map to dedicated PostgreSQL tables (`diagnostic_events`, `platform_incidents`) or Redis Streams. | Spin up 2 concurrent backend instances and verify incident created on Node 1 is visible on Node 2. | **PILOT ACCEPTABLE** (In-memory ring buffer active for single-instance pilot) |
| **BLK-007** | **MEDIUM (P2)**| IoT / Fleet | Physical GPS Hardware Ingestion Protocol | Real-time school bus tracking from on-vehicle hardware | Fleet Ops / Embedded Systems Lead | Implement TCP/UDP gateway or static device API key (`X-Device-Token`) authentication for hardware GPS trackers. | Stream hardware GPS packets into `/api/v1/transport/vehicles/:id/telemetry` without user JWT session. | **PILOT ACCEPTABLE** (Admin telemetry posting active for pilot testing) |
| **BLK-008** | **MEDIUM (P2)**| Disaster Recovery | Continuous WAL Archiving for Sub-15m RPO | Point-in-time recovery during catastrophic storage failure | Database Reliability Engineer (DBRE) | Configure `pgBackRest` or cloud RDS automated backup with continuous PostgreSQL WAL segment archiving. | Execute point-in-time recovery to a timestamp 5 minutes prior to simulate zero data loss. | **PILOT ACCEPTABLE** (Daily automated snapshots verified for pilot) |

---

## 3. Pilot Scope vs. Production Gate Sign-Off

### Controlled Pilot Sign-Off (APPROVED)
- **Approved Pilot Environment:** Single school / campus deployment on dedicated VM or on-premises server.
- **Active Operational Modules:**
  - ERP Admin Fee Collection Desk (Cash, Cheque, Counter UPI with official PDF receipts).
  - Academic Gradebook, Timetable collision detection, and Report Card compilation.
  - Staff records and Payroll salary ledger disbursement.
  - Procurement purchase requests, POs, and Goods Receipts (GRN) with AP ledger posting.
  - Library book loans and automated fine invoice generation.
  - System Health & Incident Management Centre (SHFI) with deep health probes.
  - Automated cold restore disaster recovery harness.
- **Active Fallbacks:** Offline fee collection replaces gateway; local disk replaces S3; in-app alerts replace live SMS.

### Full Public Production Gate (BLOCKED PENDING CREDENTIALS)
- Transitioning from Controlled Pilot to Public Multi-Tenant SaaS requires closing **BLK-001 through BLK-005** by populating production environment variables and binding TLS certificates.
