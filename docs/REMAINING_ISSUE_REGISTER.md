# SSVM ERP Remaining Issue Register

Updated: 2026-11-01

| Priority | Issue | Status |
|---|---|---|
| Critical | Credential rotation for populated credentials in removed tracked `.env.backup`; history/clone/backup exposure review | BLOCKED on credential owners; history not rewritten |
| Critical | Verify tenant isolation, Prisma/RLS and raw SQL coverage | PARTIAL; request-local context is tested; Prisma allowlist is incomplete and RLS allows all rows when tenant context is NULL; no database verification |
| Critical | Complete route-by-route authorization/ownership review across sensitive mounted routers | IN_PROGRESS; finance-governance, CRM, inventory and procurement received targeted controls; generated route inventory remains unreviewed |
| Critical | Payment transaction ownership, provider binding, atomic ledger posting, partial payment and idempotency | NOT_STARTED / not verified |
| Critical | Replace bank-reconciliation placeholder with statement-line model and auditable ledger matching | PARTIAL; placeholder write path now fails closed with HTTP 501; no implemented reconciliation workflow |
| High | Database-backed CRM/inventory/procurement ownership and stock-concurrency tests | NOT_STARTED; isolated route tests pass, PostgreSQL unavailable |
| High | Add and execute remaining document, governance, finance and tenant regression tests | PARTIAL; isolated middleware/service/route tests pass, database/HTTP integration remains untested |
| High | Browser-test CSRF integration across seven portals | NOT_STARTED; builds and type checks pass, browser flows not run |
| High | Retention dry-run, batch bounds and audit summaries | IMPLEMENTED AND UNIT TESTED; database-backed execution remains untested |
| High | Add full API contract matrix and database-backed role workflows | NOT_STARTED |
| High | E2E Playwright startup, fixtures and CI execution | NOT_STARTED |
| Medium | Complete clean install, Docker readiness, production monitoring and deployment checks | PARTIAL; clean installs/builds/type checks passed for all seven portals; Docker and deployment checks remain unavailable |
| Medium | Test upload content-signature validation and full document CRUD ownership controls | IMPLEMENTED, NOT TESTED; HTTP and database-backed verification remains |
