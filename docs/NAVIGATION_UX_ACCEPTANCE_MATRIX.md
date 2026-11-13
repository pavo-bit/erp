# SSVM ERP — Navigation UX & Information Architecture Acceptance Matrix

**Canonical Document:** `docs/NAVIGATION_UX_ACCEPTANCE_MATRIX.md`  
**Working Repository:** `pavo-bit/erp`  
**Branch:** `lane/d-portals`  
**Author:** Principal Frontend Architect & Lead UI/UX Engineer  
**Date:** 13 November 2026  
**Status:** **ACCEPTED & VERIFIED**

---

## 1. Executive Overview

This document records the user-experience verification across all seven representative personas in the SSVM ERP platform. The information architecture has been redesigned from internal database schemas into intuitive, workflow-driven hierarchies for both `erp-admin` and `super-admin`.

### Core Usability Enhancements:
1. **Workflow-Oriented Hierarchy:** Replaced arbitrary module groupings with 12 Staff-Centric functional groups in `erp-admin`.
2. **Contextual Quick Access Dock (`QuickAccessDock.tsx`):** Role-tailored action shortcuts for immediate task execution (e.g. Bulk Admission, Mark Attendance, Collect Fee, Gradebook).
3. **Dynamic Breadcrumbs Navigation (`Breadcrumbs.tsx`):** Real-time, clickable location trail displayed across desktop and mobile on both portals.
4. **Least-Privilege Role Filtering:** Automatic hiding of sensitive administrative and financial groups for instructional staff without bypassing backend authorization guards.
5. **Zero-Children Collapse:** Dynamic hiding of unentitled groups (e.g. Campus Operations when neither Hostel nor Transport is active).

---

## 2. Multi-Persona Usability Evaluation Matrix

### Persona 1: School Administrator / Principal (`Role: ERP_ADMIN`)
- **Primary Mission:** Overall campus oversight, institutional governance, admissions, staff directories, and high-level financial reporting.
- **Accessible Groups:**
  - Overview (Dashboard)
  - Admissions & Students (All workflows: CRM, Bulk Registration, Import History, Student Directory, Parents & Guardians, Document Verification)
  - Academic Administration (Sessions, Classes & Sections, Curriculum, Timetable, Assignments)
  - Attendance (Student Attendance, Staff Attendance)
  - Examinations & Results (Exam Management, Results & Report Cards)
  - Fees & Finance (Fee Management, Defaulters, Ledger)
  - Staff & HR (Staff & Payroll, Faculty Directory)
  - Campus Operations (Transport & Hostel when entitled)
  - Campus Services (Library, Inventory, Reception, Discipline)
  - Communication (Notices, Events, Notifications, Alumni, Website CMS)
  - Reports & Analytics (Executive Analytics)
  - Administration & Governance (Users, Settings, Audit Logs, Policies, Governance Workflows)
- **Quick Actions:** Bulk Admission, Find Student, Mark Attendance, Collect Fee, Gradebook, Issue Notice.
- **Breadcrumb Feedback:** `Admin / Admissions & Students / Bulk Registration`, etc.
- **Evaluation:** **PASS** (100% functional, full visibility with entitlement safeguards).

---

### Persona 2: Admission Incharge (`Role: ERP_ADMIN` / Scoped Admission Staff)
- **Primary Mission:** Processing new admissions, conducting bulk imports, auditing student documents, generating admission registers.
- **Accessible Groups:**
  - Overview (Dashboard)
  - Admissions & Students (Focused priority group: Bulk Registration, History, Student Directory, Guardians, Document Verification)
  - Academic Administration (Class placement & Section views)
  - Communication & Notices
- **Quick Actions:** Bulk Admission, Find Student.
- **Hidden / Restricted:** High-level finance ledger modification, governance close periods, system policies.
- **Breadcrumb Feedback:** `Admin / Admissions & Students / Document Verification`.
- **Evaluation:** **PASS** (Direct access to paper-form viewer, XLSX import, and document verification).

---

### Persona 3: Teacher / Faculty Member (`Role: TEACHER`)
- **Primary Mission:** Daily roll-call attendance, gradebook marks entry, assignment publishing, timetable viewing, parent notices.
- **Accessible Groups:**
  - Overview (Dashboard)
  - Admissions & Students (Student Directory, Parents & Guardians for class context)
  - Academic Administration (Timetable & Schedules, Assignments & LMS)
  - Attendance (Student Attendance)
  - Examinations & Results (Exam Management, Results & Report Cards)
  - Campus Services (Library Circulation, Student Discipline)
  - Communication (Notices & Circulars, Events & Calendar)
- **Quick Actions:** Mark Attendance, Gradebook & Exams, Find Student.
- **Hidden / Restricted:** Fees & Finance (hidden), Staff & Payroll (hidden), Administration & Settings (hidden), SaaS Requests (hidden).
- **Breadcrumb Feedback:** `Admin / Attendance / Student Attendance`, `Admin / Examinations & Results / Results & Report Cards`.
- **Evaluation:** **PASS** (Clean instructional workspace without administrative clutter).

---

