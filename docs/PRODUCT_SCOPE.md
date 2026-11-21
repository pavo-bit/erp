# SSVM ERP — Product Core Specification

**Canonical document:** `docs/PRODUCT_SCOPE.md`  
**Document role:** Authoritative product definition and business-behaviour specification  
**Status:** Product specification baseline — implementation status is tracked separately  
**Audience:** Product owner, developers, architects, QA engineers, implementation partners and AI coding agents

---

## Document authority and how to use this specification

This document defines **what SSVM ERP is intended to be, who uses it, what each application and module is responsible for, how the important business workflows behave, and which boundaries must not be crossed**. It is the product-level source of truth. It is not proof that the described functionality has already been implemented.

All implementation work must remain consistent with this specification and the technical contracts in the canonical documentation set.

### Normative language

- **MUST / MUST NOT:** A mandatory product or security requirement. An implementation that violates it is not acceptable.
- **SHOULD / SHOULD NOT:** The default expected behaviour. A deviation requires an explicit, documented reason and product-owner approval where it changes user-visible behaviour.
- **MAY:** An allowed capability, subject to entitlement, permissions, configuration and implementation status.
- **Deferred:** Not part of the current active delivery scope. It must not be silently introduced as a substitute or assumed to be approved.
- **Open decision:** A requirement that still needs product-owner resolution. An agent or developer must not invent a policy to fill the gap.

### Required behaviour for developers and AI coding agents

1. Treat this document as the authority for product purpose, actors, workflows, scope and user-visible behaviour.
2. Treat `SYSTEM_ARCHITECTURE.md`, `SECURITY_AND_TENANCY.md`, `DATABASE_AND_FINANCIAL_INTEGRITY.md`, and `API_AND_INTEGRATIONS.md` as the authority for technical design and contracts. A product requirement does not authorise bypassing a technical security or data-integrity rule.
3. Treat `PROJECT_PLAN_HIGH_LEVEL.md` and `PROJECT_PLAN_LOW_LEVEL.md` as execution plans, not as permission to redefine the product.
4. Treat `PROJECT_STATUS.md` as the evidence-based account of what is implemented, tested, unverified, blocked or remaining. A requirement in this document must never be reported as complete merely because it is described here.
5. Do not invent new roles, screens, workflows, business rules, integrations, defaults, financial policies or automatic actions that are not specified here or in an approved technical contract.
6. Do not remove, simplify or bypass a requirement simply because it is difficult to implement. Identify the dependency or blocker and report it.
7. When two requirements appear to conflict, stop and record the exact conflict and affected workflows. Do not silently choose one interpretation.
8. When a necessary rule is not specified, record it as an **Open decision** with the options and consequences. Do not guess. Continue only on work that does not depend on that decision.
9. Before implementing a feature, identify its actors, permissions, tenant scope, module entitlement, data ownership, workflow, failure behaviour, audit requirements and acceptance criteria.
10. Do not claim production readiness from a passing build alone. Use the release-readiness definitions in Section 22.

### Related canonical documents

| Document | Responsibility |
|---|---|
| `README.md` | Repository entry point and project overview |
| `AGENTS.md` | Repository-wide engineering and agent instructions |
| `docs/PRODUCT_SCOPE.md` | **This document:** product definition and business behaviour |
| `docs/SYSTEM_ARCHITECTURE.md` | System architecture and technical component boundaries |
| `docs/SECURITY_AND_TENANCY.md` | Authentication, authorization, tenant isolation and security controls |
| `docs/DATABASE_AND_FINANCIAL_INTEGRITY.md` | Data integrity, persistence and financial invariants |
| `docs/API_AND_INTEGRATIONS.md` | API contracts, integrations and cross-module communication |
| `docs/MODULES_AND_PORTALS.md` | Module and portal implementation inventory |
| `docs/DEVELOPMENT_AND_TESTING.md` | Development and verification practices |
| `docs/DEPLOYMENT_AND_OPERATIONS.md` | Deployment, operations, observability and recovery |
| `docs/PROJECT_PLAN_HIGH_LEVEL.md` | Programme phases and delivery outcomes |
| `docs/PROJECT_PLAN_LOW_LEVEL.md` | Work packages, dependencies and acceptance tasks |
| `docs/PROJECT_STATUS.md` | Evidence-based implementation and release status |

---

# Part I — Product identity and operating model

## 1. Executive summary and product vision

SSVM ERP is a multi-tenant, modular school enterprise resource planning platform for primary, secondary and higher-secondary educational institutions (K–12). It brings school administration, student lifecycle management, academic operations, financial governance, staff management, campus operations, communication and school oversight into one connected system.

The product serves multiple independent schools on a shared software platform. Each school is a separate tenant: its students, guardians, staff, academic records, financial records, settings, files and operational data must remain isolated from every other school.

The product has:

- **Seven web portals** for platform governance, school administration, teachers, students, parents, payment journeys and SaaS-facing registration/customer journeys.
- **Two dedicated Android applications:** one Parent App and one Staff App. The Staff App serves teachers and authorised management/staff roles through role-based interfaces.
- **One shared backend and data platform** that applies the same authentication, authorization, tenancy, business rules, audit and persistence controls regardless of which client initiates a request.
- **Core and optional modules** that can be enabled and governed according to the school’s plan and entitlements.

The existing approved capability inventory describes **35 modular capability domains grouped into five operational pillars**: academic/classroom operations; financial governance/accounting; human resources/payroll; campus operations/logistics; and communications, safety and SaaS management. The capabilities are consolidated and explained throughout this specification; the count does not mean that there must be 35 separately deployable services.

The objective is not merely to provide a collection of screens. SSVM ERP must preserve the correctness of school records and financial transactions while enabling each authorised user to perform their work through the right application.

## 2. Product goals

The product is intended to:

1. Provide a consistent operational system for multiple independent schools.
2. Give the platform owner a controlled way to onboard, govern and support schools.
3. Give each school’s ERP Admin authority over that school’s permitted configuration and operations without access to other tenants.
4. Connect admissions, student identity, guardian relationships, class allocation and academic history.
5. Connect school fees, invoices, collections, receipts, advance balances and accounting records without losing financial integrity.
6. Support academic operations including sessions, classes, sections, timetable, attendance, assessments, results and promotion.
7. Support staff administration, leave and payroll with controlled approvals.
8. Support optional campus services such as transport, hostel, library and procurement when enabled.
9. Provide parents and staff with appropriately limited Android experiences.
10. Preserve an auditable history of important actions and provide reliable operational visibility and recovery capabilities.

## 3. Non-negotiable product principles

| Principle | Required product behaviour |
|---|---|
| Tenant isolation | A user must only access data belonging to the school or platform scope they are authorised for. A client-supplied school ID must never be sufficient proof of tenant access. |
| Server-enforced authorization | The backend must enforce role, permission, tenant and module rules. Hiding a button is not authorization. |
| Correct identity | A student has a durable institutional identity. Re-admission, transfer or promotion must not accidentally create a duplicate person or erase historical records. |
| Guardian relationships | One parent/guardian may be linked to multiple children. A guardian only sees children linked through an authorised, verified relationship. |
| Financial correctness | Money must use exact decimal or integer-minor-unit representation, never binary floating-point arithmetic for accounting. Posted journals must balance. |
| Safe numbering | School-specific admission, receipt, GRN and other controlled numbers must be generated safely under concurrency and must not collide. |
| History preservation | Important academic, financial, identity and administrative history must not be erased by routine edits or soft deletion. |
| No false success | The system must not report a payment, message, notification, backup, provider action or other external operation as successful unless the corresponding result is confirmed according to its contract. |
| Auditable privilege | Sensitive changes, financial actions, access elevation and administrative interventions must produce attributable audit records. |
| Entitlement enforcement | Optional module availability must be checked in the backend as well as reflected in the UI. |
| Failure containment | A failure in a notification provider or background task must not silently corrupt unrelated school transactions. |
| Forward-only data evolution | Released database migrations are immutable. Schema changes are introduced through new, forward migrations and safe rollout procedures. |
| Evidence-based completion | A feature is complete only when its persisted behaviour, authorization, tenancy, failure handling, audit and acceptance tests meet its requirements. |

## 4. Institutional profiles and curriculum frameworks

The current product baseline includes four institutional curriculum profiles. Each school selects and configures the profile that governs its academic terminology, calendar, assessment configuration and report-card rules.

