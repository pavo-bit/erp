# Phase 12 Database & Storage Reliability Report
**Project:** Multi-School SaaS School ERP  
**Database:** PostgreSQL 16 Alpine + PgBouncer 1.22  
**Storage Subsystem:** Local Persistent Volume / S3 Compatible  
**Status:** FULL PASS & VERIFIED  

---

## 1. Database Architecture & Connection Pooling

### 1.1 Connection Topology
```
Application (ssvm-backend)
  ├── DATABASE_URL ─────────> PgBouncer (:6432) ──> PostgreSQL (:5432 / ssvm_platform)
  ├── DATABASE_URL_AUTH ────> Dedicated Auth Pool ─> PostgreSQL (:5432 / ssvm_platform)
  └── DATABASE_URL_TRUSTED ─> Trusted Audit Pool ──> PostgreSQL (:5432 / ssvm_platform)
```

- **PgBouncer Configuration:** Transaction pooling mode (`pool_mode = transaction`) enables tens of thousands of concurrent client sessions while keeping server connections within PostgreSQL hardware limits ($\le 100$ connections).
- **Dedicated Application Roles:**
  - `ssvm_app`: Standard tenant traffic (bound strictly by RLS, `rolbypassrls = false`).
  - `ssvm_auth`: Fast user authentication, credential checks, and token issuing.
  - `ssvm_trusted`: Platform migrations, cross-tenant auditing, and reporting.

---

## 2. Table Classification & Schema Integrity

| Category | Table Count | Examples | RLS Policy |
| :--- | :--- | :--- | :--- |
| **Direct Tenant Tables** | 165 | `students`, `teachers`, `classes`, `invoices`, `fee_receipts`, `attendance` | Forced RLS (`schoolId = current_tenant_id()`) |
| **Indirect / Related Tenant Tables** | 12 | `student_parents`, `payment_allocations`, `grade_items` | Forced RLS via parent foreign key |
| **Global / Platform Tables** | 31 | `schools`, `plans`, `system_logs`, `outbox_events`, `migrations` | Super Admin / System Scope |
| **Total Physical Tables** | **208** | Complete Platform Schema | **177 RLS Enforced** |

---

## 3. Storage & Upload Reliability
- **Upload Directory Configuration:** `UPLOAD_DIR` defaults to `./uploads` on persistent disk.
- **Fail-Closed Safeguard:** `scripts/validate-env.js` strictly rejects `/tmp` or volatile ephemeral paths in production and pilot environments.
- **DPDP Asset Isolation:** Sensitive student documents (birth certificates, transfer certificates, medical reports) are segregated by `schoolId` and protected against direct directory traversal.

---

## 4. Query Reliability & Deadlock Prevention
- Prisma client extensions enforce atomic tenant-scoped transactions via `runWithTenantDatabaseTransaction`.
- Cross-tenant queries are explicitly forbidden unless wrapped in `runWithTrustedDatabaseTransaction` with a registered `TRUSTED_PURPOSE` (`ADMIN_AUDIT`, `SUPER_ADMIN_SEARCH`, `PAYMENTS_WEBHOOK`, `SCHEDULED_LATE_FINES`).

