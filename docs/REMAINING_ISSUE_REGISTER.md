# SSVM ERP Remaining Issue Register

Updated: 2026-11-01

| Priority | Issue | Status |
|---|---|---|
| Critical | Credential rotation for populated credentials in removed tracked `.env.backup`; history/clone/backup exposure review | BLOCKED on credential owners; history not rewritten |
| Critical | Verify tenant isolation, Prisma/RLS and raw SQL coverage | PARTIAL; verified identity now populates request-local context (3 isolated tests); Prisma allowlist is incomplete and RLS allows all rows when tenant context is NULL; no database verification |
| Critical | Complete route-by-route authorization/ownership review across sensitive mounted routers | IN_PROGRESS; targeted routes only |
| Critical | Payment transaction ownership, provider binding, atomic ledger posting, partial payment and idempotency | NOT_STARTED / not verified |
| High | Add and execute document, governance, finance and tenant regression tests | NOT_STARTED / PARTIAL; isolated CSRF and retention service tests pass, HTTP/DB behavior remains untested |
| High | Browser-test CSRF integration across seven portals | NOT_STARTED; builds and type checks pass, browser flows not run |
| High | Retention dry-run, batch bounds and audit summaries | IMPLEMENTED AND UNIT TESTED; database-backed execution remains untested |
| High | Add full API contract matrix and database-backed role workflows | NOT_STARTED |
| High | E2E Playwright startup, fixtures and CI execution | NOT_STARTED |
| Medium | Complete clean install, Docker readiness, production monitoring and deployment checks | PARTIAL; clean installs/builds/type checks passed for all seven portals; Docker and deployment checks remain unavailable |
| Medium | Test upload content-signature validation and full document CRUD ownership controls | IMPLEMENTED, NOT TESTED; HTTP and database-backed verification remains |
