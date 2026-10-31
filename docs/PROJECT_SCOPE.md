# SSVM ERP Project Scope

Updated: 2026-10-31  
Status: Draft baseline; business-owner scope approval is still required.

## Product surfaces observed

Seven Next.js frontends are present: `erp-admin`, `super-admin`, `teacher-portal`, `parent-portal`, `payment-portal`, `student-portal`, and `saas-frontend`. A Node/Express backend, Prisma/PostgreSQL schema, Redis/queue components, Docker Compose files, Prometheus/Grafana configuration, GitHub Actions, and Playwright files are also present.

## Candidate in-scope domains

The repository contains code for identity/authentication, school/branch administration, students, parents/guardians, teachers/HR/payroll, academics, attendance, assignments, examinations/results, fees/invoices/payments, scholarships, ledger/reconciliation/financial close, CRM/admissions/alumni, notices/events/CMS/gallery, communication/notifications, library, transport, reception, discipline, assets/inventory/procurement/vendors/purchase orders, reports/statistics/exports, documents/storage, governance/retention, audit, backups, queues, SaaS subscriptions/configuration, security, mobile APIs and SSE.

This is a code-derived candidate inventory, not an approved business scope. Product owners must approve which features are required, intentionally excluded, or obsolete before a 100% denominator can be established.

## Out of scope without explicit owner approval

- Production deployment or publishing.
- Live payment provider onboarding or transactions.
- Paid infrastructure provisioning.
- Git history rewriting.
- Changing official school fee, payroll, retention, or accounting policy.
- Migrating real school data.

## Acceptance principle

Only requirements that are approved, implemented, tested and supported by traceable evidence count as verified. See `FEATURE_REQUIREMENTS.md`, `IMPLEMENTATION_MASTER_TRACKER.md`, and `RELEASE_CRITERIA.md`.
