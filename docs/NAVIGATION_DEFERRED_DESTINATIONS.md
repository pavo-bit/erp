# SSVM ERP — Navigation Deferred Destinations Register

**Canonical Document:** `docs/NAVIGATION_DEFERRED_DESTINATIONS.md`  
**Working Repository:** `pavo-bit/erp`  
**Working Branch:** `lane/d-portals`  
**Audit Date:** 14 November 2026

---

## 1. Principles of Deferred Destination Management

In accordance with Section 5.4 of the Master Navigation Specification:
1. **Zero Dead Links:** No navigation link in `erp-admin` or `super-admin` may navigate to a 404 route, an empty placeholder stub, or an incomplete feature.
2. **Reuse over Duplication:** Where an existing functional page already covers an operational area, that route is used as the canonical destination.
3. **Explicit Deferral:** Modules and sub-pages not yet implemented in backend APIs or frontend UI are formally cataloged in this register rather than exposed as broken menu options.

---

## 2. Deferred Destinations Register

| Conceptual Menu Item | Canonical Group | Intended Route | Current System Disposition | Reason for Deferral | Planned Delivery Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Programs, Branches & Departments** | Group 1 — Institution Setup | `/admin/institution/programs` | Consolidated into `/admin/institution/classes` | Academic classes, sections, and streams are managed within Classes & Sections. Multi-branch program definitions require higher-education domain extensions. | Post-K12 Extension |
| **Academic Configuration** | Group 1 — Institution Setup | `/admin/institution/academic-config` | Covered by `/admin/institution/sessions` and `/admin/settings` | Session terms, working days, and grading defaults are managed within Academic Sessions and Institution Settings. Dedicated wizard deferred. | Phase 2 Academics Refactor |
| **Student Lifecycle (Transfer/Alumni)** | Group 2 — Admissions & Student Affairs | `/admin/students/lifecycle` | Covered by `/admin/students` (Enrollment status filters: `TRANSFERRED`, `GRADUATED`) and `/admin/alumni-mgmt` | Lifecycle transitions (TC issuance, graduation) are handled directly in Student Directory and Alumni Registry. | Phase 3 Records Lifecycle |
| **Scholarships & Financial Aid** | Group 4 — Finance & Accounts | `/admin/fees/scholarships` | Handled via Fee Concession rules within Fee Management (`/admin/fees`) | Dedicated scholarship application, scoring, and trust-fund disbursement module not yet scheduled in K-12 scope. | Phase 6 Finance Extensions |
| **Procurement & Vendors** | Group 7 — Campus Services & Resources | `/admin/procurement` | Handled via Asset Purchase Orders within `/admin/assets` | Dedicated vendor quotation RFQ bidding system deferred to enterprise supply chain release. | Phase 7 Supply Chain |
| **Health & Medical** | Group 7 — Campus Services & Resources | `/admin/health` | Not present in approved K-12 scope | Infirmary logs, student medical histories, and immunization tracking require specialized privacy and HIPAA/NDHM compliance. | Phase 8 Auxiliary Services |
| **Sports & Activities** | Group 7 — Campus Services & Resources | `/admin/sports` | Managed through School Events (`/admin/events`) | Dedicated athletic tournament brackets and equipment issuing covered by Events and Inventory. | Phase 8 Auxiliary Services |
| **Canteen & Meals** | Group 7 — Campus Services & Resources | `/admin/canteen` | Not present in approved K-12 scope | Meal plan ticketing, point-of-sale dietary tracking, and cafeteria inventory require dedicated POS hardware integration. | Phase 8 Auxiliary Services |
| **Specialized Sub-Reports (Academic/Financial/Ops)** | Group 9 — Reports & Analytics | `/admin/analytics/*` | Consolidated into `/admin/analytics` | Executive Analytics provides unified KPI telemetry. Granular sub-report tabs are rendered inside the canonical Analytics view. | Phase 9 Reporting Overhaul |

---

## 3. Verified Active Navigation Mapping (Canonical 10 Groups)

All active items mapped in `erp-admin/src/app/admin/layout.tsx` resolve to genuine, functioning pages:

* **Dashboard:** `/admin`
* **Group 1 (Institution Setup):** `/admin/institution/sessions`, `/admin/institution/classes`, `/admin/institution/curriculum`, `/admin/settings`
* **Group 2 (Admissions & Student Affairs):** `/admin/admissions`, `/admin/admissions/bulk`, `/admin/admissions/history`, `/admin/students`, `/admin/students/guardians`, `/admin/documents`
* **Group 3 (Academic Operations):** `/admin/attendance`, `/admin/timetable`, `/admin/assignments`, `/admin/exams`, `/admin/results`
* **Group 4 (Finance & Accounts):** `/admin/fees`, `/admin/fees/defaulters`, `/admin/fees/ledger`
* **Group 5 (HR & Workforce):** `/admin/hr`, `/admin/teachers`
* **Group 6 (Campus Operations):** `/admin/hostel`, `/admin/transport`
* **Group 7 (Campus Services & Resources):** `/admin/library`, `/admin/assets`, `/admin/reception`, `/admin/discipline`
* **Group 8 (Communication & Records):** `/admin/events`, `/admin/notices`, `/admin/notifications`, `/admin/documents`, `/admin/alumni-mgmt`, `/admin/site-settings`
* **Group 9 (Reports & Analytics):** `/admin/analytics`
* **Group 10 (Administration & Settings):** `/admin/users`, `/admin/settings`, `/admin/settings/audit-logs`, `/admin/settings/policies`, `/admin/governance`

