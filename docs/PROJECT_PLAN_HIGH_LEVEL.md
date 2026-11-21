# SSVM ERP — High-Level Project Plan

**Canonical document:** `docs/PROJECT_PLAN_HIGH_LEVEL.md`  
**Source branch:** `main`  
**Last reviewed:** 2026-11-22  
**Planning baseline:** `93e6ceb0e2671acc0adbad3f02d52395f5976e0a`

## 1. Programme purpose

Complete, stabilize and safely release the existing SSVM ERP platform as a multi-tenant school-management SaaS product. This programme closes verified integration gaps and proves current behaviour; it is not a greenfield rewrite.

The system consists of an Express/TypeScript API, PostgreSQL with transaction-scoped Row-Level Security, Redis-backed services, and seven Next.js portals:

- School ERP Admin — `erp-admin`
- SaaS Super Admin — `super-admin`
- Teacher — `teacher-portal`
- Student — `student-portal`
- Parent/Guardian — `parent-portal`
- Payment — `payment-portal`
- SaaS marketing/onboarding — `saas-frontend`

## 2. Target outcomes

The programme is complete when:

1. Backend tests, migrations, RLS and security checks pass on the current `main` commit.
2. All seven portals type-check and build.
3. Playwright E2E tests pass repeatedly against deterministic test data.
4. Admissions, guardian, document, shift, transport and hostel workflows are connected end to end.
5. Platform settings have explicit persistence, authorization and audit contracts.
6. External production dependencies are configured and verified or explicitly excluded from the release scope.
7. Production image publishing, deployment, health checks, rollback and restore procedures are demonstrated.
8. Documentation accurately reflects the current code and current verification evidence.

A successful compile, or the existence of a model, route or page, is not sufficient acceptance evidence.

## 3. Non-negotiable boundaries

- **Main-only workflow:** all repository changes are committed directly to `main`; do not create or switch branches or open pull requests.
- **Existing-system first:** extend working modules rather than replacing them without a demonstrated architectural need.
- **Tenant isolation:** derive school context from the authenticated server-side identity and enforce PostgreSQL RLS.
- **Transactional integrity:** related state changes, especially payments and facility allocations, must commit atomically.
- **Identity safety:** do not auto-merge unrelated guardians using phone number alone; preserve permanent student/admission identity.
- **Paper-first admissions:** retain printable A4 admission forms and staff-assisted data entry; do not introduce public online admission submission without an explicit scope decision.
- **No fake production success:** missing credentials, providers, storage, databases or deployment targets remain explicit blockers.
- **Evidence-based status:** current commit-specific CI/test results take precedence over old reports.

## 4. Programme phases

| Phase | Workstream | Scope | Exit gate | Current position |
|---|---|---|---|---|
| 0 | Documentation and source governance | Main-only workflow, canonical documentation, accurate status | One clear source of truth and clean main history | This documentation reset is in progress |
| 1 | CI and E2E stabilization | Backend, RLS, security, portal builds, Playwright fixtures and browser workflows | All required CI jobs pass and E2E passes repeatedly | Backend/RLS/build gates pass in latest observed CI; Playwright still fails |
| 2 | Platform governance | Persistent platform settings, allowlist, Super Admin authorization and audit | Read/write/security/audit tests pass | Read-only UI exists; persistence not implemented |
| 3 | Admission foundations | Shift rules, shared filtering, guardian review and document lifecycle | API/UI/integration and tenant-isolation tests pass | Partially implemented |
| 4 | Facility operations | Connect admission FacilityRequests to existing transport and hostel allocations | Atomic state transitions and concurrency tests pass | Manual allocation systems exist; admission integration remains |
| 5 | Production readiness | Production DB pre-check, image publishing, deployment, payments, SMS, storage, backups and monitoring | Real environment smoke test and restore drill | Blocked by external configuration and unverified operations |
| 6 | Final acceptance | Full regression, security review, documentation and owner sign-off | All required gates have evidence; no critical blockers | Not ready for production acceptance |

## 5. Dependency sequence

```text
Canonical docs and main baseline
              |
              v
Backend + RLS + security + seven portal CI
              |
              v
Playwright fixtures, server lifecycle and failing scenarios
              |
              v
Platform settings and admission foundations
              |
              v
Transport / hostel request-allocation integration
              |
              v
Production configuration and deployment proof
              |
              v
Full release acceptance and owner sign-off
```

Owner provisioning (production database, provider credentials and hosting target) can proceed alongside engineering, but these external dependencies cannot be simulated into a production pass.

## 6. Priority order

### Immediate — P0

1. Inspect current Playwright traces and error-context artifacts.
2. Correct failing admission-to-invoicing, audit, duplicate-control locator, timetable locator and fee overview scenarios based on evidence.
3. Investigate PostgreSQL cleanup permission errors for `refresh_tokens` and `otps`.
4. Run the full Playwright suite twice against fresh fixtures and verify all CI jobs on the resulting commit.

### Next — P1

5. Design and implement persistent Platform Settings.
6. Harden school shift publication and admission resolution.
7. Introduce shared server-side operational filters.
8. Complete guardian identity review and the admission document lifecycle.
9. Integrate transport and hostel FacilityRequests with existing allocation services.

### Production gates — P0/P1 external

10. Provision the production database and approved least-privileged receipt pre-check identity.
11. Implement and verify GHCR publishing and deployment against an owner-selected target.
12. Configure live payment, SMS, durable storage, backups, monitoring and alert delivery.
13. Execute production smoke tests and a restore drill.

## 7. Definition of done

A workstream is complete only when:

- Implementation exists in the intended module and follows current architecture.
- API contracts, validation, authorization and tenant boundaries are explicit.
- Database changes are forward-only and migration-safe.
- Relevant unit, API, integration and UI/E2E tests execute and pass.
- Failure, retry, rollback and concurrency cases are addressed where relevant.
- Documentation and status are updated with the exact commit and test evidence.
- No unresolved critical security or data-integrity issue remains.

## 8. Scope exclusions

Unless explicitly approved, this plan does not include a greenfield rewrite, a public online admission funnel, weakening RLS/CSRF/MFA, replacing the current database architecture, changing the main-only Git rule, or declaring deployment without a selected and configured target.

## 9. Status governance

[PROJECT_STATUS.md](PROJECT_STATUS.md) is the live completion and blocker register. Task-level implementation steps and acceptance criteria are in [PROJECT_PLAN_LOW_LEVEL.md](PROJECT_PLAN_LOW_LEVEL.md). Update those files after each verified task instead of creating additional phase reports.
