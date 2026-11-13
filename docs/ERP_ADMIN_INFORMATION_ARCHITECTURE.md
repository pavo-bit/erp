# SSVM ERP — ERP Admin Information Architecture

**Canonical Specification:** `docs/ERP_ADMIN_INFORMATION_ARCHITECTURE.md`  
**Application Target:** `erp-admin` (Next.js 16, React 19)  
**Execution Standard:** Single standalone Dashboard followed by exactly ten expandable module groups.

---

## 1. Executive Principles

1. **Standalone Dashboard:** The administrative workspace begins with a standalone `Dashboard` entry giving immediate high-level operational KPIs.
2. **Ten Canonical Expandable Groups:** Navigation items are partitioned into ten domain groups with expandable accordion toggles, active parent highlighting, active child highlighting, and mobile responsiveness.
3. **No Standalone Governance Group:** All genuine governance functionality has been relocated to its functional home:
   - Financial Close & Periods $\rightarrow$ `Finance & Accounts` $\rightarrow$ `Accounting & Ledger` (`/admin/fees/ledger`)
   - Audit Logs $\rightarrow$ `Administration & Settings` $\rightarrow$ `Audit Logs` (`/admin/settings/audit-logs`)
   - Policies & Data Retention $\rightarrow$ `Administration & Settings` $\rightarrow$ `Policies & Data Retention` (`/admin/settings/policies`)
4. **Preserved Campus Operations:** Group 6 retains the exact approved implementation:
   - `Hostel Management` (`/admin/hostel`)
   - `Transport & Vehicles` (`/admin/transport`) with the four active sections: `Overview`, `Vehicles`, `Drivers`, and `Routes & Stops`.
5. **Dynamic Entitlement Filtering:** Every group and child navigation item is guarded by institutional entitlements (`useSchoolModules()`). Unentitled modules are hidden from navigation and protected server-side with HTTP 403 (`MODULE_DISABLED`).

---

## 2. Complete Navigation Hierarchy

```
ERP Admin Navigation
│
├── 📊 Dashboard (/admin) [STANDALONE]
│
├── 🏛️ Group 1 — Institution Setup
│   ├── 🏫 School & Campus Management (/admin/institution/campus)
│   ├── 📅 Academic Sessions & Calendar (/admin/institution/sessions)
│   ├── 🏷️ Classes, Sections & Grades (/admin/institution/classes)
│   ├── 🎓 Programs, Branches & Departments (/admin/institution/programs)
│   ├── 📖 Curriculum & Subjects (/admin/institution/curriculum)
│   └── ⚙️ Academic Configuration (/admin/institution/academic-config)
│
├── 👥 Group 2 — Admissions & Student Affairs
│   ├── 📋 Admissions & CRM (/admin/admissions)
│   ├── 👨‍🎓 Student Directory (/admin/students)
│   ├── 🔄 Student Lifecycle (/admin/students/lifecycle)
│   └── 👨‍👩‍👧 Parents & Guardians (/admin/students/guardians)
│
├── 📚 Group 3 — Academic Operations
│   ├── ✅ Attendance (/admin/attendance)
│   ├── ⏱️ Timetable & Substitution (/admin/timetable)
│   ├── 📝 Assignments & LMS (/admin/assignments)
│   ├── 📑 Examination Management (/admin/exams)
│   └── 🏆 Results & Report Cards (/admin/results)
│
├── 💰 Group 4 — Finance & Accounts
│   ├── 💳 Fee Management (/admin/fees)
│   ├── 💵 Payments & Collection (/admin/fees/payments)
│   ├── 📒 Accounting & Ledger (/admin/fees/ledger)
│   └── 🎁 Scholarships & Financial Aid (/admin/fees/scholarships)
│
├── 👔 Group 5 — HR & Workforce
│   ├── 📇 Staff Directory (/admin/hr/staff)
│   ├── 👨‍🏫 Faculty & Teachers (/admin/teachers)
│   ├── 🏢 Departments & Designations (/admin/hr/departments)
│   ├── ⏱️ Staff Attendance & Leave (/admin/hr/attendance)
│   ├── 📋 HR Operations (/admin/hr/operations)
│   └── 💵 Payroll (/admin/hr/payroll)
│
├── 🏫 Group 6 — Campus Operations [PRESERVED APPROVED IMPLEMENTATION]
│   ├── 🛏️ Hostel Management (/admin/hostel)
│   └── 🚌 Transport & Vehicles (/admin/transport)
│
├── 🛎️ Group 7 — Campus Services & Resources
│   ├── 📖 Library Management (/admin/library)
│   ├── 📦 Inventory & Assets (/admin/assets)
│   ├── 🤝 Procurement & Vendors (/admin/procurement)
│   ├── 🛎️ Reception & Visitors (/admin/reception)
│   ├── ⚖️ Discipline & Student Welfare (/admin/discipline)
│   ├── 🩺 Health & Medical (/admin/health)
│   ├── ⚽ Sports & Activities (/admin/sports)
│   └── 🍽️ Canteen & Meals (/admin/canteen)
│
├── 📢 Group 8 — Communication & Records
│   ├── 🗓️ Events & Calendar (/admin/events)
│   ├── 📌 Notices & Announcements (/admin/notices)
│   ├── 🔔 Communication & Notifications (/admin/notifications)
│   ├── 📜 Documents & Certificates (/admin/documents)
│   ├── 🎓 Alumni Management (/admin/alumni-mgmt)
│   └── 🌐 School Website & CMS (/admin/site-settings)
│
├── 📈 Group 9 — Reports & Analytics
│   ├── 📊 Overview (/admin/analytics)
│   ├── 📑 Academic Reports (/admin/analytics/academic)
│   ├── 💹 Financial Reports (/admin/analytics/financial)
│   └── 📋 Operational Reports (/admin/analytics/operational)
│
└── ⚙️ Group 10 — Administration & Settings
    ├── 👤 User Management (/admin/users)
    ├── 🛡️ Roles & Permissions (/admin/settings/roles)
    ├── 🏢 Institution Settings (/admin/settings)
    ├── 🏫 Campus Settings (/admin/settings/campus)
    ├── ⚖️ Academic & Financial Defaults (/admin/settings/defaults)
    ├── 🔒 Security & Access (/admin/settings/security)
    ├── 📜 Audit Logs (/admin/settings/audit-logs)
    └── 🛡️ Policies & Data Retention (/admin/settings/policies)
```

