# SSVM ERP — Navigation Architecture Baseline Audit

**Canonical Specification:** `docs/NAVIGATION_BASELINE_AUDIT.md`  
**Working Repository:** `pavo-bit/erp`  
**Working Branch:** `lane/d-portals`  
**Audit Date:** 14 November 2026  
**Status:** COMPLETE — BASELINE VERIFIED

---

## 1. Executive Summary

This document establishes the pre-implementation audit baseline for the navigation architecture of **SSVM ERP** across both `erp-admin` (school-level operational portal) and `super-admin` (platform-level SaaS governance portal).

The audit assesses:
1. Structural integrity of the sidebar and layout wrappers.
2. Alignment with the 10 canonical module groups in `ERP_ADMIN_INFORMATION_ARCHITECTURE.md`.
3. Existence and operational readiness of all destination routes.
4. Redundancies and collisions in UX components (Global Search, Quick Access, Breadcrumbs).
5. Module entitlement integration and fail-closed security.
6. Layout conflicts, margins, and nested shells in Super Admin.

---

## 2. ERP Admin Architecture Audit

### 2.1 Current File & Component Inventory

| Component | Physical Path | Current Responsibility | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Admin Layout** | `erp-admin/src/app/admin/layout.tsx` | Nav definitions, role filtering, entitlement resolution | Configured with 12 groups instead of canonical 10; uses role-based staff filtering which must not introduce new role segregation in this phase. |
| **Dashboard Shell** | `erp-admin/src/components/DashboardLayout.tsx` | Desktop sidebar, mobile sheet drawer, StatCard | Fixed at `w-[260px]`; lacks collapsed icon-rail mode (72px); lacks sidebar collapse toggle button; embedded `<GlobalSearch />` causes duplicate search button placement. |
| **Global Search** | `erp-admin/src/components/GlobalSearch.tsx` | Floating search modal triggered by `Ctrl+K` | Queries `/api/v1/students` or `/api/v1/teachers` individually; ignores backend global endpoint `/api/v1/search?q={query}`; does not navigate on result click; floating button overlaps with Quick Access. |
| **Breadcrumbs** | `erp-admin/src/components/Breadcrumbs.tsx` | Breadcrumb hierarchy display | Hardcoded lookup table misses several canonical 10-group routes; lacks full route registry fallback. |
| **Quick Access Dock** | `erp-admin/src/components/QuickAccessDock.tsx` | Operational shortcuts bar | Currently applies role-based filtering (`roles: [...]`) and renders `Role: {userRole}`, which violates prompt directive against role-specific Quick Access in this phase. |

### 2.2 Route & Destination Audit (ERP Admin)

| Group # | Canonical Group Name | Target Destinations | Page Status on Disk | Notes / Actions |
| :---: | :--- | :--- | :---: | :--- |
| **0** | **Standalone Dashboard** | `/admin` | Exists (`page.tsx`) | Fully operational. |
| **1** | **Institution Setup** | `/admin/institution/sessions`<br/>`/admin/institution/classes`<br/>`/admin/institution/curriculum`<br/>`/admin/settings` | All 4 Exist | Academic Configuration and Campus Settings handled via `/admin/settings` and `/admin/institution/sessions`. Programs/Branches deferred. |
| **2** | **Admissions & Student Affairs** | `/admin/admissions`<br/>`/admin/admissions/bulk`<br/>`/admin/admissions/history`<br/>`/admin/students`<br/>`/admin/students/guardians`<br/>`/admin/documents` | All 6 Exist | Student Lifecycle consolidated into `/admin/students`. Document Verification preserved. |
| **3** | **Academic Operations** | `/admin/attendance`<br/>`/admin/timetable`<br/>`/admin/assignments`<br/>`/admin/exams`<br/>`/admin/results` | All 5 Exist | Fully operational. |
| **4** | **Finance & Accounts** | `/admin/fees`<br/>`/admin/fees/defaulters`<br/>`/admin/fees/ledger` | All 3 Exist | Scholarships & Financial Aid deferred to `docs/NAVIGATION_DEFERRED_DESTINATIONS.md`. |
| **5** | **HR & Workforce** | `/admin/hr`<br/>`/admin/teachers` | Both Exist | Staff attendance and payroll consolidated inside `/admin/hr`. |
| **6** | **Campus Operations** | `/admin/hostel`<br/>`/admin/transport` | Both Exist | Guarded by optional `HOSTEL` and `TRANSPORT` module codes. |
| **7** | **Campus Services & Resources** | `/admin/library`<br/>`/admin/assets`<br/>`/admin/reception`<br/>`/admin/discipline` | All 4 Exist | Guarded by `LIBRARY`, `INVENTORY`. Procurement, Canteen, Health deferred. |
| **8** | **Communication & Records** | `/admin/events`<br/>`/admin/notices`<br/>`/admin/notifications`<br/>`/admin/documents`<br/>`/admin/alumni-mgmt`<br/>`/admin/site-settings` | All 6 Exist | Guarded by `COMMUNICATIONS`. |
| **9** | **Reports & Analytics** | `/admin/analytics` | Exists (`page.tsx`) | Executive Analytics active. Specialized sub-reports consolidated. |
| **10** | **Administration & Settings** | `/admin/users`<br/>`/admin/settings`<br/>`/admin/settings/audit-logs`<br/>`/admin/settings/policies`<br/>`/admin/governance` | All 5 Exist | Full tenant governance and RBAC administration. |

