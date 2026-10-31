# SSVM ERP Security Inventory (Initial)

Updated: 2026-10-31

This is an inventory of route registrations observed in `ssvm-backend/src/app.ts`, not a claim that each router's internal access policy has been verified. **UNREVIEWED** means route-level handlers still require inspection. The generated method/endpoint list is `security/ROUTE_AUTHORIZATION_MATRIX.md` (364 mounted declarations) and can be regenerated with `ssvm-backend/scripts/build-route-authorization-inventory.cjs`. Four corrected paths are noted separately.

## Global middleware and non-router surfaces

| Surface | Observed control / status |
|---|---|
| Helmet | Configured globally with CSP and frame restrictions. |
| CORS | Single configured `FRONTEND_URL`, credentials enabled; unsafe cookie requests additionally compare Origin. |
| Request parsing | JSON limit 10 MB; URL-encoded parser enabled. |
| Rate limits | Global default limiter and selected auth/upload/bulk/webhook/module limiters. Per-route coverage unreviewed. |
| CSRF | Token validation enabled globally for unsafe requests; frontend propagation implemented but untested. |
| Tenant context | `schoolContextMiddleware` runs before route-level authentication; Phase 2 audit required. |
| Static uploads | `/uploads` serves public media; `/uploads/documents` now denied. Other upload subdirectories require classification. |
| Health / metrics / docs | `/health`, `/api/health`, `/api/v1/health`, `/metrics`, `/api/docs/spec.json`; exposure/access policy requires production review. |
| Background workers | Token cleanup, queue workers and backup service startup are present; job context and authorization require audit. |

## Mounted API routers

All routers below are mounted. This table records scope and inspection status, not assumed permission correctness.

| Mount | Domain | Review status |
|---|---|---|
| `/api/v1/auth` | Authentication | CSRF token issuance/exemptions inspected; full auth flow review remains. |
| `/api/v1/schools`, `/api/v1/branches` | School administration | UNREVIEWED |
| `/api/v1/notices`, `/api/v1/events`, `/api/v1/gallery` | Content/media | UNREVIEWED |
| `/api/v1/students`, `/api/v1/teachers`, `/api/v1/users`, `/api/v1/guardians` | Identity and school records | UNREVIEWED |
| `/api/v1/invoices`, `/api/v1/finance`, `/api/v1/finance/scholarships`, `/api/v1/finance/reconciliation`, `/api/v1/payments`, `/api/v1/finance/governance` | Finance and payments | Late-fine trigger/payout placeholders inspected; broader finance integrity UNREVIEWED. |
| `/api/v1/attendance`, `/api/v1/assignments`, `/api/v1/timetable`, `/api/v1/exams`, `/api/v1/results`, `/api/v1/academic` | Academic workflows | UNREVIEWED |
| `/api/v1/hr`, `/api/v1/notifications`, `/api/v1/communications`, `/api/v1/messages`, `/api/v1/mobile`, `/api/v1/sse`, `/api/v1/2fa`, `/api/v1/sessions`, `/api/v1/preferences` | Staff, communication and session features | UNREVIEWED |
| `/api/v1/alumni`, `/api/v1/admissions`, `/api/v1/certificates`, `/api/v1/reports`, `/api/v1/stats`, `/api/v1/search`, `/api/v1/activity`, `/api/v1/cms` | Public-facing and reporting features | UNREVIEWED |
| `/api/v1/library`, `/api/v1/assets`, `/api/v1/reception`, `/api/v1/transport`, `/api/v1/discipline`, `/api/v1/ancillary` | School operations | UNREVIEWED |
| `/api/v1/storage`, `/api/v1/documents` | File/document access | Public static document path denied; authenticated document download and school/student scope added. Upload signature validation and all operations require further review. |
| `/api/v1/crm` | CRM | UNREVIEWED |
| `/api/v1/procurement-ops`, `/api/v1/inventory` | Procurement/inventory operations | UNREVIEWED |
| `/api/v1/governance`, `/api/v1/admin/governance-workflows` | Governance/retention | Workflow router now authenticated and role-gated; retention preview, bounded deletion and audit summary remain. |
| `/api/v1/saas`, `/api/v1/saas/settings`, `/api/v1/saas/security`, `/api/v1/saas/governance`, `/api/v1/saas/export`, `/api/v1/saas/mdm` | Platform administration/export | UNREVIEWED |
| `/api/v1/webhooks` | External callbacks | Signature and replay policy require route-specific review. |
| `/api/v2` | Versioned API | UNREVIEWED |
| `/api/v1/admin/queues`, `/api/v1/admin/backups`, `/api/v1/admin/audit`, `/api/v1/admin/procurement`, `/api/v1/admin/saas-settings`, `/api/v1/admin/vendors`, `/api/v1/admin/purchase-orders`, `/api/v1/admin/inventory`, `/api/v1/admin/ledger/accounts`, `/api/v1/admin/ledger/transactions`, `/api/v1/admin/billing`, `/api/v1/admin/payroll`, `/api/v1/backups` | Administrative operations | UNREVIEWED |

## Corrected mutation paths

- `/api/v1/admin/governance-workflows/retention-policies` and `/workflows`: authenticated administrator roles and basic scope/input validation.
- `/api/v1/admin/governance-workflows/retention-policies/execute`: super-admin only.
- `/api/v1/payments/trigger-late-fines`: authenticated finance/admin role and school scope.
- Private document downloads: authenticated and school/owner-scoped.

This inventory is incomplete for route methods, individual permissions, ownership, audit requirements, scheduled jobs, raw SQL and feature-specific download/export paths.
