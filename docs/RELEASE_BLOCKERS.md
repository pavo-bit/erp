# SSVM ERP — Release Blockers

**Date:** 2026-11-20
**Branch:** integration/ssvm-release-completion

## Blockers

1. **P2 — Playwright E2E failures**
   - Root cause: running stack serves stale docker images; CSRF test-client gaps; rate limiting.
   - Impact: UI flows unverified.
   - Action: rebuild docker images from current source; fix CSRF token retrieval in test helper; re-run suite.

2. **P2 — Lint baseline 1,150 errors**
   - Root cause: baseline inflated; ratchet tolerates errors.
   - Impact: code quality not verified clean.
   - Action: separate lint-reduction workstream; do not claim lint-clean.

3. **P2 — Backend/RLS not re-run on final branch**
   - Root cause: Docker daemon unavailable.
   - Impact: cannot confirm 637/637 pass.
   - Action: restore Docker; re-run `npm test` and `npm run test:rls`.

4. **P2 — Gap 1 (platform settings persistence) deferred**
   - Root cause: not implemented.
   - Impact: Super Admin settings read-only.
   - Action: implement PATCH /api/v1/platform/settings or retain read-only with documented justification.

5. **P2 — Gap 2 (section CUID resolution) deferred**
   - Root cause: not implemented.
   - Impact: teacher roll call requires sectionId CUID.
   - Action: implement className+sectionName resolution in attendance route.