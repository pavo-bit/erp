# Phase 1 — Security Containment and Vulnerability Remediation

Updated: 2026-11-01

## Inventory findings

The initial mounted-router inventory is recorded in `SECURITY_INVENTORY.md`. It is explicitly a partial inventory and marks unreviewed surfaces rather than inferring authorization from the mount path.

Initial targeted inspection confirmed the following issues:

| Surface | Finding | State |
|---|---|---|
| Global CSRF middleware | `csrfProtection` returned through `next()` before token validation. | Corrected; end-to-end client integration and tests remain. |
| CSRF origin validation | CORS response headers alone do not reject an unsafe cookie request from a disallowed Origin. | Unsafe requests carrying auth cookies now reject a non-matching configured Origin; focused middleware regression tests were added but not run. |
| Private documents | `/uploads` exposed document files through `express.static`; metadata used a static file URL and there was no authenticated byte download route. | Static document path now denied; authenticated school/student-scoped download route added. |
| Governance workflows | Retention policy CRUD, execution and workflow creation had no route authentication or authorization. | Auth and admin gates added; global execution is super-admin-only. |
| Late fines | `/payments/trigger-late-fines` was unauthenticated and queried/mutated invoices globally. | Authenticated finance/admin role and school scope added. |
| CORS / middleware order | CORS is configured before parsers and CSRF; school context middleware runs before route-level authentication. | Recorded for further verification; tenant context is Phase 2 and is not claimed fixed. |
| Upload validation | Documents route enforces size and MIME allowlist, but MIME is caller-controlled. | Content signature validation and access-policy audit remain. |
| Secrets and seeding | A tracked backend `.env.backup` contained populated database/JWT/provider credentials. A legacy seed script contained hard-coded admin credentials; the Prisma demo seed also created a known-password super-admin. | Backup and legacy script removed from the active tree; demo seed now requires explicit non-production opt-in and caller-supplied credentials. Credential rotation and Git history review remain. |
| Payment configuration | Razorpay client and signature verification used placeholder fallback credentials. | Placeholder fallbacks removed; missing provider config fails closed; signature comparison is timing-safe. Payment ownership/accounting remain unverified. |
| Broader route inventory | Dozens of sensitive routers are mounted in `src/app.ts`. | Full route-by-route authentication/authorization and ownership inventory remains incomplete. |

## Implemented controls

- Removed the unconditional CSRF bypass and the weak fallback secret. Added origin rejection for unsafe requests carrying auth cookies, retained explicit login/webhook exemptions, and bypass only for bearer-only requests without authentication cookies.
- Stopped unauthenticated static access under `/uploads/documents` and added an authenticated document download endpoint with school and student ownership checks, path confinement, safe attachment filename, and `nosniff`.
- Required authentication/admin role for retention policy and workflow operations; constrained retention days to 1–3650 and accepted only supported action values. Global execution requires `SUPER_ADMIN`.
- Required authenticated finance/admin role and authenticated school scope for manual late-fine generation; updates are guarded by school and zero-fine conditions.
- Updated the seven portal request clients to retain CSRF tokens from safe responses and attach them to unsafe cookie-authenticated requests. SaaS registration now fetches a token before submitting.
- Removed the tracked `.env.backup`, `seed-admin.js` and `prisma/seed.ts.bak`; made demo seeding require explicit non-production opt-in and supplied credentials; removed Razorpay placeholder values.

## Files changed

- `ssvm-backend/src/middleware/csrf.ts`
- `ssvm-backend/src/tests/security/csrf.test.ts`
- `ssvm-backend/src/app.ts`
- `ssvm-backend/src/routes/documents.ts`
- `ssvm-backend/src/routes/admin/governance-workflows.ts`
- `ssvm-backend/src/routes/payments.ts`
- `ssvm-backend/src/services/razorpay-settlement.service.ts`, `ssvm-backend/prisma/seed.ts`, `.gitignore`, `.github/workflows/ci.yml`, `ssvm-backend/src/tests/setup.ts`, and `ssvm-backend/src/tests/api/payments.test.ts`
- Removed `ssvm-backend/.env.backup`, `ssvm-backend/seed-admin.js`, and `ssvm-backend/prisma/seed.ts.bak` from the active tree.
- `erp-admin/src/lib/api-hooks.ts`, `parent-portal/src/lib/api-hooks.ts`, `payment-portal/src/lib/api-hooks.ts`, `teacher-portal/src/lib/api-hooks.ts`, `super-admin/src/lib/api.ts`, `student-portal/lib/student-api-hooks.ts`, `saas-frontend/src/app/page.tsx`, and the ERP admin, teacher, and super-admin auth contexts.

Pre-existing user changes in `docker-compose.yml` and `ssvm-backend/Dockerfile` were preserved.

## Tests and verification

The backend clean install, type check, build and Prisma schema validation passed. The focused CSRF suite passed all 3 tests (missing token, invalid/valid token, and disallowed Origin), and focused lint passed on modified security/payment files. Database-backed security tests were not run because PostgreSQL and Docker were unavailable. The test setup now refuses to run unless `DATABASE_URL_TEST` explicitly names a test database. See `REGRESSION_TEST_REGISTER.md` for required cases.

## Residual risks and blockers

- Frontend CSRF token handling has been implemented but is not yet verified by builds or browser tests.
- Login/webhook/bearer CSRF exemption cases still need direct tests.
- The requested full route inventory and authorization audit, secure upload content validation, document metadata/delete policy, governance dry run/batch/audit design, secret and seed review, Docker/configuration hardening and security regression suite remain incomplete.
- No secret rotation is reported. Potential credential exposure and Git history were not fully reviewed.
- The removed tracked backup may remain in Git history, existing clones or backups. PostgreSQL credentials referenced by `DATABASE_URL`/`DIRECT_URL`, JWT signing credentials and the Razorpay webhook secret require owner-led rotation; history was not rewritten.
- No production deployment or production readiness claim is made.
