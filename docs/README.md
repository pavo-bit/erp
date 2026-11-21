# SSVM ERP — Documentation Index

**Canonical set:** 12 Markdown files  
**Source branch:** `main`  
**Last reviewed:** 2026-11-22

This directory intentionally contains only the major product, architecture, engineering, plan and project-status documents. Older phase reports, duplicate audits, temporary prompts, dated test reports and redundant trackers have been consolidated or removed.

## Start here

| Document | Purpose |
|---|---|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | **Single source of truth for what is implemented, verified, partial, blocked and outstanding.** Includes commit-specific CI evidence and next actions. |
| [PROJECT_PLAN_HIGH_LEVEL.md](PROJECT_PLAN_HIGH_LEVEL.md) | Programme goals, strategic workstreams, phases, dependencies and release gates. |
| [PROJECT_PLAN_LOW_LEVEL.md](PROJECT_PLAN_LOW_LEVEL.md) | Task-level implementation steps, affected areas, security considerations and acceptance criteria. |

## Product and system specifications

| Document | Primary contents |
|---|---|
| [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) | Product purpose, institutional profiles, approved functionality and scope boundaries. |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | System topology, portals, backend services, data flows, queues and observability. |
| [MODULES_AND_PORTALS.md](MODULES_AND_PORTALS.md) | Portal responsibilities, module catalogue, admission and bulk-import workflows. |

## Engineering and operations

| Document | Primary contents |
|---|---|
| [API_AND_INTEGRATIONS.md](API_AND_INTEGRATIONS.md) | API conventions, major route contracts, entitlements, OpenAPI and integrations. |
| [DATABASE_AND_FINANCIAL_INTEGRITY.md](DATABASE_AND_FINANCIAL_INTEGRITY.md) | Prisma/PostgreSQL model, migration governance, data and financial invariants. |
| [SECURITY_AND_TENANCY.md](SECURITY_AND_TENANCY.md) | Authentication, authorization, tenant isolation, RLS, audit and monitoring controls. |
| [DEVELOPMENT_AND_TESTING.md](DEVELOPMENT_AND_TESTING.md) | Developer setup, test commands, test environments, CI structure and evidence rules. |
| [DEPLOYMENT_AND_OPERATIONS.md](DEPLOYMENT_AND_OPERATIONS.md) | Runtime topology, production gates, monitoring, secrets, backups and recovery. |

## How to use these documents

1. Read this index and the high-level plan to understand the delivery sequence.
2. Use the low-level plan for concrete implementation tasks and acceptance criteria.
3. Refer to the technical specification before changing a subsystem.
4. Check project status before starting work; do not assume an older task remains pending or that an existing page/route means completion.
5. Update project status and the relevant technical specification after each verified change.

## Documentation governance

- Verified source code, migrations and executed tests take precedence over prose.
- `PROJECT_STATUS.md` is the only consolidated completion and blocker register.
- Do not add duplicate phase reports, prompt dumps, audit snapshots, gap registers or standalone test reports under `docs/`.
- Maintain exactly the 12 canonical Markdown files listed in this index.
- Update the reviewed date and audited commit when refreshing the status snapshot.
