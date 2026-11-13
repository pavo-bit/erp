# SSVM ERP — Sidebar Navigation & Central Module Mapping Audit

**Canonical Document:** `docs/SIDEBAR_MODULE_MAPPING_AUDIT.md`  
**Working Repository:** `pavo-bit/erp`  
**Branch:** `lane/d-portals`  
**Author:** Principal Frontend Architect & Multi-Tenant Integration Lead  
**Audit Date:** 13 November 2026  
**Execution Stage:** Stage A (Central Module Contract Audit)

---

## 1. Executive Summary & Objective

This audit establishes the single authoritative contract bridging the **SSVM ERP Central Module Registry** (`ssvm-backend/src/services/module-registry.service.ts`), backend authorization guards (`moduleGuard.ts`), and the frontend navigation structures across:
1. `erp-admin` — School ERP Administrator Portal (Port 3000 / 3005)
2. `super-admin` — Platform SaaS Command Center & Multi-Tenant Portal (Port 3001)

### Core Architectural Decisions:
1. **Single Source of Truth:** `CENTRAL_MODULE_REGISTRY` in `ssvm-backend/src/services/module-registry.service.ts` is the sole source of module definitions, entitlement rules, categories, dependencies, and route protections.
2. **Fail-Closed Guarantee:**
   - Any module code not present in the central registry fails closed (hidden).
   - Any loading state or API failure (`GET /api/v1/schools/me/modules`) fails closed for all optional modules. Core modules remain accessible to ensure operational continuity.
3. **No Phantom Module Codes:** Legacy codes previously hardcoded in `erp-admin` (`ADMISSIONS`, `ATTENDANCE`, `TIMETABLE`, `ASSIGNMENTS`, `FEES`, `HR`, `ASSETS`, `RECEPTION`, `DISCIPLINE`, `ALUMNI`, `ANALYTICS`) are normalized to their canonical parent modules (`ACADEMICS`, `FINANCE`, `HR_PAYROLL`, `INVENTORY`, etc.) or treated as core functionality.

---

## 2. Central Module Registry Catalog

