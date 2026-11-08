# SSVM ERP Platform — 80% Verified Completion Program Baseline
**Document Version:** 1.0.0  
**Status:** Frozen Baseline  
**Environment:** Local Docker-First Multi-School SaaS Platform  
**Target Repository:** `pavo-bit/erp`  
**Working Branch:** `lane/d-portals`

---

## 1. Executive Summary

This document establishes the frozen architectural, functional, and database baseline for the Multi-School SaaS School ERP under the **80% Verified Completion Program**. 

All architectural boundaries, tenant security enforcements, database schema contracts, and domain groups are reconciled and verified against the actual local environment.

---

## 2. Authoritative Schema & Tenancy Reconciliation

Following an exhaustive audit of `prisma/schema.prisma` and the physical PostgreSQL instance (`ssvm_platform`), the authoritative platform counts are verified:

| Dimension | Authoritative Count | Description |
|:---|:---:|:---|
| **Prisma Models** | **211** | Defined in `ssvm-backend/prisma/schema.prisma` across all 25 modules. |
| **Physical PostgreSQL Tables** | **208** | In `ssvm_platform` (205 baseline restored tables + 3 Phase 2 cash collection tables: `fee_receipts`, `payment_allocations`, `student_advance_credits`). |
| **Tenant-Classified Models** | **180** | Validated via `generate-tenant-classification.cjs --check` (130 direct tenant tables + 50 indirect relation tables). |
| **Forced Row-Level Security (RLS)** | **177** | Every tenant-partitioned physical table in PostgreSQL has both `relrowsecurity = true` and `relforcerowsecurity = true`. |
| **Global / Platform Tables** | **31** | $208 - 177 = 31$, exactly matching the 31 system-wide global models (e.g., `schools`, `subscriptions`, `system_logs`, `feature_flags`). |

---

## 3. The 25 Frozen Functional Domain Groups

The complete ERP business scope is partitioned into 25 functional domain groups:

1. **Authentication, IAM & Session Security:** Multi-factor authentication, Argon2/bcrypt hashing, JWT issuing and revocation, IP allowlisting.
2. **Tenant Isolation & RLS Governance:** Multi-tenant RLS policies, tenant context propagation (`x-tenant-id`, `x-school-id`), transaction security wrappers.
3. **Super Admin SaaS Management:** School registration, provisioning, subscription plans, tenant suspension, global telemetry.
4. **School Administration & Configuration:** Academic sessions, branches, campus preferences, role management, audit logging.
5. **Student Information & Lifecycle:** Admission pipeline, enrollment, student profiles, sibling links, student transfers, alumni tracking.
6. **Academic Structure & Curricula:** Classes, sections, subjects, academic years, department mapping, course allocation.
7. **Timetable & Scheduling:** Class schedules, room allocations, teacher timetables, conflict detection.
8. **Student Attendance Management:** Daily section attendance, leave requests, historical attendance trends, threshold alerts.
9. **Staff & HR Management:** Employee onboarding, designations, departments, documents, staff attendance tracking.
10. **Payroll & Compensation:** Salary structures, earnings, deductions, monthly pay runs, payslip generation.
11. **Leave & Relief Management:** Staff leave balances, multi-tier approvals, substitute teacher assignment.
12. **Fee Structures & Invoicing:** Fee categories, discount templates, scheduled invoice generation, late fines.
13. **Manual Fee Collection & Cash Management:** Offline cash counter, receipt numbering, invoice allocation, advance credits, cash drawer reconciliation.
14. **Online Payment Gateway Integration:** Payment orders, webhook verification, reconciliation jobs, gateway timeout recovery.
15. **General Ledger & Financial Accounting:** Double-entry journal entries, chart of accounts, debit/credit balancing, trial balance.
16. **Examinations & Assessments:** Assessment cycles, grade scales, marks entry, class GPA, report card generation.
17. **Parent Portal Experience:** Child overview, attendance review, fee payment, report cards, live bus tracking.
18. **Teacher Portal Experience:** Class attendance marking, assignment publishing, marks entry, timetable view.
19. **Student Portal Experience:** Timetable, assignments, attendance percentage, fee history, notifications.
20. **Library Management:** Cataloging, ISBN tracking, book circulation (check-in/out), overdue fines, reservations.
21. **Transport & Fleet GPS Management:** Vehicle inventory, routes, pickup stops, student allocation, IoT telemetry ingestion.
22. **Hostel & Residential Facilities:** Building management, rooms, bed capacity, student room allocation, checkout.
23. **Inventory & Procurement Operations:** Vendor directory, purchase orders, goods receipt notes, stock replenishment, asset tracking.
24. **Communications & Notification Engine:** SMS alerts, email delivery, in-app notifications, push channels, emergency broadcasts.
25. **Self-Healing Fault Isolation (SHFI) & Observability:** Diagnostic event ingestion, incident triage state machine, Prometheus metrics, dual Redis/SQL durability.

---

## 4. Operational Baselines & SLA Targets

- **Tenant Isolation:** Zero cross-tenant data leakage across all 15 boundary assertions.
- **Disaster Recovery:** Full physical dump and schema restore RTO < 15 seconds, RPO < 1 second.
- **Point-in-Time Recovery (PITR):** Continuous WAL archiving, restore RTO < 1 second, RPO < 2 seconds.
- **Module Authorization:** Fail-closed HTTP 403 `MODULE_DISABLED` on direct route access when unentitled.
- **Hardware Integration:** Standardized simulator contracts for IoT GPS (`X-Device-Token`) and Biometric Terminals (`BLOCKED_EXTERNAL`).

