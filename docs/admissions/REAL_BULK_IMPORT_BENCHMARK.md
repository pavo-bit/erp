# SSVM ERP — Real Database-Backed Bulk Import Benchmarks
**Test Engine:** PostgreSQL 16 on Port 5433 (Live Database)  
**Run Mode:** Real Multi-Row Transactional Commits  
**Audit Date:** 2026-11-11

---

## 1. Benchmark Execution Methodology

Unlike mock unit tests that stub database calls, these benchmarks execute real database transactions:
- Creating `User` accounts with Argon2id password hashing.
- Creating `Guardian` records with phone deduplication.
- Allocating monotonic `ADM-YYYY-XXXX` registration numbers with advisory locks.
- Writing canonical `Student` records.
- Creating historical `Admission` audit rows.
- Recording `AuditLog` entries.

---

## 2. Actual Performance Results

| Batch Size | Target Threshold | Actual Measured Time | Margin / Headroom | Status |
| :---: | :---: | :---: | :---: | :---: |
| **1 Record** | < 250 ms | **81 ms** | **+67.6% faster** | **PASS** |
| **10 Records** | < 1,500 ms | **690 ms** | **+54.0% faster** | **PASS** |
| **50 Records** | < 5,000 ms | **3,599 ms** | **+28.0% faster** | **PASS** |

### Projected Extrapolations:
- **100 Records:** ~7.2 seconds.
- **500 Records:** Handled asynchronously via existing BullMQ background worker queue (`bulkImportWorker`).

---

## 3. Verification Log Output

```
stdout | src/tests/api/admissions-acceptance-audit.test.ts > Verification 9: Real Database-Backed Bulk Import Benchmarks
[Benchmark 1 Record Real DB Commit]: 81ms
[Benchmark 10 Records Real DB Commit]: 690ms
[Benchmark 50 Records Real DB Commit]: 3599ms
```

