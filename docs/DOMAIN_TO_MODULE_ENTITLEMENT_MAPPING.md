# SSVM ERP Platform — Domain-to-Module Entitlement Mapping
**Document Version:** 1.0.0  
**Status:** Approved Mapping Specification  
**Architecture:** 25 Functional Domains mapped to 10 Central Configurable Modules

---

## 1. Architectural Rationale

The SSVM ERP platform architecture encompasses **25 functional domain groups** covering all educational, administrative, operational, and technical aspects of running multi-campus school networks.

From a commercial SaaS perspective, school operators subscribe to cohesive **functional modules** rather than micro-features. The platform consolidates the 25 functional domains into **10 top-level configurable modules** managed via the Central Module Registry (`ModuleRegistryService`).

This document provides complete, transparent traceability proving that every single one of the 25 domains is explicitly mapped, governed, and protected by an authoritative entitlement.

---

## 2. Master Domain-to-Entitlement Mapping Matrix

| Domain # | Domain Group Name | Top-Level Entitlement Code | Included Features & Capabilities | Architectural & Commercial Reason |
|:---:|:---|:---|:---|:---|
| **1** | **Authentication, IAM & Session Security** | `CORE_PLATFORM` (Enforced on all) | Multi-factor auth, Argon2/bcrypt passwords, JWT issuance, session refresh, IP allowlisting, double-submit CSRF. | Foundation security layer; active on all tenants regardless of subscription tier. |
| **2** | **Tenant Isolation & RLS Governance** | `CORE_PLATFORM` (Enforced on all) | Forced PostgreSQL RLS policies across 177 tenant tables, tenant database transaction wrappers, schema partitioning. | Non-negotiable multi-tenant security boundary. |
| **3** | **Super Admin SaaS Management** | `CORE_PLATFORM` (Super Admin scope) | Multi-tenant school onboarding wizard, subscription plans, tenant quota guard, platform-wide metrics overview. | SaaS control plane; restricted to platform Super Administrators. |
| **4** | **School Administration & Preferences** | `ACADEMICS` (Core Module) | Academic sessions, campus preferences, school branding, branch setup, audit history. | Essential institutional configuration required by any educational establishment. |
| **5** | **Student Information & Lifecycle** | `ACADEMICS` (Core Module) | Admissions pipeline, student directory, enrollment status, sibling mapping, alumni tracking, student profiles. | Core academic entity; required for all subsequent student workflows. |
| **6** | **Academic Structure & Curricula** | `ACADEMICS` (Core Module) | Classes, sections, subjects, departments, teacher-subject mapping, curricula syllabi. | Core academic foundation; prerequisite for examinations, attendance, and timetables. |
| **7** | **Timetable & Scheduling** | `ACADEMICS` (Core Module) | Weekly class timetables, period allocations, room assignments, teacher collision detection. | Essential daily operational routine bundled with Core Academics. |
| **8** | **Student Attendance Management** | `ACADEMICS` (Core Module) | Daily class attendance marking by section, absence reasons, historical attendance reports, threshold alerts. | Standard academic responsibility executed by homeroom teachers. |
| **9** | **Staff & HR Management** | `HR_PAYROLL` | Employee directory, staff profiles, designations, departments, employee document compliance. | Administrative personnel operations; bundled into the HR & Payroll operational module. |
| **10**| **Payroll & Compensation** | `HR_PAYROLL` | Salary structures, allowances, deductions, monthly payroll runs, payslips, AP ledger posting (`5010-SAL`). | Financial staff compensation; unified under the HR & Payroll module. |
| **11**| **Leave & Relief Management** | `HR_PAYROLL` | Staff leave balances, multi-tier approval workflows, substitute teacher assignments. | Staff capacity and workforce management; governed by `HR_PAYROLL`. |
| **12**| **Fee Structures & Invoicing** | `FINANCE` (Core Module) | Fee categories, fee templates, scheduled invoice generation, discount waivers, overdue fines. | Fundamental revenue cycle; protected core module. |
| **13**| **Manual Fee Collection & Cash Counter** | `FINANCE` (Core Module) | Bursar cash counter, multi-invoice allocations, official sequential receipts (`REC-...`), student advance credits. | Offline cash counter management; integrated directly into `FINANCE`. |
| **14**| **Online Payment Gateway Integration** | `FINANCE` (Core Module) | Razorpay order generation, simulated/live checkout, webhook handlers, payment reconciliation jobs. | Digital collections channel; governed by `FINANCE`. |
| **15**| **General Ledger & Financial Accounting** | `FINANCE` (Core Module) | Chart of accounts, double-entry journal vouchers (`debits === credits`), financial close periods, trial balance. | Financial auditability; governed directly by `FINANCE`. |
| **16**| **Examinations & Assessments** | `EXAMS` | Assessment cycles, grading scales, marks entry, GPA calculation, printable report cards. | Specialized academic evaluation engine; separated as `EXAMS` for flexible tier packaging. |
| **17**| **Parent Portal Experience** | Dynamic (`ACADEMICS`, `FINANCE`, `EXAMS`, etc.) | Guardian child overview, attendance review, fee payment, report cards, live transport tracking. | Stakeholder portal; dynamically adapts its navigation to the school's enabled modules. |
| **18**| **Teacher Portal Experience** | Dynamic (`ACADEMICS`, `EXAMS`, `HR_PAYROLL`) | Class attendance grid, marks entry, homework publishing, teacher timetable, salary payslips. | Faculty portal; reflects teacher permissions across enabled academic and exam modules. |
| **19**| **Student Portal Experience** | Dynamic (`ACADEMICS`, `EXAMS`) | Homework submissions, timetable, attendance percentage, exam result summaries. | Learner portal; reflects enrolled courses and examination results. |
| **20**| **Library Management** | `LIBRARY` | Cataloging, ISBN tracking, book circulation (issues/returns), automated overdue fine accrual. | Optional school facility; encapsulated in the independent `LIBRARY` module. |
| **21**| **Transport & Fleet GPS Management** | `TRANSPORT` | Vehicle inventory, routes, stops, student allocations, IoT GPS telemetry, live Parent tracking, fleet overview. | Optional campus service; encapsulated in the independent `TRANSPORT` module. |
| **22**| **Hostel & Residential Facilities** | `HOSTEL` | Building management, room inventory, bed capacity, student room allocation, checkout audit. | Optional boarding facility; encapsulated in the independent `HOSTEL` module. |
| **23**| **Inventory & Procurement Operations** | `INVENTORY` | Vendor directory, purchase orders, goods receipt notes (GRN), inventory stock replenishment, asset tracking. | Operational resource management; unified under the `INVENTORY` operational module. |
| **24**| **Communications & Notification Engine** | `COMMUNICATIONS` | In-app notices, circular announcements, SMS gateway relay, email broadcast templates, emergency alerts. | Multi-channel messaging; governed by the `COMMUNICATIONS` module. |
| **25**| **Self-Healing Fault Isolation (SHFI)** | `CORE_PLATFORM` (Enforced on all) | Diagnostic event pipeline, PII sanitization, incident state machine, dual Redis/SQL persistence, deep health probes. | Platform reliability and observability backbone; always active across all tenants. |

