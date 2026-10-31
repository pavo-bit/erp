# SSVM ERP Technical Decisions

Updated: 2026-10-31

| Decision | Rationale | Status |
|---|---|---|
| Preserve existing changes in `docker-compose.yml` and `ssvm-backend/Dockerfile` | They predated remediation and belong to the shared working tree. | Applied |
| Keep removed secret-bearing backup out of the active tree; do not rewrite history without approval | Avoid active exposure while preserving repository history. | Applied; credential rotation and history review outstanding |
| Require explicit non-production demo seed opt-in and caller-supplied privileged credentials | Prevent known-password account creation. | Applied; no seed execution test |
| Require explicit test database URL for destructive tests | Existing test fixture truncates all public tables. | Applied |
| Keep CI lockfile deterministic (`npm ci`) and repair lock metadata only | Avoid silently substituting dependency resolution. | Applied; package.json dependencies unchanged for lock repair |
| Enable backend ESLint using a flat config and supported ESLint 10 | Existing lint script had no installed ESLint/config; supported release avoids EOL v9. | Added; currently reports existing violations |
| CSRF middleware uses stable browser context because it executes before route authentication | `req.user` is not set at global CSRF validation time. | Applied; CSRF tests pass, browser integration unverified |
| Do not issue 100% or production-ready verdict without requirement-level evidence | Prevent unsupported completion claims. | Applied |
