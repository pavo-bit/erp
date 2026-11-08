# Phase 11 — Functional Gap Register

**Audit Date:** November 8, 2026  
**Status:** Living Engineering Gap & Handover Register  
**Auditor:** Principal Software Architect & QA Lead  

---

## 1. Defect Classification Standard

- **P0 (Critical):** Data leaks, cross-tenant violations, financial corruption, or destructive defects. Blocks any deployment.
- **P1 (High):** Broken core business behavior. Must be fixed before controlled pilot.
- **P2 (Medium):** Architectural hardening, high-availability scaling, or operational edge cases. Gated for Phase 12 or public production.
- **P3 (Low):** Minor usability or cosmetic improvements.

---

## 2. Priority 0 (P0) — Critical Integrity Issues

**CURRENT STATUS: ZERO (0) OPEN P0 ISSUES**

All potential P0 risks evaluated during Phase 11 have been resolved:
- **Tenant Row Level Security (RLS):** Verified enabled and forced across all 180 classified tenant tables in `ssvm_test` and `ssvm_platform`.
- **Financial Balance:** Verified that all cash collections, advance credits, invoice settlements, refunds, payroll, and procurement transactions maintain `SUM(debits) === SUM(credits)`.
- **Cross-Tenant Security:** Negative authorization tests confirm that School A users cannot access School B data.

---

## 3. Priority 1 (P1) — Core Business Workflow Defects

**CURRENT STATUS: ZERO (0) OPEN P1 ISSUES**

The single test failure identified during Phase 11 was triaged, fixed, and verified:
- **Resolved DEF-001:** Timezone rollover mismatch in `cash-collection.test.ts`. Fixed by switching from UTC ISO date string to local calendar components (`now.getFullYear()`, `now.getMonth() + 1`, `now.getDate()`). Test suite pass rate is now 100% (16/16 tasks passing).

---

## 4. Priority 2 (P2) — Operational Hardening & Architecture Items (Reserved for Phase 12)

The following items are acceptable for a single-instance controlled school pilot, but represent technical requirements for Phase 12 (Operational Hardening, SRE & Production Readiness):

| Issue ID | Domain | Title | Technical Impact | Phase 11 Pilot Status | Phase 12 Handover Action |
|---|---|---|---|---|---|
| **P2-001** | Architecture | SHFI Persistence & Restart Durability | In-memory 2,000-event ring buffer and `incidentMap` do not persist across process restarts or multiple load-balanced instances. | **ACCEPTABLE FOR PILOT** (Single-instance pilot runs in single memory space). | Migrate SHFI events and incidents to dedicated PostgreSQL tables (`diagnostic_events`, `platform_incidents`) or Redis Streams. |
| **P2-002** | Disaster Recovery | Complete Schema Coverage for DR Test | `scripts/dr-test.js` restores 205 tables from the baseline migration, but does not yet include the 3 cash-collection tables (`fee_receipts`, `payment_allocations`, `student_advance_credits`). | **ACCEPTABLE FOR PILOT** (All 208 tables present in live DB). | Update `dr-test.js` to execute both baseline and cash-collection migrations during isolated restore verification. |
| **P2-003** | Disaster Recovery | Continuous WAL Archiving for Sub-15m RPO | 6.45s RTO is a local DDL restore benchmark; operational RPO requires continuous Write-Ahead Log (WAL) streaming. | **ACCEPTABLE FOR PILOT** (Daily automated snapshots suffice for pilot). | Design and configure `pgBackRest` or automated WAL segment shipping to cold object storage. |
| **P2-004** | IoT / Fleet | Hardware GPS Device Authentication | Telemetry ingestion endpoint (`/api/v1/admin/transport/vehicles/:id/telemetry`) requires Admin JWT bearer token; physical bus trackers require device API keys (`X-Device-Token`) or TCP protocols. | **ACCEPTABLE FOR PILOT** (Simulated admin telemetry posting active). | Implement dedicated device authentication middleware and Redis geospatial storage (`GEOADD`/`GEORADIUS`). |
| **P2-005** | Integrations | Third-Party Production Cloud Credentials | Live Razorpay payments, AWS S3 document storage, and Twilio SMS dispatch are blocked pending production client credentials. | **BLOCKED_EXTERNAL** (Offline cash collection, local disk, and in-app alerts active). | Provide production environment variable configuration template and validation script for deployment team. |

---

## 5. Priority 3 (P3) — Minor Enhancements & Documentation

| Issue ID | Domain | Title | Description | Status |
|---|---|---|---|---|
| **P3-001** | Portal Scripts | Dedicated Portal `typecheck` Script | Portals currently run typechecks via `npx tsc --noEmit`. Adding `"typecheck": "tsc --noEmit"` to each `package.json` improves CI consistency. | Registered for Phase 12. |
| **P3-002** | Telemetry UI | Real-Time Bus Map Widget | Parent portal bus tracking page displays coordinates; embedding a Leaflet/OpenStreetMap interactive widget will improve parent UX. | Enhancement backlog. |