| Profile identifier | Institutional framework | Target framework | Existing product baseline |
|---|---|---|---|
| `STATE_BOARD` | State Education Board | State Department of Education, including Odisha BSE/CHSE contexts | Continuous evaluation, percentage marks (0–100%), configurable semester/annual examination structure and applicable attendance rules (the original baseline cites 75% as a typical threshold). |
| `CBSE` | Central Board of Secondary Education | CBSE/NCF context | The original baseline cites periodic assessments (PA1, PA2, Mid-Term and Final), an A1–E nine-point grade range, co-scholastic activities and CCE-related support. |
| `ICSE` | Indian Certificate of Secondary Education | CISCE | The original baseline cites a 20% internal / 80% external assessment example, practical laboratory marks and grade mapping from 1 to 9. |
| `INTERNATIONAL` | International curriculum | IB, IGCSE or Cambridge contexts | The original baseline cites criterion-referenced grading (1–7), GPA computation, formative/summative work and CAS tracking. |

The examples above preserve the existing product baseline. They are configuration targets, not a claim that every cited percentage, grade scale, attendance threshold or regulatory requirement has been independently validated for every board, class, subject or academic year. The system MUST support school-approved assessment schemes rather than hardcoding one grading scheme for every institution. Before a profile is used for a live school, its exact current rules must be approved and configured for the applicable curriculum.

Each school’s academic profile and assessment configuration must govern the applicable report-card calculations and academic rules. A change of profile or scheme must not silently recalculate historical results; the effect on already published academic records must be explicitly controlled and auditable.

---

# Part II — Applications, users and access boundaries

## 5. Application ecosystem

SSVM ERP consists of seven web portals and two Android applications. These clients are different interfaces to one shared product, not separate systems with independent business rules.

### 5.1 Web portals

| Portal | Primary audience | Product responsibility |
|---|---|---|
| **Super Admin** (`super-admin`) | Platform owner and authorised platform staff | Govern the SaaS platform, manage school lifecycle, plans and entitlements, monitor platform-level operations, and perform controlled support/security/finance functions. |
| **ERP Admin** (`erp-admin`) | Administrator of one school | Manage that school’s permitted users, academic setup, admissions, finance, modules, facilities, reports, settings and day-to-day school operations. |
| **Teacher Portal** (`teacher-portal`) | Teachers and authorised academic staff | Perform assigned academic work such as timetable viewing, class/subject access, attendance, homework, assessment entry and permitted student information access. |
| **Student Portal** (`student-portal`) | Students | View their own authorised academic information, timetable, attendance, homework, examinations, results, notices and other enabled student-facing information. |
| **Parent Portal** (`parent-portal`) | Parents and guardians | View parent-level information and information for each linked child, including relevant attendance, academics, fees, receipts, notices and optional facility details. |
| **Payment Portal** (`payment-portal`) | Parent/student payer and payment journey users | Support the authorised fee-payment journey, payment status, verification and receipt experience. It must use the canonical finance transaction flow. |
| **SaaS Frontend** (`saas-frontend`) | Prospective schools and SaaS customers | Present the SaaS-facing information and registration/onboarding request journey. A submitted request is not automatically an active school unless an explicitly approved provisioning policy says so. |

A portal’s existence does not automatically grant every listed user the ability to change every record. Each operation remains permission-, tenant-, workflow- and entitlement-controlled.

### 5.2 Parent Android application

The product includes one dedicated Parent Android App. It provides a mobile experience for a parent or guardian and brings together the parent’s own account context with authorised information from their linked child or children’s Student Portal records.

The application MUST:

- Authenticate the parent/guardian account and resolve the authorised school context.
- Support a parent or guardian linked to more than one child, with an explicit child selector or equivalent clear context indicator.
- Show only children for whom the authenticated guardian has an active, authorised relationship.
- Provide access to permitted student information such as attendance, timetable, homework, assessments, published results, notices and school updates.
- Provide parent-facing information such as profile details, communication preferences and school communications where supported.
- Show relevant fee dues, payment history and receipts when the account is authorised to see them.
- Show transport or hostel information only when the relevant module is enabled and the child has the appropriate relationship/allocation.
- Provide clear loading, empty, unavailable and error states; stale or unavailable data must not be presented as current confirmed information.
- Receive notifications through the approved notification system, subject to device permission and provider delivery status.

The app MUST NOT turn the parent into a student account or grant unrestricted impersonation of a child. The parent views child data through a verified guardian relationship and parent-specific authorization.

The current product decision is one combined Parent App, not separate parent and student Android apps. The Student Portal remains a web portal. Its authorised student-facing information is made visible inside the Parent App where appropriate.

**Payment entry point open decision:** Fee balances and receipts are in the Parent App’s information scope. Whether a parent may initiate an online payment directly inside the Android app, or must be redirected to the existing Payment Portal/payment flow, must follow the approved payment-channel policy. Do not build a second payment implementation or bypass the canonical payment verification and ledger flow.

### 5.3 Staff Android application

The product includes one dedicated Staff Android App for teachers, management and other school staff who have been granted mobile access. It is one application with role-aware screens and capabilities, not separate teacher and management apps.

The app MUST:

- Authenticate an individual staff identity; shared staff accounts are not acceptable.
- Resolve the active school, staff record, assigned roles and permissions from trusted server-side identity context.
- Present only features and records the current user is authorised to access.
- Support teachers with relevant routine academic work, such as viewing assigned classes and timetable, viewing authorised student/class information, marking permitted attendance, managing assigned homework and entering permitted academic updates.
- Support management users with permitted dashboards, monitoring, notices, alerts and specifically authorised routine actions.
- Support other staff roles only through the functions granted to those roles and enabled modules.
- Preserve audit attribution to the actual staff member who performed an action.
- Provide clear offline/unavailable behaviour. A queued action must not appear as committed until the server confirms it.

The same login application does not mean every staff member has the same permissions. Teacher, management, accountant, HR, receptionist, librarian, transport and hostel responsibilities must be separately authorised according to role and assigned scope.

### 5.4 Mobile versus web-only operation boundary

The Android applications are companion applications for parent visibility and routine staff work. They are not miniature copies of the complete ERP Admin or Super Admin systems.

**The following major administrative and high-impact operational workflows are web-only in the current product scope:**

- Admission registration, admission approval/processing, readmission and transfer processing.
- Bulk student import, bulk identity resolution and student enrollment administration.
- Student promotion, retention decisions and major historical student-record changes.
- Academic-session, class, section, shift, curriculum and institution-wide timetable configuration.
- Fee-structure configuration, discount/fine policy configuration, financial-period operations, ledger administration and financial reconciliation.
- Payroll-run processing, payroll final approval and sensitive salary-structure administration.
- School master settings, module provisioning, entitlement changes, user/role administration and security policy changes.
- Hostel/transport master configuration, fleet/route/room setup and authoritative student allocation administration.
- Procurement administration, purchase-order control, GRN administration and stock/financial adjustments.
- Super Admin school lifecycle, subscription/plan administration, privileged support sessions and platform-wide governance.

This list is a minimum boundary, not an exhaustive permission matrix. A new high-impact workflow must be classified before it is exposed in mobile.

Routine mobile actions such as a teacher marking assigned-class attendance may be allowed. Such actions still require server-side validation, audit, duplicate protection, date/class scope checks and any relevant approval process.

**Enforcement requirement:** Web-only restrictions MUST be enforced at the API/service authorization layer. Hiding or disabling a mobile button is not enough. A mobile client must not be able to call an endpoint and complete a web-only operation by crafting a request. Where a workflow has distinct read and write capabilities, read-only mobile visibility may be allowed while write/approval endpoints remain unavailable.

### 5.5 Consistent behaviour across clients

The same business rule must apply whether a request originates from a web portal, Android app, integration or background worker. Client type may be used as contextual audit metadata and to enforce an explicit channel restriction, but it must not weaken identity, role or tenant authorization.

A business action must have one canonical backend implementation. The Parent App, Staff App, web portals and payment journey must not maintain separate competing implementations of finance, attendance, admission or other authoritative business logic.

## 6. User, role and authority model

The product distinguishes platform-level authority from school-level authority. A person’s role is not a substitute for a tenant scope; the system must know both who the person is and which school or platform resource they are authorised to act upon.

### 6.1 Platform roles

The platform staff model is intended to support separate, least-privilege identities for:

| Platform role | Intended responsibility | Boundary |
|---|---|---|
| **Owner** | Overall platform ownership and exceptional approval | Highest platform authority; sensitive/destructive operations should require additional approval where configured. |
| **Operations** | School provisioning, service operations and platform availability | No automatic access to school financial or personal records beyond assigned operational need. |
| **Support** | Assist a school with authorised support cases | Must use the controlled support-session process in Section 7.5. |
| **Finance** | Platform subscription billing, invoices, payment status and plan finance | Does not gain unrestricted access to school fee ledgers. |
| **Security** | Security events, access reviews, incident response and privileged audit | Access is limited to security responsibilities. |
| **Data Governance** | Data lifecycle, export, retention and governed data operations | Data export or deletion must follow approval and audit requirements. |
| **Engineer** | Platform maintenance and technical operations | Engineering access does not imply routine permission to inspect or modify school business data. |

