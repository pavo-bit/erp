# Phase 1: Tenant Transaction Context & Connection Lifecycle

**Document Version:** 1.0.0  
**Phase:** 1 (P0 Security & Multi-Tenancy)  
**Status:** VERIFIED & HARDENED  
**Key Implementation:** `runWithTenantDatabaseTransaction` & `schoolContextMiddleware`  

---

## 1. Context Architecture & Propagation Flow

Tenant context is propagated through an unbroken chain from the incoming HTTP request down to the database connection:

```
[ HTTP Request ]
       │
       ▼
[ schoolContextMiddleware ]
  - Extracts tenant from JWT claim `schoolId`
  - Validates school status in database
  - Stores in AsyncLocalStorage (`setAuthenticatedSchoolContext`)
       │
       ▼
[ Application Service / Route Handler ]
  - Obtains `schoolId` via `getCurrentSchoolId()`
  - Enters transaction boundary: `runWithTenantDatabaseTransaction(schoolId, async (tx) => { ... })`
       │
       ▼
[ runWithTenantDatabaseTransaction ]
  - Acquires dedicated client from connection pool
  - Begins transaction: `tx.$executeRawUnsafe("SET LOCAL app.current_school_id = '<schoolId>'")`
  - Validates transaction nesting:
      * Same-school nesting -> Permitted (reuses active transaction context)
      * Cross-school nesting -> Throws fatal `TenantMismatchError`
       │
       ▼
[ PostgreSQL RLS Engine ]
  - Evaluates `current_setting('app.current_school_id', true)`
  - Filters table rows strictly to target `schoolId`
       │
       ▼
[ Transaction Finalization (COMMIT or ROLLBACK) ]
  - Because `SET LOCAL` is used, the session variable is automatically discarded upon transaction end
  - Connection returned to PgBouncer / pool carries zero residual tenant context
```

---

## 2. Hardening Measures & Protection Against Connection Leaks

### 2.1. Transaction-Local Scoping (`SET LOCAL`)
The application uses `SET LOCAL app.current_school_id = $1` inside transactions. In PostgreSQL, `SET LOCAL` is scoped strictly to the current transaction block (`BEGIN ... COMMIT / ROLLBACK`). When the transaction finishes or terminates abnormally, PostgreSQL discards the variable immediately.

### 2.2. Cross-School Nesting Detection
```typescript
// Nested transaction guard in ssvm-backend/src/lib/prisma.ts:
if (activeTenantTransactionContext) {
  if (activeTenantTransactionContext.schoolId !== schoolId) {
    throw new TenantMismatchError(
      `Cannot nest tenant transaction for school '${schoolId}' inside active transaction for '${activeTenantTransactionContext.schoolId}'`
    );
  }
  return callback(activeTenantTransactionContext.tx);
}
```
This prevents a scenario where a service method handling School A calls an internal helper that mistakenly specifies School B, preventing cross-tenant data corruption.

### 2.3. Connection Pool Reuse Validation
Tests specifically stress connection pool recycling under:
1. Normal commit.
2. Unhandled exception / transaction rollback.
3. Rapid concurrent interleaving (200 requests alternating School A and School B).

---

## 3. Verified Test Assertions (`src/tests/db/tenant-wrapper.test.ts`)

| Scenario | Assertion | Result |
|---|---|---|
| **No Context** | `(a) returns 0 rows when queried outside a tenant context` | **PASSED** |
| **Active Context** | `(b) returns only tenant A rows when executed in context A` | **PASSED** |
| **Commit Pool Hygiene** | Context is empty immediately after transaction commit | **PASSED** |
| **Rollback Pool Hygiene** | Context is empty immediately after transaction abort | **PASSED** |
| **High Concurrency** | `(d) maintains strict tenant isolation across 200 concurrent interleaved requests` | **PASSED** |
| **Same-School Nesting** | Allows same-school nested transactions and reuses context | **PASSED** |
| **Cross-School Nesting** | Throws error when attempting to nest a transaction for a different school | **PASSED** |

