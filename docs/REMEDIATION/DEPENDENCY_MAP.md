# Remediation Dependency Map

## Critical security chain

```text
Authenticated identity
  → request-local school context
  → complete model ownership classification
  → transaction-scoped PostgreSQL tenant setting
  → fail-closed RLS policies and least-privilege runtime role
  → cross-tenant integration tests
  → sensitive business route verification
```

RLS and transaction-safe context are a release blocker. The current app-level context handoff test does not satisfy the database gate.

## Business workflow dependencies

```text
Finance invariants and exact money schema
  → payment/provider ownership and idempotency
  → atomic ledger posting
  → real reconciliation records and matching rules
  → period close validation and authorization
  → PostgreSQL financial regression tests
```

```text
Authenticated tenant role
  → CRM lead ownership / inventory stock ownership
  → purchase request / approval controls
  → PO line receipt quantity schema
  → stock ledger integration
  → end-to-end business workflow tests
```

Current finance-governance, CRM, inventory and procurement route controls are focused mitigations; their database-backed workflows remain incomplete.

## Delivery dependencies

```text
Passing type/lint/unit checks
  → PostgreSQL + Redis integration suite
  → Playwright journeys and CI execution
  → clean Docker startup + migration verification
  → backup/restore drill + operational sign-off
  → production acceptance
```

Hosted CI, E2E, Docker readiness and backup restoration remain unverified.