These are separate platform responsibilities. They must not be implemented as one broad, universally assigned platform-admin permission if the role system can enforce separation of duties.

### 6.2 School roles

The school-level roles include, subject to the school’s actual staffing model and enabled modules:

- **ERP Admin / School Admin:** Administers one school and its permitted configuration and operations.
- **Management:** Monitors and manages assigned operational areas according to granted permissions. The title alone must not grant unrestricted access.
- **Teacher:** Performs assigned teaching and academic responsibilities.
- **Accountant / Cashier:** Performs authorised fee and collection tasks; posting, reversal and reconciliation rights are separately controlled.
- **HR:** Manages authorised staff, leave and payroll preparation tasks.
- **Librarian:** Manages library catalogue, copy circulation and related tasks when the module is enabled.
- **Receptionist / Admission staff:** Handles permitted reception and admission-support data entry. Formal admission lifecycle and bulk administrative operations remain web-only.
- **Transport staff:** Handles authorised transport operational information when enabled.
- **Hostel staff:** Handles authorised hostel operational information when enabled.
- **Student:** Accesses only their own authorised student information through the Student Portal.
- **Parent / Guardian:** Accesses their own account and linked children’s authorised information through the Parent Portal and Parent App.

A school may assign multiple roles to one staff member where appropriate. The effective permission set must be the result of explicit assignments and scope rules, not merely a display label.

### 6.3 Permission dimensions

Authorization must consider at least:

1. **Identity:** Which authenticated user or service is making the request?
2. **Tenant:** Which school does the resource belong to, and is the user authorised for that school?
3. **Role and permission:** Is the action explicitly granted?
4. **Resource relationship:** Is the user assigned to this class, section, student, department, facility or transaction?
5. **Module entitlement:** Is the required optional module enabled and in an allowed lifecycle state?
6. **Workflow state:** Is the requested transition valid at this point in the process?
7. **Channel restriction:** Is the operation permitted from this client type, including the web-only restrictions?
8. **Additional approval:** Does the operation require a second approver or elevated authorization?

A user may be permitted to view a record but not edit, approve, reverse, export or delete it. Those actions must be represented as distinct permissions where their risk differs.

---

# Part III — SaaS governance and module model

## 7. Multi-tenant SaaS and school lifecycle

### 7.1 Independent school tenants

Each onboarded school is an independent tenant. A tenant owns its institutional settings, students, guardians, staff, academic sessions, classes, sections, attendance, examinations, fees, accounting records, optional-module data, files, notices and audit history.

The platform may host many schools, but one school’s administrators, staff, parents and students must never gain access to another school’s data. Cross-school platform reporting is limited to explicit platform-level data and privileges; it must not become an uncontrolled data-browsing capability.

### 7.2 School lifecycle

The intended school onboarding and lifecycle states are:

`REQUESTED → REVIEW → APPROVED → PROVISIONED → ACTIVE`

Possible later states include:

`ACTIVE → SUSPENDED → ACTIVE`

and, where the applicable cancellation/retention process is completed:

`ACTIVE or SUSPENDED → CANCELLED → ARCHIVED`

The system must record who initiated and approved state transitions, timestamps, reasons and affected school/plan. Invalid transitions must be rejected.

| Stage | Intended behaviour |
|---|---|
| Request | A prospective school submits an onboarding request through the SaaS-facing journey. Input is validated and public endpoints are protected against abuse. |
| Review | Authorised platform staff review the request and may request corrections or reject it with a recorded reason. |
| Approval | An authorised approver accepts the school and selects/approves the initial plan and module package. |
| Provisioning | The system creates the tenant’s required baseline configuration, including school settings and configured accounting defaults/chart of accounts. Provisioning must be retry-safe and leave a clear state if it fails. |
| First administrator | The first ERP Admin receives a secure invitation or activation flow. The system must not distribute a shared default password. |
| Activation | The school becomes operational after required provisioning and initial access checks succeed. |
| School setup | The ERP Admin configures school-specific academic sessions, classes, sections, staff and other operational settings. |
| Suspension | Access is restricted according to the suspension policy. School data and history are preserved; suspension is not data deletion. |
| Cancellation | The cancellation process handles access, outstanding obligations, export and retention requirements. |
| Archive | The school is retained in an inactive/archived state according to the approved retention policy. Permanent deletion is not a routine one-click action. |

The exact review service-level target, automated approval eligibility, retention duration and export package format are **Open decisions** unless separately approved in a technical or operational policy.

### 7.3 Plans, subscriptions and module entitlements

The platform commercial model is based on plans that may define:

- Included modules and optional add-ons.
- Permitted user, student, storage or other plan limits where applicable.
- Subscription period, trial period, price and billing terms.
- Renewal, expiry, suspension and reactivation rules.
- Any approved tax/invoice configuration for platform subscription billing.

An entitlement must have an explicit lifecycle. Supported states in the product model include `ACTIVE`, `TRIAL`, `SUSPENDED`, `EXPIRED` and `DISABLED`.

Entitlement rules:

1. Academics and Finance are core modules and are intended to remain part of the standard school platform baseline.
2. Optional modules are available only when the school has an applicable entitlement and the module is operationally enabled.
3. A portal sidebar or hidden menu is not an entitlement control. APIs and background actions must enforce entitlement state.
4. Disabling or expiring a module must not erase its existing records. Historical data remains governed and readable according to the school’s permissions and retention policy.
5. The system must distinguish an unavailable module from an empty module and explain the reason where appropriate.
6. Entitlement changes must be auditable and must not cause partial or destructive data migration.
7. Subscription billing and school fee accounting are separate business domains. A platform subscription invoice must not be mixed into a school’s student fee ledger.

Exact plan names, pricing, tax rates, quotas, grace periods and proration rules require an approved commercial configuration. They must not be hardcoded from an agent’s assumptions.

### 7.4 Tenant provisioning baseline

Provisioning must create or configure the tenant’s required baseline state, including:

- Canonical school identity and tenant status.
- Initial school profile and settings.
- Core module availability.
- Configured chart of accounts and finance defaults.
- Initial ERP Admin invitation.
- Initial academic setup state without inventing real classes, students or sessions.
- Required audit/provisioning records.

Provisioning is not considered successful merely because a `School` row exists. All required components must pass their readiness checks. Repeated requests must not create duplicate tenants, duplicate base accounts or duplicate chart-of-account structures.

### 7.5 Controlled platform support access

Platform support must not use an ordinary platform login to silently impersonate a school administrator. The intended support-session model requires:

- A documented support reason or ticket reference.
- A specific target school.
- A named support identity.
- Additional authentication/second-factor verification where required.
- Short expiry and explicit session scope.
- Read-only access by default.
- A visible indication/banner in the school ERP Admin experience while the support session is active.
- School notification according to the approved support policy.
- Immediate revocation capability.
- Audit records for session creation, access, actions, expiry and revocation.

Any write-capable support access must be separately authorised, narrowly scoped and attributable. Destructive or especially sensitive actions should require two-person approval. The precise notification exceptions, permitted support write actions and approval matrix are Open decisions until formally approved.

---

## 8. Module architecture and entitlement model

### 8.1 Product-level modularity

SSVM ERP is one connected product, but its capability domains are modular. Modularity has three product dimensions:

1. **Code/module boundaries:** Each capability has an identifiable owner, public interface and declared dependencies. Cross-module operations use documented services or events rather than reaching into another module’s private implementation or tables.
2. **School feature modularity:** A school may use optional capabilities only when entitled and enabled. A disabled optional module must not break unrelated core modules.
3. **Commercial modularity:** Plans and add-ons determine which optional capabilities and limits a school receives.

Each module should have a manifest or equivalent maintained contract that identifies its purpose, owned data, routes/services, permissions, events, dependencies, entitlement key, UI entry points and tests. The exact technical format belongs in `SYSTEM_ARCHITECTURE.md` and `API_AND_INTEGRATIONS.md`.

### 8.2 Core modules

The core school platform includes:

- Student Information System and Admissions.
- Academic sessions, classes, sections and timetable.
- Manual attendance.
- Examinations, gradebook and report cards.
- Fees, cash desk and core financial accounting.
- User, role and school-level administration necessary to operate these modules.

A school must retain access to the core capabilities according to its active platform contract. Core module status must not be treated as an optional add-on in a way that leaves school records inaccessible.

