# SSVM ERP — Bulk Import Security, Tenancy & Permissions Matrix

**Canonical Specification:** `docs/BULK_IMPORT_SECURITY_AND_PERMISSIONS.md`  
**Security Classification:** Tier 1 (Session Authenticated with Role-Based & Module Entitlement Guards)

---

## 1. Security Classification & Middleware Chain

All bulk import endpoints under `/api/v1/admin/import/*` and `/api/v1/import/*` require Tier 1 session authentication and role verification:

```
[Request]
   │
   ▼
1. authenticate (JWT token verification, user active state, token revocation check)
   │
   ▼
2. schoolContextMiddleware (AsyncLocalStorage setting app.current_school_id)
   │
   ▼
3. requireRole(['SUPER_ADMIN', 'ADMIN', 'ERP_ADMIN']) (Explicit role-based guard)
   │
   ▼
4. upload.single('file') (Memory storage buffer limit: 10MB; MIME validation)
   │
   ▼
5. runWithTenantDatabaseTransaction(schoolId, async (tx) => { ... })
```

---

## 2. Permissions Matrix by Module

| Module Name | Module Identifier | Required Roles | Associated Module Entitlement | Endpoint Access |
| :--- | :---: | :--- | :---: | :--- |
| **Student Directory** | `students` | `SUPER_ADMIN`, `ERP_ADMIN` | `CORE` | Full Preview & Commit |
| **Parents & Guardians** | `guardians` | `SUPER_ADMIN`, `ERP_ADMIN` | `CORE` | Full Preview & Commit |
| **Staff & Teachers** | `staff` | `SUPER_ADMIN`, `ERP_ADMIN` | `HR` | Full Preview & Commit |
| **Classes & Sections** | `classes` | `SUPER_ADMIN`, `ERP_ADMIN` | `CORE` | Full Preview & Commit |
| **Curriculum & Subjects**| `subjects` | `SUPER_ADMIN`, `ERP_ADMIN` | `CORE` | Full Preview & Commit |
| **Daily Attendance** | `attendance` | `SUPER_ADMIN`, `ERP_ADMIN`, `TEACHER` | `ATTENDANCE` | Full Preview & Commit |
| **Fee Structures** | `fees` | `SUPER_ADMIN`, `ERP_ADMIN`, `ACCOUNTANT` | `FEES` | Full Preview & Commit |

---

## 3. Data Protection & Tenancy Invariants

1. **Strict SQL Parameterization & Tenant Isolation:** Every import operation executes inside `runWithTenantDatabaseTransaction` with PostgreSQL Row-Level Security:
   ```sql
   SET LOCAL app.current_school_id = '<school-id>';
   ```
   No operation can read or modify another school's records even if a malicious payload injects foreign IDs.
2. **Buffer In-Memory Processing:** Uploaded spreadsheet files are processed entirely in memory via Multer memory storage; no temporary unencrypted files are written to host disk during parsing.
3. **Audit Ledger Logging:** Every bulk ingestion creates an immutable `BulkJob` record and triggers an `AuditLog` event recording:
   - `actorId`: User ID of importing administrator.
   - `schoolId`: Tenant institution identifier.
   - `action`: `BULK_IMPORT_PROCESSED`.
   - `metrics`: Total rows, created count, updated count, failed count.