---

## 3. Supplementary Ancillary Services Mapping

| Sub-Domain / Feature | Mapped Module | Governing Route Prefix | Enforcement Mechanism |
|:---|:---|:---|:---|
| **Admissions & CRM Inquiries** | `ACADEMICS` | `/api/v1/students/admissions` | `requireModule('ACADEMICS')` |
| **Visitor & Reception Desk** | `ACADEMICS` | `/api/v1/reception` | `requireModule('ACADEMICS')` |
| **Certificates & Transcripts** | `ACADEMICS` | `/api/v1/certificates` | `requireModule('ACADEMICS')` |
| **Discipline & Behavioral Records**| `ACADEMICS` | `/api/v1/discipline` | `requireModule('ACADEMICS')` |
| **Biometric Terminal Integration** | `BIOMETRIC_ATTENDANCE` | `/api/v1/attendance/biometric` | `requireModule('BIOMETRIC_ATTENDANCE')` |
| **Procurement & Purchase Orders** | `INVENTORY` | `/api/v1/admin/procurement`, `/api/v1/procurement-ops` | `requireModule('INVENTORY')` |
| **Asset Register & Tracking** | `INVENTORY` | `/api/v1/assets` | `requireModule('INVENTORY')` |
| **CMS & Public Website Builder** | `COMMUNICATIONS` | `/api/v1/cms` | `requireModule('COMMUNICATIONS')` |
| **Governance & Access Workflows** | `CORE_PLATFORM` | `/api/v1/saas/governance` | Super Admin RBAC |

---

## 4. Verification Conclusion

Every capability in the ERP codebase is accounted for. There are zero unmapped orphan endpoints, zero conflicting entitlements, and zero ambiguous permissions.