### 8.3 Optional modules

The intended optional module families include:

| Module | Entitlement key (where established) | Primary capability |
|---|---|---|
| Biometric Attendance | `BIOMETRIC_ATTENDANCE` | Ingest attendance punches from supported biometric devices and reconcile them with attendance records. |
| Transport | `TRANSPORT` | Manage vehicles, drivers, routes, stops and student transport allocations. |
| Hostel | `HOSTEL` | Manage hostels, rooms, beds, student requests, allocations, transfers and checkouts. |
| Library | `LIBRARY` | Manage catalogues, physical copies, circulation and fines. |
| HR & Payroll | To be confirmed in entitlement catalogue | Manage staff lifecycle, attendance, leave and payroll. |
| Inventory & Procurement | To be confirmed in entitlement catalogue | Manage requisitions, purchase orders, goods receipts, stock and payables. |
| Communications extensions | To be confirmed in entitlement catalogue | Manage enhanced messaging and provider-based communication capabilities. |
| Online payment gateway | Provider credential/configuration dependent; Razorpay is the current integration target | Process online fee payments through the approved gateway when the school has configured merchant credentials. |

The final entitlement key catalogue and whether each item is bundled, add-on or core must be maintained in the technical/commercial contracts. Do not infer a missing entitlement key or plan mapping.

### 8.4 Module lifecycle and data preservation

A module may be unavailable because it is not purchased, in trial, suspended, expired, disabled by the school or temporarily unavailable for technical reasons. These conditions should be distinguishable.

Deactivating an optional module MUST NOT:

- Delete existing module records.
- Remove the audit trail.
- Break financial references already posted to the ledger.
- Erase student history or allocation history.
- Cause another module to assume ownership of its data.

Re-enabling a module should restore authorised access to preserved records, subject to the approved migration/version compatibility process.

---

# Part IV — Detailed functional capabilities and workflows

## 9. Admission and student lifecycle

### 9.1 Admission operating model

Admissions are **paper-first** in the current approved scope. The school issues a printable A4 admission form/brochure. Families submit the paper form through the school’s process. Authorised school staff then digitise approved information through controlled registration or bulk-import workflows.

Public self-service online admission submission is outside the current scope unless the product owner explicitly changes that decision. The SaaS onboarding request is not a student admission form.

### 9.2 Supported admission cases

The system must support:

- **New admission:** A student is admitted to the school for the first time.
- **Readmission:** A previously known student returns. The system must locate and reuse the appropriate canonical identity rather than blindly creating a duplicate.
- **Transfer:** A student enters or leaves the school through a controlled transfer process, with prior academic history and transfer documentation preserved according to policy.

Admission registration numbers and admission-related counters must be unique and concurrency-safe within the appropriate school scope. A generated number must not be reused because a form was cancelled or a record was soft-deleted unless a formally defined numbering policy explicitly allows it.

### 9.3 Admission workflow

1. **Form preparation:** ERP Admin or authorised school staff prepare and print the A4 admission form with the school’s configured fields and applicable fee/tag information.
2. **Paper collection:** The school receives the completed form and supporting information outside the online public admission flow.
3. **Data preparation:** Staff enter records manually or prepare the approved CSV/bulk-import template.
4. **Validation:** The system checks required fields, field formats, school-specific uniqueness, likely duplicate student/guardian identity, supported class/session/shift values and required relationships.
5. **Review of errors:** The user receives row/field-specific validation feedback. Invalid data must not be silently accepted.
6. **Identity resolution:** The system checks whether the student or guardian already exists in the school’s canonical records. Possible matches must be presented for authorised resolution rather than merged automatically on weak evidence.
7. **Create or link:** The approved workflow creates the student identity or links to the existing identity, creates guardian relationships and records the admission case.
8. **Enrollment:** The student is placed into the relevant academic session, class, section and configured shift/batch through an authorised workflow.
9. **Facility requests:** Hostel or transport needs may be recorded as requests. A request is not an allocation.
10. **Account/invitation:** Student and parent/guardian portal access is created or invited only under the approved identity-verification and account-provisioning policy.
11. **Confirmation and audit:** The system records the outcome, responsible staff member, timestamps, identifiers and relevant source/import batch.

### 9.4 Student and guardian records

A student record should maintain the institutionally required identity and profile information. The currently documented fields include student name and demographics, photograph, blood group, contact details, admission/registration number, enrollment status, guardian relationship and relevant medical alerts. The final mandatory/optional field catalogue must be configured and documented rather than assumed to be identical for every school.

A parent/guardian may be linked to multiple students. The relationship must support the school’s approved relationship types and contact/communication rules. A student may have more than one guardian where the school’s data policy allows it. The system must not infer guardianship solely from matching a phone number or email address.

### 9.5 Bulk import rules

Bulk import is a controlled administrative tool, not a direct database loading facility. It must provide:

- A published template and field guidance.
- Upload validation and a preview before final commit.
- Row-level and field-level errors.
- Duplicate detection and a guided resolution path.
- Correct guardian linking and multi-child support.
- School, session, class, section and shift validation.
- A traceable import batch and actor audit record.
- A summary of created, linked, rejected and skipped records.
- Protection against accidental duplicate processing of the same import.

**Open decision:** Whether a given import commits as one all-or-nothing transaction or as independently committed valid rows must be explicitly specified for each import type. The UI must clearly show the selected commit behaviour; it must not imply atomicity if valid rows can commit while other rows fail.

### 9.6 Student lifecycle and history

The student lifecycle may include applicant/registered, admitted, enrolled, active, transferred, withdrawn, completed or other school-approved states. The final state catalogue and transition rules must be documented in the technical model.

A student’s permanent identity and historical academic placements must be preserved across sessions, class promotions, readmission and transfer. Changes to a student’s school status must not erase fee, attendance, examination, guardian or audit history.

### 9.7 Admission acceptance criteria

Admission is not complete unless the required identity, guardian and enrollment records are persisted; duplicate protection works; the school scope is enforced; invalid transitions are rejected; relevant audit records exist; and the expected parent/student access is provisioned safely. Tests must include two schools and prove that one school cannot access or import into the other school’s records.

---

## 10. Academic and classroom operations

### 10.1 Academic hierarchy

The academic model supports multiple academic sessions, classes, sections, subjects and class-teacher/subject-teacher assignments. The school may configure morning/day batches or shifts where its operations require them. The exact naming and grading terminology may vary by institutional profile.

An academic session is a bounded period with a defined start/end and lifecycle. Records such as enrollment, attendance, assessment, timetable and results must reference the relevant session so that historical sessions remain understandable after a new session begins.

### 10.2 Session and class setup

Authorised ERP Admin staff configure:

1. Academic session and calendar.
2. Classes/grades and their ordering.
3. Sections within classes.
4. Subjects and subject/class applicability.
5. Shifts or batches where used.
6. Teacher and class-teacher assignments.
7. Assessment and grading profiles.
8. Timetable periods and required rooms/resources.

The setup process must validate references and prevent incompatible or incomplete configurations from being treated as active.

### 10.3 Timetable and scheduling

The timetable capability must detect and prevent, or explicitly surface for authorised resolution:

- A teacher being assigned to two classes in the same time slot.
- A section being assigned overlapping lessons.
- A room/resource being double-booked where room allocation is configured.
- Invalid period/day/session assignments.

A timetable change must preserve who changed it and when. Publishing a timetable should make the approved version visible to the intended teacher, student and parent audiences. Draft and published states must not be confused.

### 10.4 Attendance

The product supports daily attendance statuses including `PRESENT`, `ABSENT`, `LATE` and `HOLIDAY`, with any additional statuses controlled by an approved school configuration.

Attendance workflow:

1. A teacher or authorised staff member opens an assigned class/section/date attendance register.
2. The backend verifies assignment, school, session, date and attendance permission.
3. The user records permitted statuses.
4. The system validates duplicates, holidays, closed sessions and any correction rules.
5. The attendance record is committed and attributed to the actual user/device context.
6. Parent/student visibility and notifications follow the school's publication and communication rules.
7. Corrections after submission are controlled, attributable and auditable.

Manual attendance is core. Biometric punch ingestion is optional and requires the biometric module and supported hardware/integration. Device ingestion is not equivalent to declaring a final school attendance status unless the reconciliation policy says so.

### 10.5 Homework and learning activity

Teachers may create assignments for assigned classes/subjects, set instructions and deadlines, attach supported files, review student submissions and enter permitted grading/feedback. Students may view and submit work within the configured submission window. Parents may view relevant homework information for their linked child through the Parent Portal and Parent App.

