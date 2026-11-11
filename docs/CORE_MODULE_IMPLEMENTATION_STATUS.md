# SSVM ERP — Core Module Implementation Status & Roadmap

**Canonical Specification:** `docs/CORE_MODULE_IMPLEMENTATION_STATUS.md`  
**Phase:** Prompt 1 — Foundation, Navigation & Core Operations

---

## 1. Group-by-Group Implementation Status

| Group # | Module Group | Status | Active Navigation Routes | Key Backend Services & Endpoints |
| :---: | :--- | :---: | :--- | :--- |
| **0** | **Standalone Dashboard** | `VERIFIED_COMPLETE` | `/admin` | Aggregated KPI stats, quick actions, global search. |
| **1** | **Institution Setup** | `VERIFIED_COMPLETE` | `/admin/settings`, `/admin/institution/sessions`, `/admin/institution/classes`, `/admin/institution/curriculum` | Class & section management, academic sessions, course catalogs, bulk import (`classes`, `subjects`). |
| **2** | **Admissions & Student Affairs**| `VERIFIED_COMPLETE` | `/admin/admissions`, `/admin/students`, `/admin/students/guardians` | CRM inquiries, student directory, parent contacts, bulk import (`students`, `guardians`). |
| **3** | **Academic Operations** | `VERIFIED_COMPLETE` | `/admin/attendance`, `/admin/timetable`, `/admin/assignments`, `/admin/exams`, `/admin/results` | Daily attendance, term timetables, classroom homework LMS, grading & report cards, bulk import (`attendance`). |
| **4** | **Finance & Accounts** | `VERIFIED_COMPLETE` | `/admin/fees`, `/admin/fees/defaulters`, `/admin/fees/ledger` | Fee invoice schedules, Razorpay checkouts, double-entry ledger, financial period close governance, bulk import (`fees`). |
| **5** | **HR & Workforce** | `VERIFIED_COMPLETE` | `/admin/hr`, `/admin/teachers` | Staff directory, department assignments, leave tracking, monthly payroll, bulk import (`staff`). |
| **6** | **Campus Operations** | `VERIFIED_COMPLETE` | `/admin/hostel`, `/admin/transport` | **Preserved Approved Scope:** Hostel rooms & resident allocations; Transport vehicles, drivers, routes & stops. (No live GPS UI or student allocation UI). |
| **7** | **Campus Services & Resources** | `VERIFIED_COMPLETE` | `/admin/library`, `/admin/assets`, `/admin/reception`, `/admin/discipline` | Book circulation, asset barcodes & custody, visitor badges, student discipline logs. |
| **8** | **Communication & Records** | `VERIFIED_COMPLETE` | `/admin/events`, `/admin/notices`, `/admin/notifications`, `/admin/documents`, `/admin/alumni-mgmt`, `/admin/site-settings` | School calendar, digital circulars, multi-channel alerts (SMS/Email/In-App), alumni directory, public CMS. |
| **9** | **Reports & Analytics** | `VERIFIED_COMPLETE` | `/admin/analytics` | High-level operational, academic, and financial reports. |
| **10** | **Administration & Settings** | `VERIFIED_COMPLETE` | `/admin/users`, `/admin/settings`, `/admin/settings/audit-logs`, `/admin/settings/policies` | RBAC user administration, school branding, system audit trail, data retention & cloud archival policies. |

---

## 2. Shared Data-Entry Integration Across Core Entities

| Module ID | Entity | UI Location | Single Create | Universal Bulk Import | Template Download | Column Index Preservation |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `students` | Student | `/admin/students` | Yes | Yes (.xlsx/.csv) | Yes | Non-compacting (NULLs preserved) |
| `guardians`| Guardian | `/admin/students/guardians`| Yes | Yes (.xlsx/.csv) | Yes | Non-compacting (NULLs preserved) |
| `staff` | Staff/Faculty | `/admin/teachers` | Yes | Yes (.xlsx/.csv) | Yes | Non-compacting (NULLs preserved) |
| `classes` | Class/Section| `/admin/institution/classes` | Yes | Yes (.xlsx/.csv) | Yes | Non-compacting (NULLs preserved) |
| `subjects` | Subject | `/admin/institution/curriculum`| Yes | Yes (.xlsx/.csv) | Yes | Non-compacting (NULLs preserved) |
| `attendance`| Attendance | `/admin/attendance` | Yes | Yes (.xlsx/.csv) | Yes | Non-compacting (NULLs preserved) |
| `fees` | Fee Structure| `/admin/fees` | Yes | Yes (.xlsx/.csv) | Yes | Non-compacting (NULLs preserved) |

