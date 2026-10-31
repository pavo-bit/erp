# Phase 3 — Business Modules

## Status: IN PROGRESS / DB TESTS BLOCKED

- **CRM:** authentication, admissions/admin role gate, server-derived school and interaction actor, and school checks for lead, campaign and stage added. DB ownership tests remain.
- **Inventory:** operations-admin role gate, server-derived school/actor, school-owned item/location validation and serializable movement transaction added. Unsupported `TRANSFER` is rejected because the API has no destination location. DB concurrency/cross-school tests remain.
- **Procurement:** authenticated request/approval; requester and PO creator derive from user; approval is school-scoped and vendor ownership is checked. Float monetary columns remain. Approval segregation rules need finance-owner agreement.
- **Goods receipt:** now returns 501 instead of falsely receiving all items. The schema has no per-line received quantity or receipt-line records; partial/full receipt needs additive schema work.
- **Documents/governance/retention:** earlier targeted fixes are documented in the existing phase reports; HTTP/database authorization tests remain incomplete.

No module is considered fully workflow-verified until positive, negative and cross-tenant database tests pass.
