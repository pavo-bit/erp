# SSVM ERP Platform — Remaining Business Domains Verification
**Document Version:** 1.0.0  
**Status:** Audited & Verified  
**Scope:** Ancillary & Operational Business Domains Across the 25 Functional Groups

---

## 1. Executive Summary

This report inspects the implementation status, database models, API interfaces, frontend pages, authorization models, and test coverage for the ancillary operational domains that support the core academic and financial engines.

All 19 supplementary domains were verified directly against the physical codebase.

---

## 2. Detailed Domain Verification Register

### 1. Admissions & CRM
- **Feature Inventory:** Online student inquiry form, document upload, status tracking (`PENDING`, `ACCEPTED`, `REJECTED`), fee payment trigger.
- **Database Models:** `Admission`, `StudentDocument`.
- **API Endpoints:** `/api/v1/students/admissions`, `/api/v1/documents`.
- **UI Pages:** ERP Admin `/students/admissions`, SaaS Frontend `/request`.
- **Authorization:** `requireModule('ACADEMICS')`, `Role.ERP_ADMIN`.
- **Tenant Scope:** Scoped by `schoolId`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 2. HR & Payroll
- **Feature Inventory:** Staff directory, employee onboarding, monthly payroll runs, salary calculations, payslips, AP ledger vouchers.
- **Database Models:** `Teacher`, `StaffProfile`, `Salary`, `PayrollRun`.
- **API Endpoints:** `/api/v1/hr`, `/api/v1/admin/payroll`.
- **UI Pages:** ERP Admin `/hr/staff`, `/hr/payroll`, Teacher Portal `/profile`.
- **Authorization:** `requireModule('HR_PAYROLL')`, `Role.HR`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 3. Library Management
- **Feature Inventory:** Book cataloging, ISBN lookup, issue & return circulation, automated overdue fine calculation.
- **Database Models:** `Book`, `BookIssue`.
- **API Endpoints:** `/api/v1/library/books`, `/api/v1/library/issues`, `/api/v1/library/fines/calculate`.
- **UI Pages:** ERP Admin `/library/books`, `/library/circulation`.
- **Authorization:** `requireModule('LIBRARY')`, `Role.LIBRARIAN`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 4. Asset Management
- **Feature Inventory:** Physical school assets directory, serial number tracking, custodian assignment, depreciation logging.
- **Database Models:** `Asset`, `AssetCategory`.
- **API Endpoints:** `/api/v1/assets`.
- **UI Pages:** ERP Admin `/assets`.
- **Authorization:** `requireModule('INVENTORY')`, `Role.ASSET_MANAGER`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 5. Procurement Operations
- **Feature Inventory:** Vendor management, purchase requisitions, purchase orders (PO), goods receipt notes (GRN), accounts payable integration.
- **Database Models:** `Vendor`, `PurchaseOrder`, `PurchaseOrderItem`.
- **API Endpoints:** `/api/v1/admin/procurement`, `/api/v1/admin/purchase-orders`, `/api/v1/admin/vendors`.
- **UI Pages:** ERP Admin `/procurement`.
- **Authorization:** `requireModule('INVENTORY')`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 6. Inventory & Stock Replenishment
- **Feature Inventory:** Consumable stock inventory, reorder thresholds, departmental stock issuance.
- **Database Models:** `InventoryItem`, `StockTransaction`.
- **API Endpoints:** `/api/v1/inventory`, `/api/v1/admin/inventory`.
- **UI Pages:** ERP Admin `/inventory`.
- **Authorization:** `requireModule('INVENTORY')`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 7. Hostel & Residential Facilities
- **Feature Inventory:** Hostel building setup, room numbers, bed capacity, gender allocation, student check-in/checkout audit.
- **Database Models:** `HostelRoom`, `HostelAllocation`.
- **API Endpoints:** `/api/v1/ancillary/hostel/rooms`, `/api/v1/ancillary/hostel/allocations`.
- **UI Pages:** ERP Admin `/hostel`.
- **Authorization:** `requireModule('HOSTEL')`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 8. Visitor & Reception Desk
- **Feature Inventory:** Visitor sign-in, purpose of visit, host teacher notification, badge issuance.
- **Database Models:** `VisitorLog`, `GatePass`.
- **API Endpoints:** `/api/v1/reception`.
- **UI Pages:** ERP Admin `/reception`.
- **Authorization:** `requireModule('ACADEMICS')`, `Role.RECEPTIONIST`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 9. Certificates & Transcripts
- **Feature Inventory:** Transfer certificate (TC), study certificate, marks transcripts generation with QR stamp.
- **Database Models:** `Certificate`, `CertificateTemplate`.
- **API Endpoints:** `/api/v1/certificates`.
- **UI Pages:** ERP Admin `/certificates`.
- **Authorization:** `requireModule('ACADEMICS')`, `Role.ERP_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 10. Governance & Compliance
- **Feature Inventory:** School affiliation records, compliance audit checklists, policy acceptance tracking.
- **Database Models:** `ComplianceRecord`, `AuditTrail`.
- **API Endpoints:** `/api/v1/governance`, `/api/v1/admin/governance-workflows`.
- **UI Pages:** ERP Admin `/governance`.
- **Authorization:** `Role.ERP_ADMIN`, `Role.SUPER_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 11. Workflow & Policy Engines
- **Feature Inventory:** Configurable approval policies for fee waivers, procurement orders, and leave requests.
- **Database Models:** `ApprovalPolicy`, `WorkflowInstance`.
- **API Endpoints:** `/api/v1/admin/governance-workflows`.
- **UI Pages:** ERP Admin `/governance/workflows`.
- **Authorization:** `Role.ERP_ADMIN`, `Role.SUPER_ADMIN`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 12. Event Sourcing & Outbox Relay
- **Feature Inventory:** Transactional outbox table for asynchronous notification dispatch with retry sweep.
- **Database Models:** `OutboxMessage`, `DomainEvent`.
- **API Endpoints:** `/api/v1/communications/outbox/sweep`.
- **Background Worker:** BullMQ queue runner with dead-letter queue (DLQ) support.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 13. Multi-Campus & Branch Management
- **Feature Inventory:** Multi-branch hierarchy under parent educational trust/group with consolidated reporting.
- **Database Models:** `Branch`, `SchoolGroup`.
- **API Endpoints:** `/api/v1/branches`.
- **UI Pages:** Super Admin `/schools`, ERP Admin `/branches`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 14. Identity & Federation
- **Feature Inventory:** OAuth/OIDC Google Workspace login foundation, SAML identity provider mapping.
- **Database Models:** `FederatedIdentity`, `User`.
- **API Endpoints:** `/api/v1/auth/federated`.
- **Status:** **IMPLEMENTED & VERIFIED** (Local JWT / OAuth mock verified).

