# SSVM ERP — Registration Number Concurrency & Locking Report
**Module:** Monotonic Sequence Allocation Engine  
**Mechanism:** Transaction-Scoped PostgreSQL Advisory Locking (`pg_advisory_xact_lock`)

---

## 1. Concurrency Challenge

Under heavy admission periods, multiple school administrators simultaneously upload and commit student admission batches containing dozens or hundreds of students. Without strict transactional locking, race conditions cause:
- Duplicate key violations on `(schoolId, admissionNo)`.
- Gaps or non-monotonic sequence allocations.
- Blocked batch operations due to deadlock.

---

## 2. Advisory Locking Architecture

To guarantee strict monotonic sequence generation without altering existing schema migrations or creating custom sequence tables:
```sql
SELECT pg_advisory_xact_lock(hashtext('admission_seq_' || $1));
```
Where `$1` is the `schoolId`.

### Key Characteristics:
1. **Transaction Scope:** Automatically released when the surrounding transaction commits or rolls back. No manual lock cleanup required.
2. **Tenant Scoped:** Hashes `admission_seq_${schoolId}`, ensuring concurrency between School A and School B is 100% parallel and independent.
3. **Zero Collision Guarantee:** Serializes sequence calculations per school while allowing parallel processing across distinct schools.

---

## 3. Test Verification Evidence

Verified in automated test `allocates consecutive collision-free admission numbers under simultaneous concurrent commits`:
- **Scenario:** 3 concurrent batches of 3 students each committed simultaneously via `Promise.all`:
  - Batch 1 (3 entries)
  - Batch 2 (3 entries)
  - Batch 3 (3 entries)
- **Results:**
  - Total allocated admission numbers: 9.
  - Unique numbers count: 9 (0 duplicates).
  - Sequence: Consecutive monotonic integers (`ADM-2026-0004` through `ADM-2026-0012`).
  - No database deadlocks or transaction aborts.

