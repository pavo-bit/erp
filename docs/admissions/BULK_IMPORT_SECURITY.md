# SSVM ERP — Bulk Import Security & Tenancy Invariants

**Document:** `docs/admissions/BULK_IMPORT_SECURITY.md`  
**Status:** Canonical & Verified  
**Audience:** Security Architects, Penetration Testers, Compliance Officers

---

## 1. Tenancy Isolation & PostgreSQL RLS Enforcement

All bulk ingestion and commit operations strictly adhere to AGENTS.md Section 5 invariants:
1. **Fail-Closed Tenancy:** Missing tenant context (`schoolId`) fails closed immediately.
2. **Transaction Scoping:** Every database mutation executes within:
   ```typescript
   await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
     // SET LOCAL app.current_school_id = schoolId;
   });
   ```
3. **Cross-Tenant Prevention:** Validation queries preload masters (`classes`, `sessions`, `students`) strictly filtered by `schoolId`. A re-admission lookup targeting another school's student fails with `STUDENT_NOT_FOUND_IN_SCHOOL`.

---

## 2. Authentication & Authorization Guards

Endpoints under `/api/v1/admin/admissions/bulk` are classified as **Tier 1 (Session Authenticated)**:
- Middleware: `authenticate`, `requireRole(Role.SUPER_ADMIN, Role.ERP_ADMIN)`.
- Role check: Staff cannot bypass role checks.
- Audit Logging: Every committed batch records an immutable row in `AuditLog` containing `schoolId`, `userId`, `action: BULK_ADMISSION_{TYPE}_COMMITTED`, `entity: Admission`, `entityId: batchId`, and full attestation details.

---

## 3. Storage & Document Upload Security

1. **Private Storage Architecture:** Document files associated with admissions (Birth Certificates, TCs, Aadhaar scans) are stored in secure, private directories, never in public buckets or web-accessible root folders.
2. **Macro & Script Prohibition:** ExcelJS strictly ignores and discards VBA macros, active controls, external hyperlinks, and dynamic formulas. Formula cells are evaluated to their calculated values or stripped.
3. **MIME & Extension Whitelisting:** Workbooks must be genuine OpenXML spreadsheets (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