File access must remain scoped to the school, class and authorised users. A file URL alone must not grant public access to student work.

### 10.6 Examinations, gradebook and report cards

The examination workflow must support configurable assessment profiles, subjects, maximum marks, weightings and grading rules. Marks entry must validate the assessment definition and accepted range. Calculations must be deterministic and use the active approved assessment profile.

Expected lifecycle:

1. Configure the assessment/examination and applicable classes/subjects.
2. Assign authorised exam/subject staff.
3. Enter and validate marks.
4. Review missing, invalid or exceptional marks.
5. Calculate grades/percentages/GPA according to the school’s configured framework.
6. Approve/publish results according to the school's permission process.
7. Generate and preserve report-card outputs.
8. Expose published results to the authorised student and parent views.

A published result must not be silently overwritten. A correction or re-publication must retain prior state or audit history according to the academic record policy.

### 10.7 Academic promotion and retention

The platform supports promotion evaluation from one class/session to the next and retention where the student does not meet the school’s approved criteria. The existing product baseline references attendance of at least 75% and passing grades in core subjects. These must be treated as configurable policy inputs and not as a universal hardcoded rule for every curriculum, class or school.

A promotion workflow must:

- Identify the source and target academic sessions/classes.
- Evaluate the currently approved attendance and academic criteria.
- Show eligible, ineligible and exceptional cases with reasons.
- Allow only authorised school staff to review and approve the outcome.
- Preserve the previous session/class enrollment and result history.
- Create the next enrollment only after a valid approved transition.
- Handle retained students, transfers and exceptional decisions without duplicating student identity.
- Record an audit trail and make the approved new placement visible to the appropriate portals.

Promotion is a major administrative operation and is web-only in the current application boundary. It must not be exposed as a Staff App bulk operation.

### 10.8 Academic acceptance criteria

Academic features must prove correct school/session scoping, teacher assignment checks, timetable conflict handling, attendance auditability, configured calculation correctness, publication permissions and preservation of historical records. Cross-school negative tests are required.

---

## 11. Fees, payments and financial governance

### 11.1 Financial domain boundary

School fee administration and platform subscription billing are separate domains. Student fees belong to the school’s financial records. SaaS subscription fees belong to the platform’s commercial relationship with the school. They must not be mixed in the same ledger or user workflow.

The school finance capability includes fee structures, invoices/demands, cash desk collection, online payment, allocation, receipts, advance credits, refunds, journals, general ledger and bank reconciliation.

### 11.2 Fee configuration

Authorised school finance staff configure fee categories and applicable class/session fee structures, including recurring schedules, approved concessions/discounts and late-fine rules. Every fee calculation must be traceable to the configuration and period that produced it.

A configuration change must not silently rewrite already issued invoices or posted transactions. The policy for applying a change to existing unpaid invoices must be explicit and auditable.

### 11.3 Invoice and demand lifecycle

The invoice/demand workflow should support:

- Generation for the correct student, guardian/payer, academic session and fee period.
- An itemised breakdown of fees, adjustments and applicable fines.
- Outstanding, partially paid, paid, cancelled or other approved states.
- Recalculation/adjustment only through an authorised and auditable process.
- Clear distinction between an issued invoice and a draft calculation.

Invoices must not be marked paid merely because a payment page was opened or a gateway order was created.

### 11.4 Offline and cash-desk collection

The cashier workflow supports full or partial payments through authorised offline collection methods. The current product baseline includes:

- Partial payment allocation against the oldest outstanding invoices according to the approved allocation policy.
- Advance fee liability/credit creation when received funds exceed the currently allocated dues.
- Duplicate-safe printable receipts.
- Amount display in Indian currency words where the applicable configuration requires it.

The system must prevent a single payment from being collected or allocated twice because of duplicate clicks, retries or repeated requests. Receipt numbering must be safe within the appropriate school sequence.

### 11.5 Online payment gateway

The current payment integration target is Razorpay, subject to school merchant credentials and provider configuration. The payment flow must use a server-created order/payment intent, provider verification and idempotency-controlled webhook handling.

The system must distinguish at least the following facts: payment initiated, provider order created, payer action pending, provider-confirmed success, provider-confirmed failure, verification pending, refund pending and refund confirmed where the provider contract supports them.

A browser redirect or client callback is not sufficient proof of payment. The server must verify the provider response/webhook and reconcile duplicates before the finance transaction is posted. A provider outage must not produce a false paid state.

### 11.6 Payment allocation and advance credit

A confirmed payment must be allocated according to the approved policy. The existing product baseline is oldest-outstanding-first allocation, with excess funds represented as `StudentAdvanceCredit` or the corresponding canonical advance-credit record.

The system must retain the relationship between the original payment, allocation lines, invoices and any remaining advance. A future adjustment or refund must not destroy the original transaction history.

### 11.7 Double-entry accounting

Every posted journal must balance: total debits equal total credits. Finance operations must be represented by auditable journal entries and stable account mappings.

The existing product baseline includes:

- Fee invoicing/recognition through the configured receivable and income accounts.
- Cash/bank receipt against receivable when payment is collected and allocated.
- Advance amount represented as a liability/credit balance until applied according to policy.
- Refunds through reversing/compensating entries rather than erasing the original payment or journal.
- Salary expense and corresponding payment/bank entries through the approved payroll posting flow.

The precise recognition policy, account mapping and tax treatment must be defined in the finance technical contract and configured for the institution. Example account codes in the current scope are illustrative defaults, not a universal chart-of-accounts mandate.

### 11.8 Refunds, reversals and adjustments

A refund must reference the original payment and follow an authorised approval path. The original payment, receipt and journal remain in history. Corrections use reversal or compensating records. The system must prevent refunds exceeding the eligible refundable amount, subject to the approved policy.

### 11.9 Financial-period closure

A closed financial period must be protected against ordinary edits and new backdated postings. Reopening or correcting a closed period requires an explicitly authorised process with reason and audit history. The exact close/reopen approval matrix is an Open decision if not already established in the finance contract.

### 11.10 Bank reconciliation

Authorised finance staff may upload/import bank statements, match statement entries to recorded transactions, review unmatched items and verify balances. Reconciliation must show matched, unmatched and exception items without silently creating or altering ledger transactions. Any adjustment must follow the authorised journal process.

### 11.11 Finance acceptance criteria

Finance is not complete unless exact amount handling, duplicate/idempotency controls, payment verification, allocation rules, advance-credit treatment, receipt numbering, balanced journal posting, refund reversal, tenant isolation and audit records are tested. At least one integration test must trace a student fee from invoice through payment, allocation, receipt, ledger and parent-visible statement.

---

## 12. Human resources, staff and payroll

### 12.1 Staff directory

The school maintains staff profiles including identity, contact information, qualifications, department/designation, employment details and role assignments as required. A staff identity may be referenced by multiple operational modules (for example a teacher who is also assigned as a transport driver) without creating unrelated duplicate people.

Access to sensitive personal, employment and salary data must be limited to authorised staff and platform roles with a justified support purpose.

### 12.2 Leave and attendance

The HR capability supports leave applications, leave types, entitlement/quota configuration, balance calculations, approval and staff attendance records. Leave and attendance data used for payroll must be tied to the correct employee and payroll period.

### 12.3 Payroll workflow

The intended payroll chain is:

`Staff/Salary Configuration → Attendance and Leave Inputs → Draft Payroll Run → Validation → Second-Person Approval → Disbursement/Payment Evidence → Payslip → General Ledger Posting`

The workflow must:

- Use the approved salary structure and effective dates.
- Include the relevant attendance, leave and approved adjustments.
- Calculate allowances, deductions and statutory components using versioned, configurable rules.
- Avoid hardcoding statutory rates, thresholds or rules into application logic without a governed configuration source.
- Produce a draft run that can be reviewed before posting.
- Require a second authorised person for final payroll approval as a separation-of-duties control.
- Prevent the preparer from silently approving their own run where the policy requires independent approval.
- Preserve the approved payroll snapshot and payslip for the period.
- Post the approved expense/payment journals to the general ledger.
- Record failed, pending or completed disbursement states honestly.

Payroll processing and final approval are web-only major operations in the current mobile boundary. A Staff App may display payslip or permitted personal information only if the school’s role policy allows it; it must not expose payroll administration or approval to unauthorised staff.

### 12.4 Payroll acceptance criteria

Tests must cover calculation inputs, leave/attendance linkage, effective-date changes, approval separation, duplicate-run protection, failed disbursement handling, payslip access control, balanced journal posting and cross-school isolation.

---

## 13. Campus operations and facilities

### 13.1 Transport and vehicles

