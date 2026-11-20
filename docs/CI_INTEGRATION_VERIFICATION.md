# SSVM ERP — CI Integration Verification

## Workflow
- .github/workflows/ci.yml

## Triggers
- push: branches [main, develop]
- pull_request: branches [main, develop]
- Default branch: main (confirmed)

## Required checks
- lint, typecheck, test (with postgres + redis services), build, e2e-playwright (real), security-scan

## Service dependencies
- postgres:16-alpine, redis:7-alpine

## Executed integration results
- Not run on integration branch (no CI run triggered)

## Artifact locations
- playwright-report, backend-coverage-report, backend-test-logs

## Remaining limitations
- e2e-playwright needs backend startup from current source; CI runs npm run dev (not production build)