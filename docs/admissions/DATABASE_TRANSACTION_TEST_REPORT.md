# SSVM ERP — Database Transaction & Failure Rollback Report
**Module:** Transaction Integrity & Failure Recovery  
**Mechanism:** PostgreSQL ACID Transactions via `runWithTenantDatabaseTransaction`

---

## 1. ACID Invariant & Failure Injection

In enterprise school admissions, partial commits are dangerous: creating a guardian, a user, and a fee record while failing on the student record results in database pollution and orphaned records.

The admission commit process runs entirely inside a single PostgreSQL database transaction:
- If any statement in the batch fails (e.g. invalid foreign key, duplicate key, constraint violation), the transaction is immediately rolled back.
- No orphan records remain in any related tables (`users`, `students`, `guardians`, `admissions`, `audit_logs`).

---

## 2. Test Verification Evidence

Verified in automated test `rolls back all entities if an unrecoverable failure occurs mid-transaction`:
1. **Failure Injection:**
   - Input batch containing an invalid foreign key: `resolvedSectionId: "non-existent-section-id-that-will-cause-foreign-key-violation"`.
2. **Execution:**
   - Commit attempted via `AdmissionRegistrationService.commitBatch`.
   - The database threw a foreign key violation (`students_sectionId_fkey`).
   - The transaction immediately aborted and rolled back.
3. **Database Audit Post-Rollback:**
   - Queried `Student` table for the injected student name: returned `null`.
   - Zero orphan student records created.
   - Database remains completely consistent.

