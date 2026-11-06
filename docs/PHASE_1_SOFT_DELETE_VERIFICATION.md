# Phase 1: Soft-Delete Tenant Isolation Verification

**Document Version:** 1.0.0  
**Phase:** 1 (P0 Security & Multi-Tenancy)  
**Status:** AUDITED & TEST-VERIFIED  
**Audited Models:** `Student`, `User`, `Invoice`, `PaymentTransaction`  

---

## 1. Domain Ownership Models & Soft-Delete Semantics

| Model | Multi-Tenancy Ownership Type | Soft-Delete Representation | Tenant Protection Mechanism |
|---|---|---|---|
| **`Student`** | Directly Tenant-Owned (`schoolId` mandatory) | `deletedAt DateTime?` | Protected by RLS (`school_id = current_tenant_id()`) + Prisma middleware |
| **`User`** | Directly Tenant-Scoped (`schoolId` foreign key to `School`) | `deletedAt DateTime?` | Protected by RLS (`school_id = current_tenant_id()`) + escalation trigger guard |
| **`Invoice`** | Directly Tenant-Owned (`schoolId` mandatory) | `deletedAt DateTime?` | Protected by RLS (`school_id = current_tenant_id()`) + general ledger invariants |
| **`PaymentTransaction`** | Directly Tenant-Owned (`schoolId` mandatory) | `deletedAt DateTime?` | Protected by RLS (`school_id = current_tenant_id()`) + idempotency keys |

---

## 2. Security Behaviors Verified

### 2.1. Read Behavior (D1)
- Active records are visible only within their authorized tenant context (`schoolId`).
- Soft-deleted records (`deletedAt IS NOT NULL`) are automatically excluded from ordinary queries via Prisma query extension filters (`where: { deletedAt: null }`).
- Cross-tenant queries for deleted records return 0 rows.

### 2.2. Soft-Delete Mutation Behavior (D2)
- Calling `prisma.student.delete(...)`, `prisma.user.delete(...)`, `prisma.invoice.delete(...)`, or `prisma.paymentTransaction.delete(...)`:
  - **Own School:** Intercepted by the soft-delete extension; transforms the `DELETE` query into `UPDATE ... SET deletedAt = NOW()`. The record remains in the database with audit timestamp intact.
  - **Another School:** Attempting to soft-delete an entity belonging to School B while in School A's context fails with Prisma error `P2025` (*"An operation failed because it depends on one or more records that were required but not found"*). **No data is modified in the other school.**

### 2.3. Transaction Integrity (D3 & D4)
- Verified both **inside** and **outside** `runWithTenantDatabaseTransaction`:
  - Inside `runWithTenantDatabaseTransaction(schoolA.id)`: Cross-school delete throws `P2025`, transaction rolls back safely. Own-school delete soft-deletes and commits.
  - Inside `runWithSchoolContext(schoolA.id)`: Same strict isolation and error behavior.

---

## 3. Test Evidence (`src/tests/db/tenant-wrapper.test.ts`)

```typescript
// Test assertions executed against live PostgreSQL 16:
it("soft-deletes Student, User, Invoice, PaymentTransaction OUTSIDE transaction (School A context)", async () => { ... });
it("soft-deletes Student, User, Invoice, PaymentTransaction INSIDE runWithTenantDatabaseTransaction", async () => { ... });
```

### Verified Results:
1. `tx.student.delete({ where: { id: studentB.id } })` -> **REJECTED (P2025 / 0 rows affected)**
2. `tx.user.delete({ where: { id: userB.id } })` -> **REJECTED (P2025 / 0 rows affected)**
3. `tx.invoice.delete({ where: { id: invoiceB.id } })` -> **REJECTED (P2025 / 0 rows affected)**
4. `tx.paymentTransaction.delete({ where: { id: paymentB.id } })` -> **REJECTED (P2025 / 0 rows affected)**
5. `tx.student.delete({ where: { id: studentA.id } })` -> **SUCCEEDED (`deletedAt` set)**
6. `tx.user.delete({ where: { id: userA.id } })` -> **SUCCEEDED (`deletedAt` set)**
7. `tx.invoice.delete({ where: { id: invoiceA.id } })` -> **SUCCEEDED (`deletedAt` set)**
8. `tx.paymentTransaction.delete({ where: { id: paymentA.id } })` -> **SUCCEEDED (`deletedAt` set)**
9. State check on School B entities confirmed `deletedAt` remained `null` in all instances.