| Module ID / Code | Display Name | Category | Default | Core? | Dependencies | Backend Route Prefixes | Target Portals |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ACADEMICS` | Core Academics & Student Lifecycle | `CORE_ACADEMIC` | `true` | **YES** | None | `/api/v1/students`, `/api/v1/classes`, `/api/v1/academic`, `/api/v1/timetable` | `ERP_ADMIN`, `TEACHER`, `PARENT`, `STUDENT` |
| `FINANCE` | Fee Billing & Financial Accounting | `FINANCE` | `true` | **YES** | `['ACADEMICS']` | `/api/v1/finance`, `/api/v1/invoices`, `/api/v1/payments` | `ERP_ADMIN`, `PARENT`, `STUDENT` |
| `EXAMS` | Examinations, Grading & Report Cards | `CORE_ACADEMIC` | `true` | NO | `['ACADEMICS']` | `/api/v1/exams`, `/api/v1/results` | `ERP_ADMIN`, `TEACHER`, `PARENT`, `STUDENT` |
| `TRANSPORT` | Transport & Real-Time Bus Fleet GPS | `OPERATIONS` | `false` | NO | `['ACADEMICS']` | `/api/v1/transport`, `/api/v1/admin/transport` | `ERP_ADMIN`, `PARENT`, `STUDENT` |
| `LIBRARY` | Library & Asset Circulation | `OPERATIONS` | `false` | NO | `['ACADEMICS']` | `/api/v1/library` | `ERP_ADMIN`, `TEACHER`, `STUDENT` |
| `HOSTEL` | Hostel & Dormitory Management | `OPERATIONS` | `false` | NO | `['ACADEMICS']` | `/api/v1/admin/ancillary/hostel`, `/api/v1/ancillary` | `ERP_ADMIN`, `PARENT`, `STUDENT` |
| `HR_PAYROLL` | Human Resources & Staff Payroll | `OPERATIONS` | `true` | NO | `['FINANCE']` | `/api/v1/hr`, `/api/v1/admin/payroll` | `ERP_ADMIN`, `TEACHER` |
| `INVENTORY` | Procurement, POs & Stock Inventory | `OPERATIONS` | `false` | NO | `['FINANCE']` | `/api/v1/inventory`, `/api/v1/admin/inventory`, `/api/v1/admin/procurement` | `ERP_ADMIN` |
| `COMMUNICATIONS` | Notices, Messages & Notifications | `COMMUNICATION` | `true` | NO | None | `/api/v1/notices`, `/api/v1/messages`, `/api/v1/communications` | `ERP_ADMIN`, `TEACHER`, `PARENT`, `STUDENT` |
| `BIOMETRIC_ATTENDANCE` | Biometric & Fingerprint Staff Attendance | `SECURITY` | `false` | NO | `['HR_PAYROLL']` | `/api/v1/attendance/biometric` | `ERP_ADMIN` |

---

## 3. Comprehensive Navigation Item to Module Code Mapping

### 3.1 `erp-admin` Navigation Architecture (Ten Canonical Groups)

| # | Group / Item Label | Target Route (`href`) | Canonical Registry Code | Portal | Entitlement & Visibility Rule | Rationale / Decision |
|---|---|---|---|---|---|---|
| **0** | **Dashboard** | `/admin` | *None (Core)* | `erp-admin` | **Always Visible** | Central dashboard overview for authenticated school staff. |
| **1** | **Institution Setup** | `/admin/institution` | `ACADEMICS` | `erp-admin` | **Core (Always Visible)** | Fundamental school configuration; classes, sessions, subjects cannot be disabled. |
| 1.1 | Campus & Settings | `/admin/settings` | `ACADEMICS` | `erp-admin` | Core Child | Baseline school profile and settings. |
| 1.2 | Academic Sessions | `/admin/institution/sessions` | `ACADEMICS` | `erp-admin` | Core Child | Academic calendar and session boundaries. |
| 1.3 | Classes & Sections | `/admin/institution/classes` | `ACADEMICS` | `erp-admin` | Core Child | Fundamental class and section roster. |
| 1.4 | Curriculum & Subjects | `/admin/institution/curriculum` | `ACADEMICS` | `erp-admin` | Core Child | Curriculum mapping. |
| **2** | **Admissions & Students** | `/admin/admissions` | `ACADEMICS` | `erp-admin` | **Core (Always Visible)** | Student intake, canonical student profile, and directories belong to Core Academics. |
| 2.1 | Admissions & CRM | `/admin/admissions` | `ACADEMICS` | `erp-admin` | Core Child | Replaces legacy `ADMISSIONS` phantom code. |
| 2.2 | Bulk Registration | `/admin/admissions/bulk` | `ACADEMICS` | `erp-admin` | Core Child | Bulk spreadsheet student registration. |
| 2.3 | Import History | `/admin/admissions/history` | `ACADEMICS` | `erp-admin` | Core Child | Historical audit logs of student imports. |
| 2.4 | Student Directory | `/admin/students` | `ACADEMICS` | `erp-admin` | Core Child | Core student records and profile viewer. |
| 2.5 | Parents & Guardians | `/admin/students/guardians` | `ACADEMICS` | `erp-admin` | Core Child | Guardian identity and contact mapping. |
| **3** | **Academic Operations** | `/admin/academic` | `ACADEMICS` | `erp-admin` | **Core Group with Optional Children** | Group always visible as long as core academic features exist. |
| 3.1 | Attendance | `/admin/attendance` | `ACADEMICS` | `erp-admin` | Core Child | Student roll call and daily classroom attendance. |
| 3.2 | Timetable | `/admin/timetable` | `ACADEMICS` | `erp-admin` | Core Child | Weekly schedule and period slots. |
| 3.3 | Assignments & LMS | `/admin/assignments` | `ACADEMICS` | `erp-admin` | Core Child | Classroom homework and learning assets. |
| 3.4 | Examinations | `/admin/exams` | `EXAMS` | `erp-admin` | **Optional (Filtered)** | Controlled by `EXAMS` entitlement. |
| 3.5 | Results & Grades | `/admin/results` | `EXAMS` | `erp-admin` | **Optional (Filtered)** | Controlled by `EXAMS` entitlement. |
| **4** | **Finance & Accounts** | `/admin/fees` | `FINANCE` | `erp-admin` | **Core (Always Visible)** | Double-entry ledger, student invoices, fee collection. |
| 4.1 | Fee Management | `/admin/fees` | `FINANCE` | `erp-admin` | Core Child | Fee structures and student invoicing. |
| 4.2 | Fee Defaulters | `/admin/fees/defaulters` | `FINANCE` | `erp-admin` | Core Child | Overdue invoice aging and reminders. |
| 4.3 | Accounting & Ledger | `/admin/fees/ledger` | `FINANCE` | `erp-admin` | Core Child | Chart of accounts and double-entry journals. |
| **5** | **HR & Workforce** | `/admin/hr` | `HR_PAYROLL` | `erp-admin` | **Optional (Filtered Group)** | Controlled by `HR_PAYROLL` entitlement. |
| 5.1 | Staff & Payroll | `/admin/hr` | `HR_PAYROLL` | `erp-admin` | Optional Child | Payroll runs, employee records. |
| 5.2 | Faculty & Teachers | `/admin/teachers` | `HR_PAYROLL` | `erp-admin` | Optional Child | Faculty qualifications and subject assignments. |
| **6** | **Campus Operations** | `/admin/campus-operations` | *Composite* | `erp-admin` | **Dynamic Parent (Zero-Children Collapse)** | **Hidden if both HOSTEL and TRANSPORT are disabled.** |
| 6.1 | Hostel Management | `/admin/hostel` | `HOSTEL` | `erp-admin` | **Optional (Filtered + Lifecycle)** | Controlled by `HOSTEL`. Shows badges: `CONFIGURATION_REQUIRED`, `CONFIGURATION_INCOMPLETE`, or `ACTIVE`. |
| 6.2 | Transport & Vehicles | `/admin/transport` | `TRANSPORT` | `erp-admin` | **Optional (Filtered + Lifecycle)** | Controlled by `TRANSPORT`. Shows badges: `PROVISIONING`, `SYNCING`, `SYNC_FAILED`, or `ACTIVE`. |
| **7** | **Campus Services** | `/admin/services` | *Composite* | `erp-admin` | **Dynamic Parent** | Visible if any child is visible. |
| 7.1 | Library Management | `/admin/library` | `LIBRARY` | `erp-admin` | **Optional (Filtered)** | Controlled by `LIBRARY` entitlement. |
| 7.2 | Assets & Inventory | `/admin/assets` | `INVENTORY` | `erp-admin` | **Optional (Filtered)** | Replaces legacy `ASSETS` code with `INVENTORY`. |
| 7.3 | Reception & Visitors | `/admin/reception` | `ACADEMICS` | `erp-admin` | Core Child | Front desk visitor logbook. |
| 7.4 | Student Discipline | `/admin/discipline` | `ACADEMICS` | `erp-admin` | Core Child | Disciplinary incidents and commendations. |
| **8** | **Communication & Records** | `/admin/communication` | *Composite* | `erp-admin` | **Dynamic Parent** | Notices, circulars, certificates, CMS. |
| 8.1 | Events & Calendar | `/admin/events` | `COMMUNICATIONS` | `erp-admin` | Optional Child | Event scheduling and school notices. |
| 8.2 | Notices & Circulars | `/admin/notices` | `COMMUNICATIONS` | `erp-admin` | Optional Child | Direct broadcast messages. |
| 8.3 | Notifications & Alerts | `/admin/notifications` | `COMMUNICATIONS` | `erp-admin` | Optional Child | SMS/Push dispatch status. |
| 8.4 | Documents & Certificates | `/admin/documents` | `ACADEMICS` | `erp-admin` | Core Child | Transfer certificates and bonafide letters. |
| 8.5 | Alumni Management | `/admin/alumni-mgmt` | `ACADEMICS` | `erp-admin` | Core Child | Graduated student records. |
| 8.6 | School Website CMS | `/admin/site-settings` | `ACADEMICS` | `erp-admin` | Core Child | Public portal content management. |
| **9** | **Reports & Analytics** | `/admin/analytics` | `ACADEMICS` | `erp-admin` | **Core (Always Visible)** | Executive analytics, enrollment trends, attendance ratios. |
| 9.1 | Executive Analytics | `/admin/analytics` | `ACADEMICS` | `erp-admin` | Core Child | Cross-functional reporting summary. |
| **10** | **Administration & Settings** | `/admin/settings` | *Core Platform* | `erp-admin` | **Core (Always Visible)** | System configuration and security controls. |
| 10.1 | User Directory | `/admin/users` | *Core Platform* | `erp-admin` | Core Child | Staff and user credential management. |
| 10.2 | Institution Settings | `/admin/settings` | *Core Platform* | `erp-admin` | Core Child | School identity, logo, academic rules. |
| 10.3 | System Audit Logs | `/admin/settings/audit-logs` | *Core Platform* | `erp-admin` | Core Child | Security and mutation audit logs. |
| 10.4 | Policies & Data Retention | `/admin/settings/policies` | *Core Platform* | `erp-admin` | Core Child | Compliance and automated data purging. |

---

### 3.2 `super-admin` Platform Navigation Architecture

| # | Item Label | Target Route (`href`) | Match Rule | Portal | Purpose & Responsibility |
|---|---|---|---|---|---|
| **1** | **Command Center** | `/dashboard` | Exact match (`/dashboard`) | `super-admin` | Multi-tenant telemetrics, SHFI health score, high-level KPIs. |
| **2** | **School Network** | `/dashboard/schools` | Prefix match (`/dashboard/schools*`) | `super-admin` | Tenant provisioning, school environments, and per-school module entitlement management. |
| **3** | **SaaS Requests** | `/dashboard/requests` | Prefix match (`/dashboard/requests*`) | `super-admin` | Institutional onboarding applications and trial requests. |
| **4** | **Global Analytics** | `/dashboard/analytics` | Prefix match (`/dashboard/analytics*`) | `super-admin` | Aggregated tenant growth, revenue, and infrastructure telemetry. |
| **5** | **System Core** | `/dashboard/settings` | Prefix match (`/dashboard/settings*`) | `super-admin` | Platform maintenance, database backups, disaster recovery, global secrets. |

---

## 4. Lifecycle & Operational Status Specifications

### 4.1 Transport Module Lifecycle
- **DISABLED:** Entire transport navigation hidden. Backend API responds with 403 `MODULE_DISABLED`.
- **ENABLED + PROVISIONING:** No vehicles registered yet (`TransportVehicle.count === 0`). Badge: `"Provisioning"`. Non-operational notice in UI.
- **ENABLED + SYNCING:** Vehicles exist but GPS/stop telemetry not yet linked (`TransportRoute.count === 0` or missing stops). Badge: `"Syncing"`.
- **ENABLED + SYNC_FAILED:** Fleet IoT sync or route errors encountered. Badge: `"Sync Error"` (Yellow/Red indicator).
- **ENABLED + ACTIVE:** Normal operational state with registered vehicles and active routes. Badge: None / normal clickable.

### 4.2 Hostel Module Lifecycle
- **DISABLED:** Entire hostel navigation hidden. Backend API responds with 403 `MODULE_DISABLED`.
- **ENABLED + CONFIGURATION_REQUIRED:** No rooms or buildings configured (`HostelRoom.count === 0`). Badge: `"Setup Required"`. Guides admin to room setup.
- **ENABLED + CONFIGURATION_INCOMPLETE:** Rooms exist but lack capacity/building metadata or zero active rooms. Badge: `"Setup Incomplete"`.
- **ENABLED + ACTIVE:** Rooms configured and ready for student room allocation. Badge: None / normal clickable.

---

## 5. Security & Authorization Guarantees

1. **Backend Guard (`moduleGuard.ts`):**
   - Must strictly trust `req.user.schoolId` for tenant users (`ERP_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`).
   - Untrusted `x-school-id` and `x-tenant-id` request headers from non-SUPER_ADMIN users are strictly ignored.
   - Fail-closed: DB lookup exceptions return HTTP 503 or fail closed (403), never granting optimistic access.
2. **Super Admin Isolation:**
   - Super Admin operates globally (`req.user.schoolId === null`).
   - Module entitlement mutations must require target school ID in route parameters (`/api/v1/schools/:id/modules/:moduleCode`).
   - Mutations must validate school existence, check dependencies (e.g. `HOSTEL` requires `ACADEMICS`, `INVENTORY` requires `FINANCE`), record audit logs in `SystemLog`, and invalidate Redis cache keys (`erp:module:<schoolId>:<moduleCode>`).

