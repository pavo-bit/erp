# Production Deployment Checklist

Status: NOT READY

- [ ] Complete Phase 1 route, upload, secrets, CSRF and security regression review.
- [ ] Rotate credentials exposed through the removed tracked backup; review Git history, clones and backups.
- [ ] Complete Phase 2 tenant context, Prisma coverage and RLS verification.
- [ ] Complete Phase 3 payment, ledger, reconciliation and financial close verification with authorized test credentials.
- [ ] Complete Phase 4 API contract and database-backed role workflow tests.
- [ ] Complete Phase 5 clean install, CI, migration and full Playwright E2E execution.
- [ ] Verify production secrets, TLS, cookie settings, CORS, Redis, database roles, file storage, monitoring access, alerts, backups and recovery.
- [ ] Obtain owner authorization before deployment or live financial operations.

No item is complete based solely on source edits.