When the Transport module is enabled, the school can manage:

- Fleet/vehicle records and sequential display numbering.
- Required vehicle compliance documents, including RC, insurance, fitness and PUC where applicable.
- Driver identity linked to the canonical staff record where the same person is a school employee.
- Driver commercial-licence information and relevant validity details.
- Routes, ordered stops, schedules and student commute details.
- Student transport requests and separately approved allocations.

The system must detect relevant route/schedule conflicts. Student transport details may be shown to an authorised parent/guardian. An allocation must be a real persisted operational relationship, not merely a request or UI selection.

Live GPS telemetry and active live-tracking UI are deferred from the current active product UI. Existing backend endpoints may be retained for compatibility, but their existence must not be represented as a completed, operational GPS product.

### 13.2 Hostel and dormitory

When the Hostel module is enabled, the school can configure hostel/building/floor/room/bed inventory and manage student requests, allocation, transfers and checkout.

The product baseline includes:

- Room metadata such as floor and room type.
- Search/filtering by relevant room attributes.
- Room cards and a room-detail view for administration.
- Academic context appropriate to the institution type.
- Concurrency-safe bed allocation using transactional locking or an equivalent integrity mechanism.
- Atomic transfers and checkout handling so a bed is not assigned to two students at the same time.

A facility request is not an allocation. An approved allocation must reference the student, room/bed, effective dates and responsible actor. A transfer must release and allocate resources atomically or leave the previous valid allocation intact if it fails.

### 13.3 Facility requests and fees

Parents or authorised school staff may express/request a hostel or transport requirement. The request enters a review process. An authorised operational user approves or rejects it and creates a separate allocation when appropriate.

A confirmed hostel/transport allocation may add a fee line to the student’s billing only when:

- The relevant module is enabled and entitled.
- The school has configured the applicable charge.
- The allocation is in the state that triggers billing.
- The operation is idempotent and linked to the source allocation.

The precise billing trigger, effective-date/proration policy and cancellation/refund behaviour must be defined by the school finance configuration. A request alone must never create a fee.

### 13.4 Library

When the Library module is enabled, the school can manage book titles/catalogue metadata and individual physical copies. Individual copies have unique accession identifiers (the current example format is `ACC-xxxx`).

The circulation workflow includes issue, return, renewal, due dates, renewal limits and recording of damage/overdue penalties. The product must track the specific copy, not only the title, so availability can be determined correctly.

Library fines may be exposed to the finance ledger only when the school explicitly enables/configures that integration. A fine record and a posted financial charge are distinct states. The system must not silently post every library fine to student fees without the approved school policy.

### 13.5 Procurement and inventory

The procurement/inventory capability is intended to support:

`Requisition → Approval → Purchase Order → Goods Receipt (full or partial) → Stock Ledger → Accounts Payable → Payment/Settlement`

It includes vendor records, purchase orders, goods receipt notes, stock movement and payable integration. The system must:

- Maintain traceability from requisition to PO and goods receipt.
- Support partial receipt where approved.
- Reject or route over-receipt for authorised exception handling; do not silently increase stock beyond the permitted order quantity.
- Prevent duplicate GRNs and duplicate stock posting.
- Update stock only when a valid receipt is accepted.
- Keep inventory movement and payable records linked.
- Preserve reversals/adjustments in history.

Procurement administration, PO approval, GRN administration and stock/financial adjustments are web-only major operations in the current application boundary.

---

## 14. Communications, messaging and notifications

The Communications Hub includes school notices/announcements, role targeting, in-app messaging and provider-backed communication queues such as SMS where configured.

The product must support:

- Drafting and publishing notices with an authorised audience (for example all users, teachers, students or parents).
- Class/section or other narrower targeting only where the role and data model support it.
- In-app threaded direct messaging where enabled and permitted.
- Notification jobs dispatched through workers or provider integrations.
- Traceable status, retry and failure information.
- User notification preferences and device permission handling where applicable.

The system must distinguish a message being created, queued, accepted by a provider, delivered where the provider confirms delivery, and failed. It MUST NOT claim a message was delivered merely because the application queued it or an API request returned successfully.

Notification failure must not roll back an already committed student attendance or fee transaction unless the core transaction explicitly requires notification as a prerequisite. In ordinary cases, the business operation and its notification are separate, linked outcomes.

---

## 15. Self-Healing Fault Isolation (SHFI) and incident management

SHFI is the operational fault/incident capability. It ingests eligible operational signals such as gateway timeouts, database connection problems and service failures, creates or correlates incidents, classifies severity and tracks investigation/resolution state.

The product intent is to help authorised operators understand failures and operational risks. SHFI must not be described as autonomous remediation unless a specific remediation action is implemented, constrained, approved and verified.

Incident records should retain the source signal, affected service/school scope where known, severity, timestamps, status changes, assigned owner and resolution notes. Tenant-sensitive incident data must be visible only to authorised platform or school roles according to the incident’s scope.

---

# Part V — Cross-module business chains

## 16. Required cross-module integrations

The ERP is valuable because its modules share validated business records. The following flows are product-level integration requirements. Each handoff must be traceable and retry-safe.

| ID | Triggering flow | Required downstream result |
|---|---|---|
| INT-01 | Approved admission creates/links student and guardian | Canonical student identity, guardian relationship, enrollment and authorised portal invitation/access. |
| INT-02 | Student is enrolled in a session/class | Applicable fee schedule is resolved and the correct invoice/demand can be generated under the configured billing rules. |
| INT-03 | Invoice is paid | Verified payment, payment allocation, receipt, balanced journal/ledger entries and authorised parent/student visibility. |
| INT-04 | Hostel or transport allocation is approved | Relevant configured fee line may be created only when the module and school billing policy permit it. |
| INT-05 | Library fine is assessed | A finance charge is created only when the school’s integration setting/policy requires it; library and ledger references remain linked. |
| INT-06 | Staff attendance and leave are finalised for payroll | Draft payroll is calculated, independently approved, disbursed according to the configured process, reflected in payslip and posted to the ledger. |
| INT-07 | Purchase order receives goods | Accepted GRN updates stock and the corresponding payable/financial record according to the accounting contract. |
| INT-08 | Super Admin changes a school entitlement | Backend module authorization and the school’s portal navigation reflect the same entitlement state. |
| INT-09 | A privileged operation occurs | An audit record identifies actor, scope, target, action, outcome, timestamp and reason where required. |
| INT-10 | Parent or staff mobile action is submitted | The same canonical backend business rule, authorization, tenant and audit controls apply as for web. |

### 16.1 Cross-module integration rules

- A module must not directly modify another module’s private tables or bypass its business service.
- Cross-module workflows must use documented service contracts or typed events as defined by the technical architecture.
- Events must carry enough tenant and entity context to be safely processed, but consumers must validate that context rather than trust arbitrary client-supplied values.
- Event processing must be idempotent. Retries must not duplicate invoices, receipts, fees, stock movements, allocations or invitations.
- A background consumer failure must be visible and recoverable; it must not silently discard a required business transition.
- A workflow must define which step is authoritative and whether downstream work is synchronous, asynchronous or compensatable.
- The UI must distinguish “requested”, “processing”, “completed” and “failed” outcomes where work is asynchronous.

### 16.2 Required multi-tenant integration testing

Every critical cross-module chain must include tests for at least two independent school tenants. Tests must prove:

1. School A’s workflow creates or updates only School A records.
2. School B cannot read, change, approve or receive School A’s records through direct API calls, list filters, identifiers, background jobs or mobile clients.
3. A retry does not duplicate the business result.
4. A failed downstream step is visible and can be retried or compensated according to the contract.
5. The audit trail identifies the initiating actor and the linked records.

---

# Part VI — Security, privacy, data and operational trust

## 17. Authentication, authorization and security requirements

Security requirements are mandatory across all seven web portals, both Android apps, APIs, workers and provider callbacks.

### 17.1 Identity and session security

The system must use secure password storage, signed short-lived access credentials, controlled refresh-token lifecycle and appropriate session revocation. Sensitive accounts and privileged operations must support MFA according to the approved security policy.

Platform identities and school identities must have clearly separated authorization scopes and session boundaries. A platform session must not accidentally become a school session, and a school user must not obtain platform access by changing a client parameter or token claim.

Web and Android clients have different session-storage and request-security constraints. Web protections such as CSRF where applicable and secure cookie settings must be implemented in the web session design. Android credentials must use platform-appropriate secure storage and revocation behaviour. The exact token lifetimes, cookie names, device binding and MFA policies belong in `SECURITY_AND_TENANCY.md` and must not be guessed by individual feature developers.

### 17.2 Tenant identity and data access