### Persona 4: Accountant / Finance Officer (`Role: ACCOUNTANT` / Scoped Staff)
- **Primary Mission:** Fee collection, cash desk reconciliation, outstanding fee defaulter follow-ups, double-entry ledger audits.
- **Accessible Groups:**
  - Overview (Dashboard)
  - Fees & Finance (Fee Management, Outstanding Dues, Accounting & Ledger)
  - Admissions & Students (Student Directory for student ledger lookup)
  - Reports & Analytics (Financial & Executive Analytics)
  - Communication (Receipt notifications & Alerts)
- **Quick Actions:** Collect Fee, Find Student.
- **Hidden / Restricted:** Staff HR payroll policies, student discipline, curriculum configuration.
- **Breadcrumb Feedback:** `Admin / Fees & Finance / Fee Management`.
- **Evaluation:** **PASS** (Immediate visibility of tuition revenue, cash collection desks, and invoice aging).

---

### Persona 5: Transport Operator / Fleet Manager (`Role: ERP_ADMIN` with Transport Entitlement)
- **Primary Mission:** Vehicle routing, driver allocations, live bus GPS telemetry, student stop assignments.
- **Accessible Groups:**
  - Overview (Dashboard)
  - Campus Operations (Transport & Fleets — highlighted with lifecycle status)
  - Admissions & Students (Student Directory for stop allocation)
  - Communication (Emergency transport alerts)
- **Lifecycle Indicators:**
  - `PROVISIONING` (amber badge) when fleet has zero registered vehicles.
  - `SYNCING` (amber badge) when vehicles exist but routes/stops are being synchronized.
  - `ACTIVE` (emerald badge) when routes and stops are live.
- **Hidden / Restricted:** Hidden completely if institution subscription has `TRANSPORT` disabled.
- **Breadcrumb Feedback:** `Admin / Campus Operations / Transport & Fleets`.
- **Evaluation:** **PASS** (Lifecycle badges provide immediate situational awareness).

---

### Persona 6: Hostel Operator / Warden (`Role: ERP_ADMIN` with Hostel Entitlement)
- **Primary Mission:** Dormitory configuration, room capacity management, student room allocations.
- **Accessible Groups:**
  - Overview (Dashboard)
  - Campus Operations (Hostel Management — highlighted with lifecycle status)
  - Admissions & Students (Student Directory for resident matching)
- **Lifecycle Indicators:**
  - `CONFIGURATION_REQUIRED` (amber badge) when school has zero configured hostel rooms.
  - `CONFIGURATION_INCOMPLETE` (amber badge) when rooms lack capacity/building metadata.
  - `ACTIVE` (emerald badge) when rooms and buildings are fully configured.
- **Hidden / Restricted:** Hidden completely if institution subscription has `HOSTEL` disabled.
- **Breadcrumb Feedback:** `Admin / Campus Operations / Hostel Management`.
- **Evaluation:** **PASS** (Zero-room setup prompts warden directly to room onboarding wizard).

---

### Persona 7: Platform Super Administrator (`Role: SUPER_ADMIN`)
- **Primary Mission:** Multi-tenant platform monitoring, tenant provisioning, per-school module licensing, SHFI system health.
- **Navigation Groups (`super-admin` Portal):**
  - **Platform Overview:** Command Center (`/dashboard`)
  - **Institution Management:** School Network (`/dashboard/schools` → `/dashboard/schools/[schoolId]/modules`)
  - **SaaS Operations:** SaaS Requests (`/dashboard/requests`)
  - **Platform Monitoring:** Global Analytics (`/dashboard/analytics`), Health & SHFI (`/dashboard/shfi`)
  - **Platform Administration:** System Core (`/dashboard/settings`)
- **Breadcrumb Feedback:** `Command Center / School Network / Module Entitlements`.
- **Interactive Capabilities:**
  - Inspect any tenant's entitled and core modules.
  - Locked toggles on immutable core modules (`ACADEMICS`, `FINANCE`).
  - Modal confirmation with dependency checks for optional modules (`TRANSPORT`, `HOSTEL`, `EXAMS`, etc.).
  - Global system observability without entering school operational consoles.
- **Evaluation:** **PASS** (High-density dark glassmorphism Command Center with full mobile parity).

---

## 3. Responsive & Interaction Accessibility Verification

| Feature | Desktop (`>= 1024px`) | Mobile (`< 1024px`) | Keyboard / Screen Reader (a11y) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Expandable Navigation Groups** | Smooth accordion animation, state memory per group | Smooth accordion inside slide-out drawer | Enter / Space toggle, `aria-expanded` attributes | **VERIFIED** |
| **Active Route Glow** | Gradient neon bar & background tint | Full-width pill tint & icon highlight | High-contrast visual focus ring | **VERIFIED** |
| **Drawer Close Interactions** | N/A (Fixed sidebar) | Tap overlay, Tap close button, Press Escape key, Select route | Escape key listener, auto-focus management | **VERIFIED** |
| **Contextual Quick Actions** | Top-dock horizontal pill wrap | Compact scrollable badge bar | Semantic `<Link>` tags with ARIA labels | **VERIFIED** |
| **Interactive Breadcrumbs** | Clickable parent navigation path | Truncated responsive trail | Semantic `<nav aria-label="breadcrumb">` | **VERIFIED** |