---

## 3. Super Admin Architecture Audit

### 3.1 Current File & Component Inventory

| Component | Physical Path | Current Responsibility | Audit Finding |
| :--- | :--- | :--- | :--- |
| **SuperAdminShell** | `super-admin/src/components/SuperAdminShell.tsx` | Central persistent shell for Super Admin | Glassmorphism UI, 5 navigation sections, responsive mobile drawer; active prefix matching; breadcrumbs integration. |
| **Dashboard Layout** | `super-admin/src/app/dashboard/layout.tsx` | Dashboard sub-route wrapper | Wraps all `/dashboard/*` pages in `<SuperAdminShell>`. |
| **Command Center** | `super-admin/src/app/dashboard/page.tsx` | Executive KPI dashboard | Cleaned up and operational. |
| **School Network** | `super-admin/src/app/dashboard/schools/page.tsx` | Tenant directory | Links to `/dashboard/schools/[schoolId]/modules` and `/dashboard/schools/[schoolId]/shifts`. Has nested `p-6 lg:p-12` creating duplicate padding. |
| **Module Console** | `super-admin/src/app/dashboard/schools/[schoolId]/modules/page.tsx` | Tenant entitlement management | Fully functional with locked core modules and optional toggles. |
| **Shift Console** | `super-admin/src/app/dashboard/schools/[schoolId]/shifts/page.tsx` | Institution shift configuration | Fully functional with session scoping. |
| **Global Analytics** | `super-admin/src/app/dashboard/analytics/page.tsx` | Network telemetrics | Has nested `p-6 lg:p-12` creating double padding with shell. |
| **SHFI Dashboard** | `super-admin/src/app/dashboard/shfi/page.tsx` | Health and incident monitor | Fully functional. |
| **SaaS Requests** | `super-admin/src/app/dashboard/requests/page.tsx` | Onboarding requests | Uses light-theme white cards (`bg-white`) clashing with dark glassmorphic shell. |
| **Global Settings** | `super-admin/src/app/dashboard/settings/page.tsx` | Platform core configuration | **CRITICAL DEFECT:** Contains its own `<main className="flex-1 lg:ml-[280px]">`, causing a double-margin bug (560px offset) inside the shell. |

---

## 4. Backend & Security Alignment Audit

1. **Authoritative Module Registry:** `ssvm-backend/src/services/module-registry.service.ts`
   - Canonical Module Codes: `ACADEMICS`, `FINANCE` (Core / Immutable); `EXAMS`, `TRANSPORT`, `LIBRARY`, `HOSTEL`, `HR_PAYROLL`, `INVENTORY`, `COMMUNICATIONS`, `BIOMETRIC_ATTENDANCE` (Optional).
2. **Fail-Closed Tenancy & Route Protection:**
   - `ssvm-backend/src/middleware/moduleGuard.ts` enforces `schoolId` identity and returns HTTP 403 `MODULE_DISABLED`.
   - `ssvm-backend/src/routes/search.ts` provides universal multi-entity search endpoint `GET /api/v1/search?q={query}` across 12 distinct entities.

---

## 5. Required Actions & Target Deliverables

1. **ERP Admin Sidebar:** Reorganize `NAV_GROUPS` in `erp-admin/src/app/admin/layout.tsx` into exactly 10 canonical expandable groups matching Section 5.3.
2. **ERP Admin Icon-Rail & Collapse Toggle:** Update `DashboardLayout.tsx` with a desktop sidebar collapse toggle (260px expanded $\leftrightarrow$ 72px collapsed rail with tooltips), smooth transition, and proper `ml` compensation.
3. **Consolidated Global Search:** Refactor `GlobalSearch.tsx` to call `/api/v1/search?q={query}`, handle all 12 backend entities, provide keyboard navigation, navigate directly to target routes on click, and remove the floating trigger button overlap.
4. **Universal Quick Access Dock:** Refactor `QuickAccessDock.tsx` to provide high-utility school operational shortcuts for all administrative users without role gating.
5. **Super Admin Layout Conflict Removal:** Fix `super-admin/src/app/dashboard/settings/page.tsx` to eliminate the redundant inner `<main className="lg:ml-[280px]">`, standardize container padding in `schools/page.tsx` and `analytics/page.tsx`, and align `requests/page.tsx` with dark glassmorphism.
6. **Documentation Deliverables:** Create `docs/NAVIGATION_IMPLEMENTATION_PLAN.md`, `docs/NAVIGATION_DEFERRED_DESTINATIONS.md`, `docs/NAVIGATION_IMPLEMENTATION_REPORT.md`, and `docs/NAVIGATION_TEST_REPORT.md`.