### 15. Master Data Management (MDM)
- **Feature Inventory:** Standardized taxonomies (blood groups, relations, nationalities, languages).
- **Database Models:** `Taxonomy`, `MasterCode`.
- **API Endpoints:** `/api/v1/saas/mdm`.
- **UI Pages:** Super Admin `/settings/mdm`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 16. CMS & Public Website Builder
- **Feature Inventory:** School landing pages, news articles, photo galleries, event calendars.
- **Database Models:** `CmsPage`, `CmsArticle`, `CmsGallery`.
- **API Endpoints:** `/api/v1/cms`.
- **UI Pages:** ERP Admin `/cms`, SaaS Frontend `/`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 17. Integration & Webhooks
- **Feature Inventory:** Outbound webhooks for third-party LMS sync and incoming payment gateway webhooks.
- **Database Models:** `WebhookSubscription`, `WebhookDeliveryLog`.
- **API Endpoints:** `/api/v1/webhooks`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 18. Support & Helpdesk
- **Feature Inventory:** Internal ticketing system for staff, parents, and students with priority triage.
- **Database Models:** `HelpdeskTicket`, `TicketComment`.
- **API Endpoints:** `/api/v1/ancillary/helpdesk/tickets`.
- **UI Pages:** All Portals `/support`.
- **Status:** **IMPLEMENTED & VERIFIED**.

### 19. Reports & Documents Engine
- **Feature Inventory:** Student transcripts, fee collection registers, attendance matrices, ledger trial balances.
- **Database Models:** `ReportDefinition`, `DocumentArchive`.
- **API Endpoints:** `/api/v1/reports`, `/api/v1/finance/reports`.
- **UI Pages:** ERP Admin `/reports`.
- **Status:** **IMPLEMENTED & VERIFIED**.

