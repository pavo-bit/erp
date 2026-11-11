# SSVM ERP — Canonical Documentation Index

**Document Reference:** `docs/README.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Canonical Project Documentation Index

---

## Overview

This directory contains the authoritative, consolidated technical documentation for the SSVM ERP platform. All historical phase reports, temporary audit requests, and redundant trackers have been consolidated into the following ten canonical specifications:

---

## Canonical Document Directory

| Document | Primary Scope & Contents |
| :--- | :--- |
| **1. [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md)** | Approved functional requirements, 4 institutional profiles (State Board, CBSE, ICSE, International), core vs optional capabilities, and explicit scope boundaries. |
| **2. [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** | End-to-end architecture, Express.js backend core, 7 Next.js portals, Redis BullMQ queues, PgBouncer pooling, domain boundaries, and data flows. |
| **3. [SECURITY_AND_TENANCY.md](SECURITY_AND_TENANCY.md)** | Multi-tenant PostgreSQL Row-Level Security (`app.current_school_id`), non-superuser unprivileged runtime role `ssvm_app`, 5 route security tiers, RBAC, and audit trails. |
| **4. [DATABASE_AND_FINANCIAL_INTEGRITY.md](DATABASE_AND_FINANCIAL_INTEGRITY.md)** | 216 Prisma models categorized by ownership, schema migrations, zero-float Decimal arithmetic, double-entry balanced general ledger ($\sum \text{Dr} \equiv \sum \text{Cr}$), and webhook idempotency. |
| **5. [API_AND_INTEGRATIONS.md](API_AND_INTEGRATIONS.md)** | 428 backend endpoints across 36 route files, `/api/v1` versioning, request/response contracts, external webhooks, biometric devices, and telemetry ingestion. |
| **6. [MODULES_AND_PORTALS.md](MODULES_AND_PORTALS.md)** | Detailed specification of all 7 Next.js frontend applications, the 35 ERP Admin functional modules, role-specific workspaces, and institutional profile mapping. |
| **7. [DEVELOPMENT_AND_TESTING.md](DEVELOPMENT_AND_TESTING.md)** | Prerequisites, local Docker setup, database seed scripts, 59 Vitest test suites, test database worker isolation, and TypeScript compiler verification. |
| **8. [DEPLOYMENT_AND_OPERATIONS.md](DEPLOYMENT_AND_OPERATIONS.md)** | Docker Compose production topology, Prometheus metrics (`:9090`), Grafana dashboards (`:3004`), Alertmanager (`:9093`), health probes, backup/restore procedures, and incident response runbooks. |
| **9. [RELEASE_STATUS_AND_BLOCKERS.md](RELEASE_STATUS_AND_BLOCKERS.md)** | Authoritative master batch completion register (Batches 0–9 VERIFIED, Batch 10 BLOCKED), 618 verified passing tests, and external live credentials blocker register. |

---

## Document Governance Rules

1. **Code Superiority:** When any discrepancy arises between documentation and implementation, the verified, tested source code is authoritative.
2. **Strict Document Allowlist:** No additional Markdown files, phase trackers, or temporary audit notes should be created in `docs/` or subdirectories. Updates must be applied directly to these canonical documents.
3. **Evidence-Based Tracking:** Test counts, model tallies, and endpoint numbers must match exact runtime counts verified by scripts and automated test suites.

