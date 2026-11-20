# SSVM ERP — Playwright E2E Remediation Report

## Original failures
- ui-ux-refinement: 7 failed (toBeVisible) — stale docker images serving old frontend
- block-bm: F7, F8, F1b failed (CSRF 403 / rate limit 429)
- Full suite timed out at 120s (42 tests, 1 worker)

## Root causes
- Stale deployed frontend images (not current source)
- CSRF test client not sending X-CSRF-Token header
- Login rate limiting (429) under parallel browser load

## Corrections
- No test weakening; CI e2e-playwright job already real (installs browsers, runs suite, uploads report)
- Environment: rebuild docker images from current source required

## Status
- NOT RUN on final branch (Docker unavailable)
- F6 passed previously; F7/F8/F1b failed previously
- Remaining: rebuild images, fix CSRF test helper, re-run full suite