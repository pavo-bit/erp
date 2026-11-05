# Lint Baseline and Ratchet Audit

**Status:** APPROVED & PINNED  
**Canonical Command:** `npm run lint` in `ssvm-backend`  
**Baseline Commit SHA:** `37db7b8f1135ed867624e5a08ba565dfd4360c28` (`remediation/80pct` head)  
**Baseline Counters:** 639 errors, 1 warning (640 total problems)

---

## 1. Executive Summary

During Phase 2 remediation across Lane A (DB Spine) and Lane B (Finance), discrepancy was observed in reported ESLint problem counts:
- **Lane A reported:** 561 / 583 errors
- **Lane B measured:** 640 problems (639 errors, 1 warning) on the exact same base commit (`37db7b8`)

To eliminate ambiguity across all lanes and future PRs, Lane E was tasked with:
1. Pinning **one canonical command**: `npm run lint` inside `ssvm-backend`.
2. Recording the exact baseline in `lint-baseline.json` with commit SHA `37db7b8f1135ed867624e5a08ba565dfd4360c28`.
3. Enforcing an automated ratchet script (`scripts/check-lint-ratchet.cjs`) so that any increase in errors or warnings fails CI with exit code 1.
4. Documenting why the earlier numbers differed.

---

## 2. Analysis: Why the Earlier Numbers Differed

An exact, file-by-file audit of commit `37db7b8f1135ed867624e5a08ba565dfd4360c28` reveals the source of the variance:

### A. Target File Scope (`src/` vs Non-Test vs Subdirectories)
When ESLint is executed on the full `src/` tree versus excluding test files:
- **`src/**` excluding `src/tests/**`:** 542 errors, 1 warning (543 problems).
- **`src/tests/**` exclusively:** 97 errors, 0 warnings (97 problems).
- **Sum total across `src/`:** 639 errors, 1 warning (640 problems).

In earlier Wave 0 runs and preliminary Lane A runs, commands were run against `src/routes`, `src/services`, or with `--ignore-pattern "src/tests/**"`, yielding figures between 519 and 561 problems.

### B. Lane A PR #3 Test Suite Additions
In PR #3 (`lane/a-db-spine`), Lane A added critical security and tenant isolation integration test suites:
- `src/tests/security/tenant-isolation.spec.ts`: 17 lint errors (unused imports, `any` casts).
- `src/tests/multitenancy/isolation.test.ts`: 8 lint errors.
- `src/tests/setup.ts`: 10 lint errors.

These high-value test additions increased the test suite lint errors from ~62 to 97, bringing the repository total to 639 errors.

### C. Execution Path and Pinned Command Discrepancies
- Lane A evaluated `eslint src/` with varying flags and local configurations.
- Lane B ran the exact script entry `"lint": "eslint src/ --max-warnings 0"` from `ssvm-backend/package.json`, which parsed all TypeScript files in `src/` including `src/tests/`.

---

## 3. Pinned Canonical Baseline Specification

All lanes and CI workflows must execute:
```bash
npm run lint
# Executed inside ssvm-backend/
```

### Baseline Configuration (`lint-baseline.json`)
```json
{
  "commitSha": "37db7b8f1135ed867624e5a08ba565dfd4360c28",
  "command": "npm run lint in ssvm-backend",
  "errors": 639,
  "warnings": 1,
  "totalProblems": 640
}
```

### Ratchet Rules
1. **Zero Increase:** Any commit that raises total errors above `baseline.errors` (639) or warnings above `baseline.warnings` (1) fails CI immediately.
2. **Downward Ratchet:** When a lane refactors code and resolves baseline lint errors, the lane may ratchet down the baseline in `lint-baseline.json` to permanently lock in the improvement.
3. **Current State:** With Lane B's cleanup in `src/routes/payments.ts`, the repository currently stands at **634 errors, 1 warning (635 problems)**, an improvement of 5 errors against baseline.
