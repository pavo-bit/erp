# Route Authorization Matrix (Generated Inventory)

Updated: 2026-10-31

This inventory is mechanically extracted from route declarations and mounts. Middleware names are shown as clues only. Inline checks, inherited router middleware, ownership constraints, tenant scope, input validation and audit behavior have not been semantically verified. All rows remain **REVIEW_REQUIRED** until individually inspected and tested. Dynamic route strings and nested router mounts may require manual completion.

| Method | Endpoint | Router file | Declared middleware | Access policy status |
|---|---|---|---|---|
| GET | `/api/health` | `health.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/2fa/disable` | `2fa.ts` | `authenticate, validate` | REVIEW_REQUIRED |
| POST | `/api/v1/2fa/setup` | `2fa.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/2fa/validate` | `2fa.ts` | `validate` | REVIEW_REQUIRED |
| POST | `/api/v1/2fa/verify-setup` | `2fa.ts` | `authenticate, validate` | REVIEW_REQUIRED |
| POST | `/api/v1/academic/class-teachers` | `academic.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/academic/class-teachers/:id` | `academic.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/academic/class-teachers/:sectionId` | `academic.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/academic/classes` | `academic.ts` | `authenticate, requireTeacherOrAdmin, requireSchoolAccess` | REVIEW_REQUIRED |
| POST | `/api/v1/academic/classes` | `academic.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/academic/classes/bulk` | `academic.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/academic/sections` | `academic.ts` | `authenticate, requireTeacherOrAdmin, requireSchoolAccess` | REVIEW_REQUIRED |
| POST | `/api/v1/academic/sections` | `academic.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/academic/sections/bulk` | `academic.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/academic/sessions` | `academic.ts` | `authenticate, requireTeacherOrAdmin, requireSchoolAccess` | REVIEW_REQUIRED |
| POST | `/api/v1/academic/sessions` | `academic.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/activity` | `activity.ts` | `authenticate, requireSchoolAccess` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/audit` | `admin/audit.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/admin/audit/security-alerts` | `admin/audit.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/admin/backups` | `admin/backups.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/admin/backups` | `admin/backups.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/admin/billing/categories` | `admin/billing.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/billing/categories` | `admin/billing.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/billing/invoices/generate` | `admin/billing.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/billing/structures` | `admin/billing.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/governance-workflows/retention-policies` | `admin/governance-workflows.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/admin/governance-workflows/retention-policies` | `admin/governance-workflows.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/admin/governance-workflows/retention-policies/execute` | `admin/governance-workflows.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/governance-workflows/workflows` | `admin/governance-workflows.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/admin/inventory/items` | `admin/inventory.ts` | `authenticate, requireInventoryRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/inventory/items` | `admin/inventory.ts` | `authenticate, requireInventoryRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/inventory/locations` | `admin/inventory.ts` | `authenticate, requireInventoryRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/inventory/locations` | `admin/inventory.ts` | `authenticate, requireInventoryRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/inventory/stock` | `admin/inventory.ts` | `authenticate, requireInventoryRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/ledger/accounts` | `admin/ledgerAccounts.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/ledger/accounts` | `admin/ledgerAccounts.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/admin/ledger/accounts/:id` | `admin/ledgerAccounts.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/ledger/transactions` | `admin/ledgerTransactions.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/ledger/transactions` | `admin/ledgerTransactions.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/ledger/transactions/balance` | `admin/ledgerTransactions.ts` | `authenticate, requireFinanceRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/payroll` | `admin/payroll.ts` | `authenticate, requirePayrollRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/payroll/:id/disburse` | `admin/payroll.ts` | `authenticate, requirePayrollRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/payroll/generate` | `admin/payroll.ts` | `authenticate, requirePayrollRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/procurement/orders` | `admin/procurement.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/procurement/orders` | `admin/procurement.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/admin/procurement/orders/:id/status` | `admin/procurement.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/procurement/vendors` | `admin/procurement.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/procurement/vendors` | `admin/procurement.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/purchase-orders` | `admin/purchaseOrders.ts` | `authenticate, requireProcurementRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/purchase-orders` | `admin/purchaseOrders.ts` | `authenticate, requireProcurementRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/purchase-orders/:id/approve` | `admin/purchaseOrders.ts` | `authenticate, requireApproverRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/purchase-orders/:id/receive` | `admin/purchaseOrders.ts` | `authenticate, requireProcurementRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/saas-settings/branding` | `admin/saasSettings.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/admin/saas-settings/branding` | `admin/saasSettings.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/saas-settings/features` | `admin/saasSettings.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/admin/saas-settings/features/toggle` | `admin/saasSettings.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/saas-settings/settings` | `admin/saasSettings.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/admin/saas-settings/settings` | `admin/saasSettings.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admin/vendors` | `admin/vendors.ts` | `authenticate, requireProcurementRole` | REVIEW_REQUIRED |
| POST | `/api/v1/admin/vendors` | `admin/vendors.ts` | `authenticate, requireProcurementRole` | REVIEW_REQUIRED |
| DELETE | `/api/v1/admin/vendors/:id` | `admin/vendors.ts` | `authenticate, requireProcurementRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/admin/vendors/:id` | `admin/vendors.ts` | `authenticate, requireProcurementRole` | REVIEW_REQUIRED |
| GET | `/api/v1/admissions` | `admissions.ts` | `authenticate, requireAdmissionsAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/admissions/:id` | `admissions.ts` | `authenticate, requireAdmissionsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/admissions/:id/enroll` | `admissions.ts` | `authenticate, requireAdmissionsAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/admissions/:id/review` | `admissions.ts` | `authenticate, requireAdmissionsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/admissions/apply` | `admissions.ts` | `admissionsApplyLimiter, verifyTurnstile, spamQualityValidation` | REVIEW_REQUIRED |
| GET | `/api/v1/alumni` | `alumni.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/alumni` | `alumni.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/alumni/contributions` | `alumni.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/alumni/contributions` | `alumni.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/analytics` | `cms.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/ancillary/helpdesk/tickets` | `admin/ancillary.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/ancillary/helpdesk/tickets` | `admin/ancillary.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/ancillary/hostel/allocate` | `admin/ancillary.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/ancillary/hostel/allocations` | `admin/ancillary.ts` | `requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/ancillary/hostel/allocations/:id/checkout` | `admin/ancillary.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/ancillary/hostel/rooms` | `admin/ancillary.ts` | `requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/ancillary/hostel/rooms` | `admin/ancillary.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/assets` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/assets` | `assets.ts` | `authenticate, requireOperationsAdmin, validate` | REVIEW_REQUIRED |
| DELETE | `/api/v1/assets/:id` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/assets/:id` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/assets/:id/assign` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/assets/:id/assign` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/assets/:id/maintenance` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/assets/:id/maintenance` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/assets/:id/transfer` | `assets.ts` | `authenticate, requireOperationsAdmin, validate` | REVIEW_REQUIRED |
| GET | `/api/v1/assets/categories` | `assets.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/assets/categories` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/assets/categories/:id` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/assets/stats` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/assets/vendors` | `assets.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/assets/vendors` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/assets/vendors/:id` | `assets.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/assignments` | `assignments.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/assignments` | `assignments.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/assignments/:id/submit` | `assignments.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/assignments/study-materials` | `assignments.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/assignments/submissions/:submissionId/grade` | `assignments.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/attendance` | `attendance.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/attendance` | `attendance.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/attendance/teachers` | `attendance.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/attendance/teachers` | `attendance.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/auth/alumni/register` | `auth.ts` | `alumniRegisterLimiter, verifyTurnstile, spamQualityValidation` | REVIEW_REQUIRED |
| POST | `/api/v1/auth/change-password` | `auth.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/auth/events` | `auth.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/auth/login` | `auth.ts` | `validate` | REVIEW_REQUIRED |
| POST | `/api/v1/auth/logout` | `auth.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/auth/logout/all` | `auth.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/auth/me` | `auth.ts` | `authenticate, injectCsrfToken` | REVIEW_REQUIRED |
| POST | `/api/v1/auth/refresh` | `auth.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/auth/register` | `auth.ts` | `authenticate, requireRole, validate` | REVIEW_REQUIRED |
| POST | `/api/v1/auth/revoke-session` | `auth.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/auth/sessions` | `auth.ts` | `authenticate` | REVIEW_REQUIRED |
| DELETE | `/api/v1/auth/sessions/:sessionId` | `auth.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/auth/student/login` | `auth.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/backups/:id/download` | `backups.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/backups/status` | `backups.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/backups/trigger` | `backups.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/branches` | `branches.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/branches` | `branches.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| DELETE | `/api/v1/branches/:id` | `branches.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/branches/:id` | `branches.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/bulk/jobs` | `bulk.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/bulk/jobs/:id` | `bulk.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/bulk/upload` | `bulk.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/certificates/issue` | `certificates.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/certificates/issue` | `certificates.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/certificates/templates` | `certificates.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/certificates/templates` | `certificates.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/certificates/verify/:certNo` | `certificates.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/certificates/verify/:certNo` | `certificates.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/communications/logs` | `communications.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/communications/send` | `communications.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/communications/templates` | `communications.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/communications/templates` | `communications.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/crm/leads` | `crm.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/crm/leads/:id/interactions` | `crm.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/crm/leads/:id/stage` | `crm.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/crm/pipeline` | `crm.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/discipline/incidents` | `discipline.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/discipline/incidents` | `discipline.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/discipline/incidents/:id/resolve` | `discipline.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/discipline/incidents/student/:id` | `discipline.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/documents` | `documents.ts` | `authenticate` | REVIEW_REQUIRED |
| DELETE | `/api/v1/documents/:id` | `documents.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/documents/:id` | `documents.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/documents/:id/download` | `documents.ts` | `authenticate` | REVIEW_REQUIRED |
| PUT | `/api/v1/documents/:id/verify` | `documents.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/documents/upload` | `documents.ts` | `authenticate, upload.single` | REVIEW_REQUIRED |
| GET | `/api/v1/events` | `events.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/events` | `events.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/events/:id` | `events.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/events/:id` | `events.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/exams` | `exams.ts` | `authenticate, requireTeacherOrAdmin, requireSchoolAccess` | REVIEW_REQUIRED |
| POST | `/api/v1/exams` | `exams.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/exams/:examId/report-card/:studentId` | `exams.ts` | `authenticate` | REVIEW_REQUIRED |
| DELETE | `/api/v1/exams/:id` | `exams.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/exams/:id` | `exams.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/exams/:id/marks` | `exams.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/finance/defaulters` | `finance.ts` | `authenticate, requireFinanceAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/finance/generate-monthly-fees` | `finance.ts` | `authenticate, requireFinanceAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/finance/governance/periods/:id/close` | `finance-governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/finance/governance/reconcile` | `finance-governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/finance/ledger/profit-loss` | `finance.ts` | `authenticate, requireFinanceAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/finance/ledger/trial-balance` | `finance.ts` | `authenticate, requireFinanceAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/finance/reconciliation` | `finance-reconciliation.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/finance/reconciliation/manual-match` | `finance-reconciliation.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/finance/reconciliation/trigger` | `finance-reconciliation.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/finance/reconciliation/unmatched` | `finance-reconciliation.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/finance/scholarships` | `scholarships.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/finance/scholarships` | `scholarships.ts` | `authenticate, requireFinanceAdmin, validate` | REVIEW_REQUIRED |
| PUT | `/api/v1/finance/scholarships/:id/approve` | `scholarships.ts` | `authenticate, requireFinanceAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/finance/scholarships/:id/reject` | `scholarships.ts` | `authenticate, requireFinanceAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/gallery` | `gallery.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/gallery` | `gallery.ts` | `authenticate, requireContentAdmin, upload.single` | REVIEW_REQUIRED |
| DELETE | `/api/v1/gallery/:id` | `gallery.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/governance/archives/trigger` | `admin/governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/governance/classifications` | `admin/governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/governance/classifications` | `admin/governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/governance/financial-periods` | `admin/governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/governance/financial-periods` | `admin/governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/governance/financial-periods/:id/close` | `admin/governance.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/guardians/me/fees` | `guardians.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/guardians/me/students` | `guardians.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/health` | `health.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/hr/leaves` | `hr.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/hr/leaves` | `hr.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/hr/leaves/:id` | `hr.ts` | `authenticate, requireHRAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/hr/payroll/generate` | `hr.ts` | `authenticate, requireHRAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/hr/payslips/:teacherId` | `hr.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/hr/salaries` | `hr.ts` | `authenticate, requireHRAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/hr/salaries` | `hr.ts` | `authenticate, requireHRAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/hr/salaries/:id/pay` | `hr.ts` | `authenticate, requireHRAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/inventory/movements` | `inventory.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/inventory/stocks` | `inventory.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/invoices` | `invoices.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/invoices` | `invoices.ts` | `authenticate, requireFinanceAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/invoices/:id/pay` | `invoices.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/library/books` | `library.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/library/books` | `library.ts` | `authenticate, requireLibraryAdmin, validate` | REVIEW_REQUIRED |
| DELETE | `/api/v1/library/books/:id` | `library.ts` | `authenticate, requireLibraryAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/library/books/:id` | `library.ts` | `authenticate, requireLibraryAdmin, validate` | REVIEW_REQUIRED |
| POST | `/api/v1/library/fines/calculate` | `library.ts` | `authenticate, requireLibraryAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/library/issues` | `library.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/library/issues` | `library.ts` | `authenticate, requireLibraryAdmin, validate` | REVIEW_REQUIRED |
| POST | `/api/v1/library/issues/:id/return` | `library.ts` | `authenticate, requireLibraryAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/library/issues/:id/waive-fine` | `library.ts` | `authenticate, requireLibraryAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/library/overdue` | `library.ts` | `authenticate, requireLibraryAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/messages/:threadId` | `messages.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/messages/:threadId` | `messages.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/messages/:threadId/read` | `messages.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/messages/threads` | `messages.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/messages/threads` | `messages.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/mobile/config` | `mobile.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/mobile/config/:platform` | `mobile.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/mobile/devices` | `mobile.ts` | `authenticate` | REVIEW_REQUIRED |
| DELETE | `/api/v1/mobile/devices/:token` | `mobile.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/notices` | `notices.ts` | `optionalAuth` | REVIEW_REQUIRED |
| POST | `/api/v1/notices` | `notices.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/notices/:id` | `notices.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/notices/:id` | `notices.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/notices/:id` | `notices.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/notifications` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/notifications/bulk` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/notifications/fee-reminder` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/notifications/send` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/notifications/templates` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/notifications/templates` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/notifications/templates/:id` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/notifications/templates/:id` | `notifications.ts` | `authenticate, requireCommunicationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/payments/create-order` | `payments.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/payments/trigger-late-fines` | `payments.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/payments/verify` | `payments.ts` | `authenticate, paymentIdempotencyMiddleware` | REVIEW_REQUIRED |
| POST | `/api/v1/payments/webhook` | `payments.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/preferences` | `preferences.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/preferences` | `preferences.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/preferences/consent` | `preferences.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/preferences/consent` | `preferences.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/procurement-ops/orders/:id/receive` | `procurement.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/procurement-ops/requests` | `procurement.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/procurement-ops/requests/:id/approve` | `procurement.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/reception/calls` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/reception/calls` | `reception.ts` | `authenticate, requireOperationsAdmin, validate` | REVIEW_REQUIRED |
| PUT | `/api/v1/reception/calls/:id` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/reception/complaints` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/reception/complaints` | `reception.ts` | `authenticate, requireOperationsAdmin, validate` | REVIEW_REQUIRED |
| PUT | `/api/v1/reception/complaints/:id` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/reception/enquiries` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/reception/enquiries` | `reception.ts` | `authenticate, requireOperationsAdmin, validate` | REVIEW_REQUIRED |
| PUT | `/api/v1/reception/enquiries/:id` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/reception/visitors` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/reception/visitors` | `reception.ts` | `authenticate, requireOperationsAdmin, validate` | REVIEW_REQUIRED |
| PUT | `/api/v1/reception/visitors/:id` | `reception.ts` | `authenticate, requireOperationsAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/reports/export/attendance` | `reports.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/reports/generate/receipt` | `reports.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/reports/generate/report-card` | `reports.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/results` | `results.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/results` | `results.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/approve/:id` | `saas.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/export` | `admin/dataExport.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/governance/delegations` | `admin/accessGovernance.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/governance/delegations` | `admin/accessGovernance.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/governance/reviews` | `admin/accessGovernance.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/saas/governance/reviews/:id` | `admin/accessGovernance.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| DELETE | `/api/v1/saas/mdm/:entity/:id` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/mdm/categories` | `admin/mdm.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/mdm/categories` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/mdm/cities` | `admin/mdm.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/mdm/cities` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/mdm/countries` | `admin/mdm.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/mdm/countries` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/mdm/departments` | `admin/mdm.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/mdm/departments` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/mdm/religions` | `admin/mdm.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/mdm/religions` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/mdm/states` | `admin/mdm.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/mdm/states` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/mdm/subjects` | `admin/mdm.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/mdm/subjects` | `admin/mdm.ts` | `authenticate, superAdminOnly` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/reject/:id` | `saas.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/request` | `saas.ts` | `saasRequestLimiter, verifyTurnstile, spamQualityValidation` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/requests` | `saas.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/security/audit-logs` | `admin/security.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/security/failed-logins` | `admin/security.ts` | `requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/security/impersonate/:schoolId` | `admin/security.ts` | `requireRole, validate` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/security/impersonate/:schoolId/end` | `admin/security.ts` | `requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/saas/security/quarantine/:documentId` | `admin/security.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/security/system-logs` | `admin/security.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/settings/branding` | `admin/saasSettings.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/saas/settings/branding` | `admin/saasSettings.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/settings/features` | `admin/saasSettings.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/saas/settings/features/toggle` | `admin/saasSettings.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/saas/settings/settings` | `admin/saasSettings.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/saas/settings/settings` | `admin/saasSettings.ts` | `requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/schools` | `schools.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/schools` | `schools.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| DELETE | `/api/v1/schools/:id` | `schools.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| GET | `/api/v1/schools/:id` | `schools.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/schools/:id` | `schools.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/schools/:id/onboarding` | `schools.ts` | `authenticate` | REVIEW_REQUIRED |
| PUT | `/api/v1/schools/:id/onboarding` | `schools.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/schools/:id/setup` | `schools.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/schools/:id/stats` | `schools.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/search` | `search.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/security/quarantine` | `security.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| DELETE | `/api/v1/security/quarantine/:id` | `security.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/security/quarantine/:id/release` | `security.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/sessions` | `sessions.ts` | (inline/inherited) | REVIEW_REQUIRED |
| DELETE | `/api/v1/sessions/:sessionId` | `sessions.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/sessions/logout-all` | `sessions.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/site-content` | `cms.ts` | (inline/inherited) | REVIEW_REQUIRED |
| PUT | `/api/v1/site-content` | `cms.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/sse` | `sse.ts` | `authenticate, sseHandler` | REVIEW_REQUIRED |
| GET | `/api/v1/stats/activity-feed` | `stats.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/stats/detailed` | `stats.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/stats/finance` | `stats.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/stats/public` | `stats.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/storage/signed-url` | `storage.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/storage/upload` | `storage.ts` | `authenticate, requireRole, multerUpload.single, secureUploadMiddleware` | REVIEW_REQUIRED |
| GET | `/api/v1/students` | `students.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/students` | `students.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/students/:id` | `students.ts` | `authenticate` | REVIEW_REQUIRED |
| PUT | `/api/v1/students/:id` | `students.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/students/me` | `students.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/subscriptions/:id/renew` | `subscriptions.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| PUT | `/api/v1/subscriptions/:id/suspend` | `subscriptions.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| POST | `/api/v1/subscriptions/assign` | `subscriptions.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| GET | `/api/v1/subscriptions/my` | `subscriptions.ts` | `authenticate` | REVIEW_REQUIRED |
| GET | `/api/v1/subscriptions/payments` | `subscriptions.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/subscriptions/payments` | `subscriptions.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/subscriptions/plans` | `subscriptions.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/subscriptions/plans` | `subscriptions.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| DELETE | `/api/v1/subscriptions/plans/:id` | `subscriptions.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| PUT | `/api/v1/subscriptions/plans/:id` | `subscriptions.ts` | `authenticate, requireSuperAdmin, requireAllowedIp` | REVIEW_REQUIRED |
| GET | `/api/v1/subscriptions/stats` | `subscriptions.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/subscriptions/sync-expiries` | `subscriptions.ts` | `authenticate, requireSuperAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/teachers` | `teachers.ts` | `authenticate, requireTeacherOrAdmin, requireSchoolAccess` | REVIEW_REQUIRED |
| POST | `/api/v1/teachers` | `teachers.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/teachers/:id` | `teachers.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/teachers/:id` | `teachers.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| PUT | `/api/v1/teachers/:id` | `teachers.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/testimonials` | `cms.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/testimonials` | `cms.ts` | `authenticate, requireContentAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/timetable` | `timetable.ts` | `authenticate` | REVIEW_REQUIRED |
| POST | `/api/v1/timetable` | `timetable.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| DELETE | `/api/v1/timetable/:id` | `timetable.ts` | `authenticate, requireAcademicAdmin` | REVIEW_REQUIRED |
| GET | `/api/v1/timetable/teacher/:teacherId` | `timetable.ts` | `authenticate, requireTeacherOrAdmin` | REVIEW_REQUIRED |
| POST | `/api/v1/transport/allocate` | `admin/transport.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/transport/routes` | `admin/transport.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/transport/routes` | `admin/transport.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/transport/stops` | `admin/transport.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/transport/vehicles` | `admin/transport.ts` | (inline/inherited) | REVIEW_REQUIRED |
| POST | `/api/v1/transport/vehicles` | `admin/transport.ts` | (inline/inherited) | REVIEW_REQUIRED |
| GET | `/api/v1/users` | `users.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/users` | `users.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/users/:id` | `users.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/users/:id/reset-password` | `users.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| PUT | `/api/v1/users/:id/status` | `users.ts` | `authenticate, requireRole` | REVIEW_REQUIRED |
| GET | `/api/v1/webhooks` | `webhooks.ts` | `authenticate, requireSchoolAccess` | REVIEW_REQUIRED |
| POST | `/api/v1/webhooks` | `webhooks.ts` | `authenticate, requireSchoolAccess, requireRole` | REVIEW_REQUIRED |
| DELETE | `/api/v1/webhooks/:id` | `webhooks.ts` | `authenticate, requireSchoolAccess, requireRole` | REVIEW_REQUIRED |
| POST | `/api/v1/webhooks/razorpay` | `webhooks.ts` | (inline/inherited) | REVIEW_REQUIRED |

Extracted declarations: 364. This is an inventory aid, not evidence of route security.