The school tenant identity must be resolved from authenticated and verified server-side context. A school ID supplied in a request header or body is not proof of authorization. Any client-selected school context must be checked against the authenticated user’s permitted school membership.

Database-level tenant isolation is required for tenant-owned data. Missing tenant context must fail closed. A request that cannot prove its tenant scope must be rejected rather than fall back to a global or default school.

### 17.3 Role and resource authorization

Backend routes and services must enforce role/permission and resource relationship. Examples include a teacher only accessing assigned classes, a parent only accessing linked children, a cashier only performing permitted finance actions and a platform support identity only accessing the school through a valid support session.

### 17.4 Public endpoints and integrations

Public registration and authentication endpoints must have appropriate validation, rate limits and abuse controls. Provider webhooks must authenticate/verify the provider and be idempotent. Secrets and credentials must be managed through the approved secret/configuration process and must not be committed to source control or returned to clients.

### 17.5 Audit and privileged operations

Audit history is required for sensitive actions including, where applicable:

- Admission approval and important student identity/guardian changes.
- Student promotion, transfer and status changes.
- Financial configuration, collections, reversals, refunds, reconciliation and period closure.
- Payroll calculation approval and payment-state changes.
- Role/permission, module entitlement and school lifecycle changes.
- Support-session creation, use and revocation.
- Exports, sensitive data access and destructive operations.

Audit records must be attributable and protected from ordinary user alteration. The final audit event schema and retention policy are maintained in technical/security documentation.

## 18. Data ownership, integrity and lifecycle

### 18.1 Canonical records

A business concept must have one authoritative record/owner. For example:

- Student identity is owned by the student/SIS domain.
- Guardian relationship is owned by the student/guardian domain.
- Enrollment is owned by the academic/student lifecycle domain.
- Attendance is owned by the attendance domain.
- Invoice, payment, allocation, advance credit and ledger journal are owned by the finance domain.
- Staff identity/employment is owned by HR/staff domain.
- A hostel bed allocation is owned by the hostel domain.
- A transport route/allocation is owned by the transport domain.
- A library copy/circulation record is owned by the library domain.
- A purchase order, GRN and stock movement are owned by procurement/inventory domains.

The precise Prisma model ownership and service boundaries belong in `SYSTEM_ARCHITECTURE.md` and `DATABASE_AND_FINANCIAL_INTEGRITY.md`.

### 18.2 History and deletion

Routine deactivation or deletion must not destroy records required for legal, financial, academic, audit or operational history. Soft deletion or archival is used where appropriate, but a soft-delete flag must not be used as an excuse to leave broken relationships or bypass authorization.

Permanent deletion, anonymisation, retention expiry and data export require a documented policy, scope check, approval and audit trail. The exact retention periods depend on applicable requirements and approved institutional policy; do not invent them.

### 18.3 Numbering and concurrency

School-specific admission numbers, receipt numbers, GRN numbers and other sequential identifiers must be generated atomically and safely under concurrent requests. A UI-generated number or count-before-insert pattern is not sufficient. The technical implementation must define sequence scope, uniqueness and retry behaviour.

### 18.4 Files and documents

Student photos, admission documents, homework attachments, notices, receipts, payslips and other files must be stored and served through authorised access paths. File metadata must preserve ownership, tenant scope and relevant business relationship. Publicly guessable storage URLs must not be treated as authorization.

---

## 19. Non-functional product requirements

These requirements describe product qualities. Numeric service-level targets must be set in the operations/SLA documentation rather than invented in feature code.

| Quality | Product requirement |
|---|---|
| Reliability | Failed requests and background jobs must produce observable, recoverable outcomes. Critical data changes must be transactionally safe. |
| Consistency | Authoritative business state must be persisted once and exposed consistently across permitted clients. |
| Performance | Common portal workflows must remain responsive at the approved school and platform scale. Performance targets and load profiles must be explicit in operations/testing documentation. |
| Scalability | The platform must support multiple independent schools without using cross-tenant access shortcuts. Capacity targets are governed by the deployment/operations plan. |
| Accessibility | Forms, tables, navigation, validation and core actions should be usable with accessible interaction patterns. |
| Usability | Destructive, financial and high-impact actions must show clear context and confirmation and must not imply success before commit. |
| Localization | Date, time, currency, number and academic terminology must follow the school’s configured locale/profile where supported. The current financial product baseline is Indian currency usage; multi-currency policy remains an explicit decision. |
| Compatibility | Supported browser, Android OS and device matrix must be documented and tested. Do not promise support for untested versions. |
| Observability | The platform must expose service health, error rates, job failures and important business/operational signals to authorised operators. |
| Recoverability | Backups must be automated and restoration must be tested through documented drills with measured RPO/RTO. A backup job reporting success is not sufficient proof of recoverability. |
| Maintainability | Module ownership, interfaces, events, schema changes and operational runbooks must be documented and testable. |

## 20. Observability, operations and trust

The product must provide operational monitoring for the platform and its critical services. Metrics and dashboards should have a defined source of truth and clear ownership. Grafana or another monitoring interface is for authorised platform/operations access; school users should see only the operational information intended for their scope.

The operations model must define:

- Health/readiness checks for backend, database, cache, workers and portal dependencies.
- Logs with useful correlation identifiers while avoiding unnecessary exposure of sensitive student or financial data.
- Metrics for service availability, latency, queue depth, job failure, payment verification and other agreed operational signals.
- Actionable alerts with an approved destination that actually reaches a responsible person.
- Incident ownership, severity, response and resolution process.
- Backup schedule, encryption/custody, retention and restoration drills.
- Deployment configuration, secret validation, migration checks and rollback/forward-recovery strategy.

A dashboard existing is not proof that alert delivery works. A backup existing is not proof that restore works. The operational evidence must be recorded in runbooks and release acceptance.

---

# Part VII — Scope boundaries, completion and decisions

## 21. Explicit exclusions and deferred functionality

The following items are not part of the active approved scope unless the product owner formally changes this document:

1. **Third-party live settlement banking:** Direct automated NEFT/RTGS bank payouts without cashier/bank reconciliation.
2. **Custom third-party LMS integrations:** Deep embedding or custom integration with Moodle, Canvas, Google Classroom or similar platforms beyond the approved standard attachment/submission capabilities.
3. **Automated facial-recognition model training:** High-throughput on-server neural video processing. Biometric attendance relies on supported device-side verification and attendance ingestion, not an ERP-trained facial-recognition model.
4. **Standalone alumni application:** Alumni information may be managed through authorised ERP functions, but a separate alumni social/community portal is not part of the current product.
5. **Vendor tendering marketplace:** A separate tender/bidding/vendor-discovery marketplace is not included. This does not remove the approved internal vendor catalogue and procurement workflow.
6. **Canteen management:** Not included in the current active module scope.
7. **Medical/clinic management:** Not included in the current active module scope beyond relevant student medical-alert/profile information already defined.
8. **Live GPS tracking UI:** Deferred from active UI. Existing compatible backend endpoints do not constitute an approved completed live-tracking feature.
9. **Public online student admission submission:** Not included while the paper-first admission decision remains in force.
10. **Separate Android student application:** Not included in the current application ecosystem. Student-facing information needed by parents is exposed through the Parent App under guardian authorization; the Student Portal remains a web portal.

Deferred means not to be independently built, advertised or represented as available. A proposal to add a deferred feature requires explicit product-owner approval and a documented scope update.

## 22. Feature completion and release-readiness definitions

A module is not complete merely because its page, API route, database model or basic happy path exists.

### 22.1 Feature-level definition of done

A feature may be reported complete only when all applicable items below are demonstrated:

- The behaviour matches the approved product workflow.
- The correct records are created, updated and preserved.
- Role, resource and tenant authorization are enforced by the backend.
- Optional-module entitlement is enforced where applicable.
- Mobile/web channel restrictions are enforced where applicable.
- Data integrity and concurrency rules are satisfied.
- Financial operations balance and preserve original records where applicable.
- Failure, retry, duplicate and partial-completion scenarios are handled.
- Audit records exist for required actions.
- Relevant downstream integrations behave correctly.
- Positive, negative, cross-tenant and regression tests pass.
- User-visible states do not claim unsupported success.
- Documentation and operational guidance are updated.

### 22.2 Five release-readiness levels

