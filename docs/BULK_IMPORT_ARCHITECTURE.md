# SSVM ERP — Universal Bulk Import Architecture

**Canonical Specification:** `docs/BULK_IMPORT_ARCHITECTURE.md`  
**Backend Pipeline:** `ssvm-backend/src/services/import-framework/`  
**Route Group:** `/api/v1/admin/import/*`

---

## 1. Architectural Pipeline

The bulk import framework operates as an asynchronous, transactional, seven-stage pipeline:

```
[Uploaded .xlsx / .csv]
          │
          ▼
┌───────────────────────────┐
│    1. FileParserService   │ ◄── 1-based cell indexing; non-compacting sparse row parser
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│   2. ColumnMapperService  │ ◄── Alias resolution & user override mapping
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│ 3. ValidationEngineService│ ◄── Type checks, regex, enums & tenant cache preloading
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│4. DuplicateDetectorService│ ◄── Intra-file duplicate detection & DB record classification
└─────────────┬─────────────┘
              │
              ▼ (User reviews preview, selects policies)
┌───────────────────────────┐
│  5. ImportProcessorService│ ◄── Transactional database mutation with clearEmptyFields policy
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│ 6. BulkJob & Audit Ledger │ ◄── AuditLog recorded, progress updated, errorLog serialized
└───────────────────────────┘
```

---

## 2. Service Responsibilities

### 2.1 `TemplateRegistryService` (`template-registry.ts`)
Houses canonical schema definitions for core ERP entities:
- `students`: Roll number, name, class, section, admission number, dob, gender, email, phone.
- `guardians`: Parent name, relationship, primary phone, email, address, linked student roll.
- `staff`: Employee ID, full name, email, department, role, phone.
- `classes`: Class name, section names, seat capacity, room number.
- `subjects`: Subject code, name, type (THEORY, PRACTICAL, BOTH), credits.
- `attendance`: Student roll number, date, status (PRESENT, ABSENT, LATE, HALF_DAY), remarks.
- `fees`: Fee category, amount, frequency, class association.

### 2.2 `FileParserService` (`file-parser.ts`)
- **Excel (.xlsx):** Uses `exceljs`. Traverses cells strictly by 1-based column index: `row.getCell(colIndex).value`. Empty cells produce `null` at their exact column position, preventing shift.
- **CSV (.csv):** Uses `papaparse` with empty tokens preserving array position (`['val1', '', 'val3']`).
- **Literal Value Sanitization:** Replaces `"N/A"`, `"NA"`, `"null"`, `"NONE"`, `"-"` with `null`.

### 2.3 `ColumnMapperService` (`column-mapper.ts`)
Normalizes header names by lowercasing, stripping punctuation, and resolving synonyms against the alias catalog. Supports explicit manual user overrides.

### 2.4 `ValidationEngineService` (`validation-engine.ts`)
- Preloads tenant relational caches (`Class`, `Section`, `Student`) in a single query to eliminate N+1 latency.
- Validates data types, date formats (`YYYY-MM-DD`, `DD/MM/YYYY`), email regex, phone patterns, and allowed enum values.

### 2.5 `DuplicateDetectorService` (`duplicate-detector.ts`)
- Identifies duplicates within the uploaded file and flags subsequent occurrences as `DUPLICATE_FILE`.
- Batches unique keys against the tenant database to classify valid rows as either `CREATE` (new record) or `UPDATE` (pre-existing record).

### 2.6 `ImportProcessorService` (`import-processor.ts`)
- Wraps entire batch mutation inside `runWithTenantDatabaseTransaction(schoolId, async (tx) => { ... })`.
- Applies the `clearEmptyFields` policy.
- Updates the existing `BulkJob` model tracking `progress`, `successRows`, `failedRows`, and `errorFile`.

