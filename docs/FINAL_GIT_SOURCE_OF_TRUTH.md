# SSVM ERP — Git Source of Truth

**Audit date:** 2026-11-21  
**Repository:** `pavo-bit/erp`  
**Default and active working branch:** `main`  
**Application source audit SHA:** `c21fa0eb343f4bcd42378b53f2731bf3e12c1025`  
**Latest application commit at audit:** `fix(attendance): persist teacher marker foreign key correctly`

## Working model

All subsequent project changes are to be made directly on `main`. No feature or integration branch is to be created, checked out, or used for new work unless the repository owner explicitly changes this instruction. No pull request is required for this workflow.

## Observed branch and pull-request state

- `main` pointed to `c21fa0eb343f4bcd42378b53f2731bf3e12c1025` at the time of this audit.
- The legacy `integration/ssvm-release-completion` ref also pointed to exactly `c21fa0eb343f4bcd42378b53f2731bf3e12c1025`; it was not used as the working branch during this continuation.
- Pull request #9 is closed and marked merged. No open pull requests were returned at the time of this audit.
- No new branch was created during this continuation.

## Verification snapshot for application SHA

GitHub Actions Continuous Integration run #149 was running against `c21fa0eb343f4bcd42378b53f2731bf3e12c1025` when this record was prepared.

| Check | State at audit |
|---|---|
| API hooks synchronization (7 portals) | PASS |
| Restricted-role PostgreSQL migration/RLS job | PASS |
| Backend TypeScript check | PASS |
| Security scan | PASS |
| ERP Admin build | PASS |
| Teacher Portal build | PASS |
| Payment Portal build | PASS |
| Backend test shards 1–4 | IN PROGRESS |
| Backend lint | IN PROGRESS |
| Student Portal build | IN PROGRESS |
| Super Admin build | IN PROGRESS |
| Parent Portal build | IN PROGRESS |
| SaaS frontend build | IN PROGRESS |
| Playwright E2E | No result available at audit time |

These are point-in-time workflow states, not final acceptance results. Do not treat the in-progress jobs as passing.

## Production workflow gate

Production CI/CD run #105 failed in `Receipt Duplicate Pre-Check (Real DB)` because the workflow's `DATABASE_URL` Actions secret was empty/unavailable for the `push` event. The script exited before connecting to PostgreSQL or executing the duplicate-receipt queries. Therefore, this run does **not** establish whether duplicate receipt numbers exist. Backend build and image-build stages were skipped because the pre-check failed.

Required owner action: configure the repository Actions secret `DATABASE_URL` with the intended production database connection string, then rerun the production workflow. Do not weaken or bypass the fail-closed pre-check.

## Release state

The application source contains the reviewed remediation for support-session persistence and read-only authorization, attendance section/session and student validation, canonical Super Admin metrics hooks, explicit unavailable per-school HTTP telemetry, portal server startup in E2E CI, and browser CSRF bootstrap. Full release acceptance remains pending until the current CI jobs complete and the production database pre-check runs successfully.

No production deployment or production-readiness approval is recorded by this document.
