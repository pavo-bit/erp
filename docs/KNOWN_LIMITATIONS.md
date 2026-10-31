# SSVM ERP Known Limitations

Updated: 2026-11-01

## Critical / high

- Security review is incomplete. Sensitive mounted routes, ownership rules, background jobs, raw SQL, tenant controls, exports and admin actions still require systematic inspection.
- The CSRF middleware now rejects missing tokens on unsafe cookie-authenticated requests. The seven portal clients capture and send `X-CSRF-Token`; middleware tests pass, and all portal builds/type checks pass, but browser integration remains untested.
- Document uploads now validate detected file content and owner/school scope. List/detail/download/delete/verify enforce school and role/owner checks in code; HTTP/database regression tests and a complete role review remain open.
- Retention now has an entity allowlist, dry-run, 250-row bounded deletes and an audit summary. Three isolated service tests pass; database-backed behavior remains unverified.
- Payment order ownership, provider transaction binding, partial payment accounting, atomic ledger posting, decimal representation and financial close have not been fully audited or verified. The settlement service and webhook placeholder fallbacks were removed; backend build/type checks pass, but finance behavior is not covered by integration tests.
- Multi-tenant context ordering, Prisma coverage and PostgreSQL RLS have not been verified.
- Backend clean install, build, type check, Prisma schema validation and the isolated CSRF/retention/tenant-context suite (9 tests) have passed. All seven portal clean installs, builds and standalone type checks have passed. Database tests and E2E have not run.
- A tracked `ssvm-backend/.env.backup` containing populated database, JWT and Razorpay webhook credential fields was removed from the active tree. Git history was not rewritten; rotate the PostgreSQL credentials referenced by `DATABASE_URL`/`DIRECT_URL`, the JWT signing secret, and the Razorpay webhook secret, and review backups/clones. Rotation has not been performed.
- The tracked legacy `seed-admin.js` and backup `prisma/seed.ts.bak` were removed. The active demo seed now refuses production and requires `ALLOW_DEMO_SEED=true` plus a supplied admin email and password of at least 16 characters.
- Payment routes no longer construct Razorpay with placeholder credentials and signature comparison uses constant-time byte comparison. Full transaction ownership and accounting integrity remain unverified.

## Medium

- CI now includes `student-portal`, uses `npm ci` without a fallback and defines `DATABASE_URL` and `DIRECT_URL` for backend migrations. The workflow has not run. Backend ESLint reports 567 repository violations; portal lint either lacks a flat config or reports existing errors.
- Production deployment readiness, monitoring exposure, secret rotation, database-backed testing and full E2E workflows remain unverified.

## External operational requirements

- Rotate any potentially exposed third-party credentials only after completing the repository and history secret review. Do not report history as sanitized without authorized history remediation.
- Real payment gateway verification, third-party onboarding, infrastructure deployment and production data safety have not been tested or approved.
- The PostgreSQL, JWT and Razorpay webhook credentials from the removed backup need rotation by their owners. No credentials have been rotated here.
