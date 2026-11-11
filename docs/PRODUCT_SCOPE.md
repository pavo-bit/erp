# SSVM ERP — Product Scope & Requirements Specification

**Canonical Document:** `docs/PRODUCT_SCOPE.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Approved Functional Scope & Boundary Definitions

---

## 1. Executive Summary & Product Overview

SSVM ERP is an integrated, multi-tenant enterprise resource planning software platform developed for primary, secondary, and higher-secondary educational institutions (K-12). It provides centralized administrative management, academic grading, double-entry financial accounting, student lifecycle tracking, attendance recording, transport monitoring, and unified multi-portal experiences for school boards, administrators, educators, guardians, and students.

---

## 2. Institutional Profiles & Curriculum Frameworks

The system supports four distinct institutional curriculum profiles, each with configurable assessment schemes, academic calendar rules, and terminology:

| Profile Identifier | Institutional Framework | Target Board / Standard | Core Academic Invariants |
| :--- | :--- | :--- | :--- |
| **STATE_BOARD** | State Education Board | State Department of Education (e.g., Odisha BSE/CHSE) | Continuous evaluation, standard percentage grading (0-100%), semester/annual exam structure, state-mandated attendance thresholds (typically 75%). |
| **CBSE** | Central Board of Secondary Education | National Curriculum Framework (NCF) | Periodic Assessments (PA1, PA2, Mid-Term, Final), 9-point grading scale ($A_1$ to $E$), co-scholastic activities, and CCE compliance. |
| **ICSE** | Indian Certificate of Secondary Education | CISCE Framework | Strict internal assessment (20%) + external examination (80%), practical laboratory marks, percentage-to-grade mapping ($1$ to $9$). |
| **INTERNATIONAL** | International Baccalaureate / Cambridge | IB / IGCSE / Cambridge Assessment | Criterion-referenced grading ($1$ to $7$), GPA computation, continuous formative and summative assignments, CAS tracking. |

Each school record in the `School` model specifies its default profile via configuration JSON, governing report card calculations and academic promotion criteria.

---

## 3. Approved Functional Scope

The approved product scope comprises 35 modular capability domains grouped into five operational pillars:

### Pillar 1: Academic & Classroom Operations
- **Student Information System (SIS):** Complete student demographics, guardian records, admission numbers, enrollment status, blood group, medical alerts, and photo storage.
- **Academic Hierarchy:** Multi-session scheduling (`AcademicSession`), Classes (`Class`), Sections (`Section`), and Class Teacher assignments.
- **Timetable & Scheduling:** Conflict-free timetable engine detecting and preventing teacher double-booking, room allocation collisions, and section overlap.
- **Attendance Management:** Daily student roll call (PRESENT, ABSENT, LATE, HOLIDAY), section-scoped queries, absence notifications, and biometric hardware punch ingestion.
- **Examination & Gradebook:** Configurable assessment profiles, subject weightings, maximum marks validation, student marks entry, GPA/percentage calculation, and printable report cards.
- **Academic Promotion:** Automated eligibility evaluation checking minimum attendance percentage ($\ge 75\%$) and passing grades across all core subjects, promoting students to the next class or retaining them.
- **LMS & Homework:** Teacher assignment creation, file attachments, student homework submission tracking, deadlines, and teacher grading.

### Pillar 2: Financial Governance & Double-Entry Accounting
- **Fee Configuration:** Fee categories, class-level fee structures, recurring monthly fees, discounts, and late fine calculation rules.
- **Cash Desk & Offline Collections:** Cashier fee collection screen with instant Indian English words amount conversion, partial payment allocation against oldest outstanding invoices, advance fee liability creation (`StudentAdvanceCredit`), and duplicate-safe printable receipts.
- **Online Payments:** Student/Parent payment portal integration with Razorpay order creation, payment verification, and idempotency-locked webhook processing.
- **General Ledger Posting:** Strict double-entry accounting ($\sum \text{Dr} \equiv \sum \text{Cr}$) automatically posting journals for fee receipts, refunds, advance liabilities, and salary expenses.
- **Bank Reconciliation:** Upload of bank statements, automated matching against posted ledger transactions, statement balance verification, and unmatched item reporting.

### Pillar 3: Human Resources & Payroll
- **Staff Directory:** Employee profiles, department designations, qualification details, contact information, and role assignments (`TEACHER`, `ACCOUNTANT`, `HR`, `LIBRARIAN`, `RECEPTIONIST`).
- **Leave Management:** Leave applications, leave entitlement quotas, balance calculation, and approval workflows.
- **Payroll Processing:** Salary structures, monthly payroll runs, automated tax and deduction computation, double-entry expense posting (`5010-SAL` $\to$ `1010-BANK`), and printable PDF payslips.

### Pillar 4: Campus Operations & Logistics
- **Library Management:** Book title cataloguing, individual copy accession numbers (`ACC-xxxx`), issue and return tracking, renewal limits, damage penalty assessments, and automatic overdue fine computation.
- **Transport & Vehicles:** Fleet inventory with sequential numbering (`Vehicle 01`), compliance documentation (RC, insurance, fitness, PUC), driver identity reuse linking canonical staff to commercial licenses, route schedules with cross-route conflict validation, and ordered boarding stops. Student commute details exposed in Parent Portal. Active allocation administration and live GPS telemetry deferred from active UI while backend endpoints remain backward-compatible.
- **Hostel & Dormitory:** Room inventory with floor and room type metadata, multi-criteria filtering, room cards, room detail modal with footer edit action, academic context support (Class/Section for Schools, Program/Dept/Sem for Colleges), safe bed allocations with row locks, atomic transfers, and checkouts.
- **Procurement & Inventory:** Vendor cataloguing, Purchase Orders (PO), serializable Goods Receipt Note (GRN) generation, stock ledger increment, and Accounts Payable ledger integration.

### Pillar 5: Communications, Safety & SaaS Management
- **Communications Hub:** Notice board announcements with role targeting (ALL, TEACHERS, STUDENTS, PARENTS), SMS outbox queue, and in-app threaded direct messaging.
- **Self-Healing Fault Isolation (SHFI):** Automated ingestion of operational faults (e.g., gateway timeouts, database connection errors), automatic incident generation, severity classification, and status tracking.
- **Multi-Tenant SaaS Onboarding:** Self-service institution registration, automated chart-of-accounts provisioning, tenant isolation enforcement, and feature flag management.

---

## 4. Core vs. Optional Capabilities

| Feature Domain | Tier Classification | Availability Condition |
| :--- | :--- | :--- |
| Student SIS & Admissions | **Core** | Standard across all schools; always active. |
| Classes, Sections & Timetable | **Core** | Standard across all schools; always active. |
| Attendance (Manual Roll Call) | **Core** | Standard across all schools; always active. |
| Fees & Cash Desk Operations | **Core** | Standard across all schools; always active. |
| General Ledger Double-Entry | **Core** | Standard across all schools; always active. |
| Examinations & Report Cards | **Core** | Standard across all schools; always active. |
| Biometric Hardware Ingestion | **Optional** | Requires `BIOMETRIC_ATTENDANCE` module entitlement and physical devices. |
| Transport GPS Tracking | **Optional** | Requires `TRANSPORT` module entitlement and vehicle GPS trackers. |
| Hostel & Dormitory Management | **Optional** | Requires `HOSTEL` module entitlement. |
| Library Book Cataloguing | **Optional** | Requires `LIBRARY` module entitlement. |
| Online Razorpay Gateway | **Optional** | Requires school merchant credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`). |

---

## 5. Explicit Out-of-Scope Items

To prevent scope creep and maintain architectural integrity, the following items are explicitly **out of scope**:
1. **Third-Party Live Settlement Banking:** Direct automated NEFT/RTGS bank payouts without cashier reconciliation.
2. **Custom Third-Party LMS Integrations:** Embedding external systems such as Moodle, Canvas, or Google Classroom beyond standard file attachments and assignment submissions.
3. **Automated Facial Recognition Training:** High-throughput on-server neural video processing (biometric attendance relies on device-side verification matching IDs).
4. **Standalone Graduate-Facing Alumni Portal:** Alumni data is managed via the ERP Admin and public registration routes; a separate standalone multi-page social networking application for alumni is not part of this core scope.

