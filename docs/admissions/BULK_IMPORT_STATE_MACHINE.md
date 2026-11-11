# SSVM ERP — Bulk Import State Machine

**Document:** `docs/admissions/BULK_IMPORT_STATE_MACHINE.md`  
**Status:** Canonical & Verified  
**Audience:** State Machine Designers, Test Engineers

---

## 1. Batch Job Lifecycle (`BulkJob`)

```
                  ┌───────────────┐
                  │   UPLOADED    │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │    PARSING    │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   VALIDATING  │
                  └───────┬───────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │ VALIDATION_   │           │ READY_TO_     │
    │ FAILED        │           │ COMMIT        │
    └───────────────┘           └───────┬───────┘
                                        │
                                        ▼ (Attestation Required)
                                ┌───────────────┐
                                │  COMMITTING   │
                                └───────┬───────┘
                                        │
                  ┌─────────────────────┼─────────────────────┐
                  ▼                     ▼                     ▼
          ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
          │   COMPLETED   │     │   PARTIALLY   │     │    FAILED     │
          │ (0 row fails) │     │   COMPLETED   │     │(all row fails)│
          └───────────────┘     └───────────────┘     └───────────────┘
```

---

## 2. Row Entry Lifecycle (`ValidatedStudentEntry`)

1. **`PENDING`**: Row extracted from workbook, pending validation.
2. **`VALID`**: All rules, references, and data checks passed.
3. **`WARNING`**: Non-blocking advisory; can be committed.
4. **`DUPLICATE_REVIEW`**: Potential duplicate identity flagged for confirmation.
5. **`INVALID`**: Fatal validation failure; cannot be committed unless corrected.
6. **`REGISTERED`**: Canonical student created, new Admission Number generated, enrolled in session.
7. **`READMISSION_RECORDED`**: Re-admitted into new session placement, original permanent number preserved.
8. **`FAILED`**: Row mutation aborted during commit transaction.