---

## 3. Module Entitlement Mapping Table

| Navigation Item | Module Code | Default Role Access | Unentitled Behavior |
| :--- | :---: | :--- | :--- |
| **Institution Setup** | `CORE` | `ERP_ADMIN`, `SUPER_ADMIN` | Always available (Core Tenant Master). |
| **Admissions & CRM** | `ADMISSIONS` | `ERP_ADMIN`, `RECEPTIONIST` | Hidden from sidebar; 403 on `/api/v1/admissions`. |
| **Student Directory** | `CORE` | `ERP_ADMIN`, `TEACHER` | Core data; always active. |
| **Attendance** | `ATTENDANCE` | `ERP_ADMIN`, `TEACHER` | Hidden from sidebar; 403 on `/api/v1/attendance`. |
| **Examinations & Results** | `EXAMS` | `ERP_ADMIN`, `TEACHER` | Hidden from sidebar; 403 on `/api/v1/exams`. |
| **Fee Management** | `FEES` | `ERP_ADMIN`, `ACCOUNTANT` | Hidden from sidebar; 403 on `/api/v1/fees`. |
| **HR & Payroll** | `HR` | `ERP_ADMIN`, `HR` | Hidden from sidebar; 403 on `/api/v1/hr`. |
| **Hostel Management** | `HOSTEL` | `ERP_ADMIN` | Hidden from sidebar; 403 on `/api/v1/ancillary/hostel`. |
| **Transport & Vehicles** | `TRANSPORT` | `ERP_ADMIN` | Hidden from sidebar; 403 on `/api/v1/admin/transport`. |
| **Library Management** | `LIBRARY` | `ERP_ADMIN`, `LIBRARIAN` | Hidden from sidebar; 403 on `/api/v1/library`. |
| **Inventory & Assets** | `ASSETS` | `ERP_ADMIN`, `ASSET_MANAGER` | Hidden from sidebar; 403 on `/api/v1/assets`. |
| **Reception & Visitors** | `RECEPTION` | `ERP_ADMIN`, `RECEPTIONIST` | Hidden from sidebar; 403 on `/api/v1/reception`. |
| **Alumni Management** | `ALUMNI` | `ERP_ADMIN` | Hidden from sidebar; 403 on `/api/v1/alumni`. |

