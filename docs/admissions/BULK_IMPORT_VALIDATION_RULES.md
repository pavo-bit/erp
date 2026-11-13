# SSVM ERP — Bulk Import Validation Rules

**Document:** `docs/admissions/BULK_IMPORT_VALIDATION_RULES.md`  
**Status:** Canonical & Verified  
**Audience:** QA Engineers, Backend Developers, Security Auditors

---

## 1. Multi-Tier Validation Pipeline

The bulk admission engine runs a 4-tier validation pipeline:

```
[ Uploaded Excel Buffer ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ Tier 1: Workbook Structural Integrity                  │
│ - Valid .xlsx binary format (ZIP archive)              │
│ - Max file size: 15MB                                  │
│ - Required worksheet presence verification             │
│ - Column header recognition                            │
└────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ Tier 2: Relational Integrity (Zero N+1 Queries)        │
│ - Intra-file Import_Key uniqueness                     │
│ - Guardian_Key resolution in Student_Guardians         │
│ - Academic Placement resolution in school session/class│
└────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ Tier 3: Field-Level Data Dictionary Rules              │
│ - Mandatory field presence                             │
│ - Date format YYYY-MM-DD & age boundary (2-25 years)   │
│ - Controlled enumerations (Gender, Blood Group)        │
│ - Phone number format & PEN uniqueness                 │
└────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ Tier 4: Type-Specific Business Rules                   │
│ - NEW: No conflicting student identity; PEN uniqueness │
│ - READMISSION: Mandatory existing admission number,   │
│   student exists in school, no duplicate session enroll│
│ - TRANSFER: Mandatory previous school & TC number      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Validation Status Classification

- **`VALID`**: All checks passed; ready for atomic transactional commit.
- **`WARNING`**: Non-blocking advisory (e.g. potential duplicate name+DOB, missing emergency phone). Record can still be committed.
- **`DUPLICATE_REVIEW`**: Warning flag for prospective identity conflict requiring human confirmation.
- **`INVALID`**: Fatal validation failure (e.g. broken relationship key, missing required field, duplicate PEN). Row is excluded from commit when `skipInvalidRows: true`.

