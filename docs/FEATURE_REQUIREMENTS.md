# SSVM ERP Feature Requirements Register

Updated: 2026-10-31  
Status: Initial code-derived register; not yet reviewed/approved by business owners.

This register defines a traceable workstream baseline. It does not claim the features are complete. Detailed per-page/per-endpoint requirements remain to be inventoried.

| Requirement ID | Module | Expected outcome | Frontend(s) | Backend / data | Priority | Status |
|---|---|---|---|---|---|---|
| ID-001 | Authentication and identity | Secure login/session lifecycle and consistent role-bound identity | All applicable portals | `/api/v1/auth`, User/Student/Teacher | Critical | IN_PROGRESS; audit required |
| SEC-001 | Authorization | Every operation has authenticated role and ownership policy | All | All mounted routers | Critical | IN_PROGRESS; matrix incomplete |
| TEN-001 | Tenant isolation | School-owned records cannot cross school boundaries | All | Prisma/PostgreSQL/RLS | Critical | NOT_STARTED; unverified |
| STU-001 | Student records | Authorized student lifecycle and profile access | ERP admin, student, parent, teacher | students, users, academic models | High | NOT_STARTED; inventory required |
| EDU-001 | Academic workflows | Authorized attendance, assignments, timetable, exams and results | ERP admin, student, parent, teacher | attendance, assignments, exams, results | High | NOT_STARTED; workflow tests absent |
| FIN-001 | Fees and payments | Accurate authorized invoice, payment, receipt and balance lifecycle | ERP admin, parent, payment | invoices, payments, ledger | Critical | IN_PROGRESS; core integrity unverified |
| FIN-002 | Accounting | Balanced immutable entries, reconciliation and period close | ERP admin, super-admin | finance, ledger, reconciliation | Critical | NOT_STARTED; unverified |
| OPS-001 | Inventory/procurement | Correct stock changes and approval/receipt workflow | ERP admin | inventory, procurement, vendors, PO | High | NOT_STARTED; workflow inventory required |
| DOC-001 | Documents | Authorized school/owner-scoped private file access | All applicable portals | documents/storage/uploads | Critical | IN_PROGRESS; partial implementation |
| GOV-001 | Governance/retention | Validated, scoped, previewable, auditable retention | Super-admin, ERP admin | governance workflows/retention | High | IN_PROGRESS; safeguards incomplete |
| REP-001 | Reporting and exports | Real authorized records and tenant-safe exports | ERP admin, super-admin, portals | reports/stats/export | High | NOT_STARTED; audit required |
| COM-001 | Communication/public content | Authorized notices, events, CMS and messaging | All applicable portals | notices/events/CMS/messages | Medium | NOT_STARTED; audit required |
| ADM-001 | Platform operations | Protected backups, queues, audit and SaaS configuration | Super-admin | admin routers/jobs | Critical | NOT_STARTED; audit required |
| UX-001 | Portal quality | Correct contracts, loading/error/empty states and accessibility | All seven portals | API clients/contracts | High | NOT_STARTED; matrix required |
| OPS-002 | Install/deploy/recovery | Reproducible clean install, migrations, monitoring and restore | N/A | Docker/CI/DB/monitoring | Critical | IN_PROGRESS; unverified |

Each row needs child requirements for every endpoint, page and business rule before a weighted completion score can be calculated.
