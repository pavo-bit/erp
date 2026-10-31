# Phase 4 — Application and Workflow Completion

Updated: 2026-10-31

## Status: NOT VERIFIED

### Portal inventory

The repository contains seven Next.js applications: `erp-admin`, `super-admin`, `teacher-portal`, `parent-portal`, `payment-portal`, `student-portal`, and `saas-frontend`. Their complete route/API contract matrix and role-based workflows have not yet been audited.

### Implemented in this work

- Updated portal API clients to capture `X-CSRF-Token` from safe responses and send it on unsafe requests. SaaS registration fetches a token before submitting. Builds and browser flows have not been verified.
- Private document URLs now point to an authenticated API download endpoint.

### Remaining work

- Inventory active frontend API calls and compare them to backend contracts.
- Resolve student identity, placeholder IDs, dashboard metrics and loading/error/empty states.
- Verify parent/teacher ownership and admin/faculty/financial-close routes.
- Complete inventory transfers and procurement state transitions.
- Verify reports and generated records use real authorized data.
- Execute database-backed role workflows and Playwright E2E.

No completion percentage is claimed.
