# SSVM ERP — Navigation Architecture Implementation Plan

**Canonical Specification:** `docs/NAVIGATION_IMPLEMENTATION_PLAN.md`  
**Working Repository:** `pavo-bit/erp`  
**Working Branch:** `lane/d-portals`  
**Target:** Stages B through I  
**Status:** APPROVED & IN EXECUTION

---

## 1. Objectives

1. Align `erp-admin` navigation with the canonical 10-group structure defined in `ERP_ADMIN_INFORMATION_ARCHITECTURE.md` and Prompt Section 5.3.
2. Implement desktop sidebar collapse control (expanded 260px $\leftrightarrow$ collapsed 72px icon rail with tooltips) in `DashboardLayout.tsx`.
3. Consolidate Global Search into a single authoritative component connected to `/api/v1/search?q={query}` across all 12 backend entities with direct route navigation on click.
4. Update Quick Access Dock to provide unified, non-role-segregated operational shortcuts.
5. Enhance Breadcrumbs to cover all canonical routes and sub-routes without displaying raw UUIDs.
6. Eliminate nested layout wrappers and double-margin defects in `super-admin/src/app/dashboard/settings/page.tsx` and standardize Super Admin UI padding.
7. Maintain strict fail-closed module entitlement resolution and database RLS invariants.
8. Execute verification test suites and publish comprehensive test and implementation reports.

---

## 2. Stage Breakdown & Execution Order

### Stage B — ERP Admin Shell & Sidebar Architecture
* Refactor `erp-admin/src/app/admin/layout.tsx` to group navigation into the canonical 10 groups:
  1. `Institution Setup`
  2. `Admissions & Student Affairs`
  3. `Academic Operations`
  4. `Finance & Accounts`
  5. `HR & Workforce`
  6. `Campus Operations`
  7. `Campus Services & Resources`
  8. `Communication & Records`
  9. `Reports & Analytics`
  10. `Administration & Settings`
* Refactor `erp-admin/src/components/DashboardLayout.tsx`:
  - Add collapse/expand toggle button with persistent state.
  - Implement 72px icon-rail mode for desktop with floating tooltips.
  - Dynamic `lg:ml-[260px]` vs `lg:ml-[72px]` content transition.
  - Retain full mobile slide-in drawer with backdrop, close button, escape key listener, and zero horizontal scroll.

### Stage C — Shared UX Components (ERP Admin)
* Update `erp-admin/src/components/Breadcrumbs.tsx` to map all 10 canonical groups and dynamic routes cleanly.
* Refactor `erp-admin/src/components/GlobalSearch.tsx`:
  - Triggered via `Ctrl+K` / `Cmd+K` keyboard shortcut and prominent header trigger.
  - Invokes `/api/v1/search?q={query}`.
  - Renders categorized results: Students, Teachers, Guardians, Invoices, Admissions, Assignments, Events, Notices, Documents, Alumni.
  - Clicking any result navigates to the real route and closes modal.
* Refactor `erp-admin/src/components/QuickAccessDock.tsx`:
  - Non-role-segregated universal shortcuts: Bulk Admission, Student Directory, Attendance, Fee Collection, Exams, Notices, Timetable, Transport.

### Stage D — Module Entitlement & Fail-Closed Security
* Validate module mapping in `erp-admin/src/app/admin/layout.tsx` against `CENTRAL_MODULE_REGISTRY`:
  - `ACADEMICS`, `FINANCE`: Always enabled.
  - `EXAMS`, `TRANSPORT`, `LIBRARY`, `HOSTEL`, `HR_PAYROLL`, `INVENTORY`, `COMMUNICATIONS`: Optional, fail-closed when loading or unentitled.
  - Empty groups automatically collapse when all child items are unentitled.

### Stage E & F — Super Admin Shell & Page Conflict Removal
* Resolve nested shell bug in `super-admin/src/app/dashboard/settings/page.tsx` (remove redundant `<main className="lg:ml-[280px]">` and background glows).
* Align `super-admin/src/app/dashboard/requests/page.tsx` styling with dark glassmorphism.
* Standardize container spacing across `super-admin/src/app/dashboard/schools/page.tsx` and `analytics/page.tsx`.

### Stage G — Responsive & Accessibility Hardening
* Verify ARIA labels, modal dialog attributes, keyboard focus traps, escape key listeners, and contrast ratios.

### Stage H — Comprehensive Verification & Testing
* Run TypeScript checks:
  - `npx --prefix erp-admin tsc --noEmit`
  - `npx --prefix super-admin tsc --noEmit`
  - `npx --prefix ssvm-backend tsc --noEmit`
* Run backend automated test suites:
  - `npm --prefix ssvm-backend test` (or specific Vitest suites)

### Stage I — Final Documentation
* Publish `docs/NAVIGATION_DEFERRED_DESTINATIONS.md`
* Publish `docs/NAVIGATION_IMPLEMENTATION_REPORT.md`
* Publish `docs/NAVIGATION_TEST_REPORT.md`

