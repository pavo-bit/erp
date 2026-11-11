# SSVM ERP — Portals & Functional Modules Matrix

**Canonical Document:** `docs/MODULES_AND_PORTALS.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Application Matrix, Module Catalog & User Experiences

---

## 1. The Seven Frontends & User Experience Matrix

The frontend layer consists of seven distinct Next.js 16 (React 19) applications:

| Portal Application | Directory | Port | Target Audience | Primary Workspaces & Responsibilities |
| :--- | :--- | :---: | :--- | :--- |
| **ERP Admin** | `erp-admin` | `3000` / `3005` | School Administrators, Principals, Accountants, HR, Librarians | Central operational control center. Houses all 35 functional modules including fee cash desk, student enrollment, examinations, timetable, and fleet management. |
| **Super Admin** | `super-admin` | `3001` | SaaS Platform Owners & DevOps | Multi-tenant school provisioning, global feature flag toggles, database migration status, platform health, and audit inspection. |
| **Teacher Portal** | `teacher-portal` | `3002` | Faculty & Class Teachers | Classroom roll-call attendance, gradebook marks entry, homework assignment posting, student profile inspection, and timetable view. |
| **Student Portal** | `student-portal` | `3003` | Enrolled Students | Personal timetable, homework submission, exam mark sheets, fee invoice status, and issued library book records. |
| **Parent Portal** | `parent-portal` | `3006` | Guardians & Parents | Multi-child switcher, academic progress tracking, fee invoice overview, online payment launch, and teacher messaging. |
| **Payment Portal** | `payment-portal` | `3007` | Public / Students / Parents | Public invoice query and Razorpay checkout flow with instant receipt generation. |
| **SaaS Frontend** | `saas-frontend` | `3008` | Public Visitors / Prospective Schools | Product marketing landing, interactive feature tours, subscription pricing tiers, and self-service institution onboarding. |

---

## 2. ERP Admin 35-Module Catalog

The ERP Admin application incorporates 35 modular capability domains:

### Academic & Student Operations
1. **Admissions:** Public application review, verification, interview, and student conversion.
2. **Student SIS:** Complete student directory, roll numbers, admission numbers, documents, and guardians.
3. **Classes & Sections:** Academic class hierarchy and section allocation.
4. **Timetable:** Class, teacher, and room scheduling with collision detection.
5. **Attendance:** Daily manual student attendance and biometric device punch sync.
6. **Examinations:** Exam schedules, subject max marks, and date sheets.
7. **Gradebook & Reports:** Subject marks entry, GPA computation, and printable report cards.
8. **Academic Promotion:** Automated student promotion to the next class based on passing criteria.
9. **Homework & LMS:** Assignment creation, deadlines, submissions, and grading.
10. **Study Materials:** Educational document and syllabus file repository.

### Financial Management
11. **Fee Structures:** Tuition, admission, exam, transport, and hostel fee schedules.
12. **Fee Invoices:** Bulk monthly fee generation and invoice management.
13. **Cash Desk (Point-of-Sale):** Offline cashier collections, receipt generation, and excess advance credits.
14. **Online Payments:** Razorpay transaction reconciliation and refund processing.
15. **General Ledger:** Double-entry journal entries, trial balance, and balance sheet.
16. **Bank Reconciliation:** Bank statement upload and ledger matching.
17. **Scholarships:** Financial aid and fee concession management.
18. **Late Fine Rules:** Automated grace period and penalty rules.

### Human Resources & Payroll
19. **Staff Directory:** Faculty and staff employment profiles.
20. **Leave Management:** Staff leave applications, quotas, and approvals.
21. **Payroll Processing:** Monthly salary computation and payslip generation.
22. **Staff Attendance:** Teacher and staff biometric check-in/check-out logs.

### Campus Operations & Ancillary
23. **Library Management:** Book titles, copy accessions, issues, returns, and damage fines.
24. **Transport & Vehicles:** Fleet management with monotonic sequential fleet numbers (`Vehicle 01`), vehicle compliance documentation (RC, insurance, fitness, PUC), driver identity reuse linking canonical staff to commercial licenses, route schedules with cross-route conflict validation, and ordered boarding stops. Student commute details exposed in Parent Portal. Active allocation administration and live GPS telemetry deferred from active UI while backend endpoints remain backward-compatible.
25. **Hostel & Dormitory:** Room inventory with floor and room type metadata, multi-criteria filtering, room cards, room detail modal with footer edit action, academic context support (Class/Section for Schools, Program/Dept/Sem for Colleges), safe bed allocations with row locks, atomic transfers, and checkouts.
26. **Inventory & Procurement:** Purchase orders, vendor directory, and Goods Receipt Notes (GRN).
27. **Asset Management:** Fixed asset tracking, depreciation, and maintenance schedules.
28. **Visitor Management:** Campus visitor check-in, badges, and exit logs.
29. **Alumni Management:** Graduate directory, achievement highlights, and contribution tracking.

### Communications & Governance
30. **Notice Board:** Announcements targeted to staff, parents, or students.
31. **Direct Messaging:** Threaded internal messaging between teachers, parents, and admins.
32. **SMS & Notifications:** Bulk communication queue and delivery logs.
33. **Event Calendar:** School holiday and event schedule.
34. **Audit Logs:** Immutable audit trail of administrative actions and security events.
35. **School Settings:** Institutional branding, academic session switching, and module toggles.

---

## 3. Truthful Status of the Alumni Experience

> [!NOTE]
> **Alumni Functionality Status:**  
> The backend provides full alumni support: public registration (`POST /api/v1/auth/alumni/register`), alumni directory (`GET /api/v1/alumni`), and contributions (`POST /api/v1/alumni/contributions`). The ERP Admin portal includes an **Alumni Management module**. However, there is **no standalone, graduate-facing alumni web application**. Alumni interact via public registration forms or administrative contact.

---

## 4. Module Entitlement Matrix

Schools can enable or disable functional modules based on their subscription plan:

| Module Identifier | Required Role | Fallback When Disabled |
| :--- | :--- | :--- |
| `BIOMETRIC_ATTENDANCE` | `ERP_ADMIN` | Reverts cleanly to manual classroom roll-call attendance. |
| `TRANSPORT` | `ERP_ADMIN` | Transport menu item hidden in portals; allocations disabled. |
| `HOSTEL` | `ERP_ADMIN` | Hostel management tabs disabled; allocations hidden. |
| `LIBRARY` | `LIBRARIAN`, `ERP_ADMIN` | Library catalog inaccessible; returns HTTP 403. |
| `ONLINE_PAYMENTS` | `ERP_ADMIN` | Fee collection restricted to offline cash/cheque desk. |
| `ALUMNI` | `ERP_ADMIN` | Alumni directory hidden; registration closed. |

Enforced on all backend routes via:
```typescript
router.get("/library/books", authenticate, requireModule("LIBRARY"), handler);
```
When a module is disabled, endpoints return `HTTP 403 Forbidden { success: false, error: "Module not entitled" }`.