| Level | Meaning | Evidence required |
|---|---|---|
| **1. Code-complete** | The implementation for the defined scope exists. | Reviewed code, schema/API changes and documented limitations. This level alone is not acceptance. |
| **2. Test-verified** | Required automated and manual acceptance tests pass. | Unit/integration/E2E/security/tenant-isolation evidence against a specific commit. |
| **3. Infrastructure-ready** | Required production infrastructure and operational controls exist. | Database, cache, storage, secrets, networking, migrations, monitoring, backups and restore evidence. |
| **4. External-provider-ready** | Required external services are configured and verified. | Real provider credentials, webhook/notification/payment checks and confirmed delivery/settlement behaviour where applicable. |
| **5. Production-approved** | The product owner approves release against an exact commit and declared scope. | Release report, unresolved-risk disclosure, operational sign-off and owner approval. |

A release report must identify the exact commit tested. Evidence from different commits must not be combined and presented as one fully verified release unless the relevant changes are all present in the certified commit.

---

## 23. Product implementation order — dependency guidance

The detailed task list and sequencing are maintained in the two project-plan documents. At the product level, the intended dependency order is:

1. Establish the repository baseline, product requirements and current implementation evidence.
2. Establish database integrity, migrations, tenant ownership and RLS behaviour.
3. Establish authentication, platform/school identity separation and backend authorization.
4. Complete Super Admin and ERP Admin school lifecycle, provisioning and entitlement governance.
5. Complete core student identity, guardian relationships, admissions and enrollment.
6. Complete academic setup, attendance, examination, results and promotion workflows.
7. Complete financial workflows and prove invoice-to-payment-to-ledger integrity.
8. Complete HR, leave and payroll with independent approval and ledger integration.
9. Complete hostel, transport, library and procurement workflows according to enabled modules.
10. Complete cross-module integration tests and all seven web portal experiences.
11. Build and verify the Parent Android App and Staff Android App against the same backend contracts and mobile/web boundaries.
12. Complete operational infrastructure, provider credentials, backups, monitoring, restore drills and runbooks.
13. Perform release certification and obtain production approval for one exact commit.

This is dependency guidance, not permission to skip currently identified release blockers. The active near-term priority is always determined by `PROJECT_STATUS.md` and the approved low-level plan. Mobile application delivery must not bypass or postpone required security, financial integrity or core API correctness.

---

## 24. Open product decisions and ambiguity register

The following decisions must be explicitly resolved before the dependent behaviour is finalised. They must not be silently invented by developers or AI agents.

| ID | Decision required | Why it matters | Interim rule |
|---|---|---|---|
| PD-01 | Parent App online fee payment entry point: native/embedded payment flow or redirect to Payment Portal | Avoids duplicate payment implementations and inconsistent verification | Show fee balances/history/receipts; do not invent a separate payment flow. |
| PD-02 | Final role and permission matrix for every school role and platform role | Controls access to sensitive records and high-impact actions | Enforce least privilege; do not infer permission from job title alone. |
| PD-03 | Exact Staff App management-role actions | Prevents the staff app from becoming an unrestricted ERP Admin app | Provide authorised monitoring and only explicitly approved routine actions. |
| PD-04 | Exact admission import commit semantics per import type | Determines whether valid rows can commit when other rows fail | Preview and explain behaviour; do not claim all-or-nothing unless implemented. |
| PD-05 | Student lifecycle status catalogue and allowed transitions | Needed for readmission, transfer, withdrawal and completion | Preserve canonical identity/history; reject unknown transitions. |
| PD-06 | Guardian identity verification and relationship approval policy | Protects child information | Do not link guardians solely by matching contact details. |
| PD-07 | Curriculum-specific attendance, grading and promotion rules by board/class | Prevents hardcoding one school’s rule everywhere | Use explicit school configuration; preserve the existing baseline without treating it as universal law. |
| PD-08 | Platform plan catalogue, pricing, quotas, taxes, trials and grace periods | Defines subscription commercial behaviour | Do not hardcode assumed commercial values. |
| PD-09 | Tenant retention duration, export format and final deletion/anonymisation policy | Governs school cancellation and student data lifecycle | Preserve data; no one-click permanent deletion. |
| PD-10 | Support-session notification exceptions and write-access approval policy | Governs platform-to-school privileged access | Read-only, time-limited, school-scoped and auditable by default. |
| PD-11 | Payroll statutory configuration owner, effective dates and approval matrix | Prevents incorrect salary calculations | Do not hardcode statutory rates or allow self-approval where independent approval is required. |
| PD-12 | Hostel/transport billing trigger, proration and cancellation/refund behaviour | Avoids incorrect student fee charges | A request alone does not create an invoice line. |
| PD-13 | Library fine-to-ledger policy | Schools may differ in whether fines become student charges | Do not post to finance unless explicitly configured. |
| PD-14 | Final entitlement keys and commercial bundling for optional modules | Keeps plan configuration and backend checks aligned | Do not invent missing entitlement identifiers. |
| PD-15 | Android supported device/OS matrix and offline-action policy | Determines mobile acceptance and reliability | Do not present an offline queued action as committed. |
| PD-16 | Numeric performance, availability, RPO and RTO targets | Needed for measurable production acceptance | Define in operations/SLA documentation before making guarantees. |
| PD-17 | Approved notification channels, provider credentials and delivery-state mapping | Determines what delivery can be truthfully reported | Report only states supported by the provider contract. |
| PD-18 | Exact approval and two-person-control matrix for destructive/platform/financial actions | Prevents unauthorised single-person high-impact changes | Require explicit least-privilege approval design; do not assume broad admin access. |

When a decision is made, update this table, the relevant technical contract and the applicable project plan. Do not leave conflicting versions of the same rule in multiple documents.

---

## 25. Product acceptance checklist

The product owner and release team should be able to answer **yes with evidence** to the relevant items before declaring the ERP ready:

### Product and applications
- [ ] Seven web portals have clear, non-overlapping responsibilities and role-aware access.
- [ ] Parent Android App shows parent information and only the linked children’s authorised Student Portal information.
- [ ] Staff Android App supports teacher and management experiences through individual role/permission assignments.
- [ ] Major administrative workflows are web-only and blocked by backend authorization when called from mobile.
- [ ] All clients use the same authoritative business rules and records.

### SaaS and tenancy
- [ ] School lifecycle transitions are valid, attributable and auditable.
- [ ] Provisioning is retry-safe and creates the required tenant baseline.
- [ ] Platform plans and module entitlements are enforced in backend services.
- [ ] Platform staff roles are separated by least privilege.
- [ ] Support access is school-scoped, time-limited, visible, revocable and audited.
- [ ] Two-school tests prove there is no cross-tenant access through web, mobile, API or workers.

### Business workflows
- [ ] Paper-first admission, readmission, transfer and bulk import preserve canonical student identity.
- [ ] Guardian relationships support multi-child families without exposing unlinked students.
- [ ] Academic sessions, timetable, attendance, assessments, results and promotion preserve history.
- [ ] Fee invoices, verified payments, allocations, advances, receipts and ledger entries reconcile.
- [ ] Refunds reverse/compensate original transactions rather than erase history.
- [ ] Payroll includes validation, independent approval, payslip and ledger posting.
- [ ] Hostel/transport requests are separate from actual allocations.
- [ ] Library, inventory and procurement integrations obey configured entitlement and finance policy.
- [ ] Notifications report honest queued/provider/delivery/failure states.

### Security, operations and release
- [ ] Authentication, MFA policy, role checks, tenant RLS and API authorization are tested.
- [ ] Sensitive operations create audit records.
- [ ] Idempotency and concurrency protections prevent duplicate financial, admission and allocation records.
- [ ] Backup restoration has been demonstrated, not merely scheduled.
- [ ] Operational alerts reach an approved recipient.
- [ ] External provider integrations are verified with real approved configuration where required.
- [ ] Release evidence is tied to one exact commit and production approval is explicit.

---

## 26. Document maintenance

This document changes only when the product owner approves a product-scope or product-behaviour decision. Implementation discoveries may reveal that a requirement is ambiguous, infeasible or inconsistent; they do not automatically authorise changing the requirement.

For every material change:

1. Record what changed and why.
2. Identify affected portals, apps, roles, modules, workflows, data and integrations.
3. Update the relevant technical contracts and project-plan tasks.
4. Update the open-decision register if a decision was resolved or introduced.
5. Keep implementation status separate and evidence-based in `PROJECT_STATUS.md`.
6. Do not delete old audit or migration history to make the new scope appear simpler.

**Final governing principle:** SSVM ERP is the product defined here. Developers and AI coding agents are responsible for implementing and verifying that product. They are not authorised to independently redefine its business purpose, invent missing policy or weaken its approved boundaries.

---

## Current implementation status

This specification describes intended product scope. It does not certify that every listed capability is implemented, tested, infrastructure-ready, provider-ready or approved for production. Refer to [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for commit-specific evidence and to the high-level/low-level project plans for delivery work.
