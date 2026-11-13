# SSVM ERP — Guardian Relationship Integrity Verification Report
**Module:** Student Admissions & Guardian Deduplication  
**Audit Target:** Sibling Relationship Consistency & Shared Family Profiles

---

## 1. Requirement & Architecture

In educational institutions, multiple siblings commonly enroll in the same school. Creating duplicate `Guardian` records for the same parent leads to:
- Disconnected family fee ledgers.
- Fragmented communication across SMS/WhatsApp channels.
- Multi-child parent portal view failures.

The SSVM ERP admission pipeline enforces **shared guardian deduplication**:
- Primary match key: `(schoolId, primaryPhone)`.
- If an existing guardian record with the matching phone number exists within the school tenant, that `Guardian.id` is reused.
- Both siblings link to the exact same foreign key `Student.guardianId`.

---

## 2. Test Verification Evidence

Verified in automated test `associates two siblings to the exact same Guardian record without duplication`:
1. Sibling 1 ("Aarav Sharma") registered with Father primary phone `98XXXXXXX1`.
   - Result: Created `Guardian` record `id: grd_1`. `Student 1.guardianId = grd_1`.
2. Sibling 2 ("Ananya Sharma") registered in subsequent batch with matching father phone `98XXXXXXX1`.
   - Result: Reused existing `Guardian` record `id: grd_1`. `Student 2.guardianId = grd_1`.
3. Guardian update propagation verified:
   - Updated address on `Guardian.id = grd_1`.
   - Querying through both `Student 1` and `Student 2` reflected the identical updated residential address.
   - Sibling query `guardian.students` returned `length = 2`.

---

## 3. Database Constraints

- `Guardian` table has composite indexing on `[schoolId, primaryPhone]`.
- All operations scoped to active tenant context via `runWithTenantDatabaseTransaction`.

