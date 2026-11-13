# SSVM ERP — Shared ERP Data-Entry Architecture Standard

**Canonical Specification:** `docs/SHARED_DATA_ENTRY_STANDARD.md`  
**Application Target:** All Portals, Primary Focus `erp-admin`  
**Scope:** Universal data-entry standards, non-compacting column mapping, empty-cell handling, and bulk ingestion workflows.

---

## 1. Principles & Architectural Invariants

### 1.1 Non-Compacting Column Rule
Spreadsheet files (.xlsx and .csv) frequently contain sparse data where optional cells are omitted. Under SSVM ERP:
- **No Column Shifting:** Cells must strictly retain their 1-based index from the header row. An empty cell in column 4 (`Gender`) must never cause column 5 (`Email`) to shift left.
- **No Row Compression:** Empty optional cells map directly to database `NULL`.
- **Literal Value Prohibition:** Spreadsheets must never insert text strings like `"N/A"`, `"null"`, `"None"`, or `"-"` to indicate absence of value. Any such string is sanitized to SQL `NULL`.

### 1.2 Clear Empty Fields Policy
When updating pre-existing records via unique identifier (`rollNo`, `employeeId`, `code`, etc.):
- **Default Policy (`clearEmptyFields = false`):** Empty cells in the uploaded spreadsheet leave existing database attributes intact. Omission means "do not change".
- **Explicit Erase Policy (`clearEmptyFields = true`):** When the administrator explicitly checks the toggle in the wizard, empty optional cells overwrite existing database values with `NULL`. Mandatory system attributes are never erased.

### 1.3 Tenant Relational Isolation
All foreign key references (classes, sections, guardians, subjects) are evaluated within the transaction-scoped tenant boundary (`app.current_school_id = '<school-id>'`). Cross-tenant foreign keys fail closed immediately.

---

## 2. Reusable UI Components

The shared data-entry UI consists of three components in `erp-admin/src/components/import/`:

### 2.1 `SharedDataEntryHeader`
Mounted at the top of all operational list and directory views (`/admin/students`, `/admin/admissions`, `/admin/institution/classes`, `/admin/institution/curriculum`, `/admin/students/guardians`).
- Primary Single Action: "➕ Add New {Entity}"
- Secondary Batch Action: "📥 Bulk Import" (opens `BulkImportWizardModal`)
- Tertiary Guide Action: "ℹ️ Excel Format & Help" (opens `ExcelFormatHelpModal`)

### 2.2 `ExcelFormatHelpModal`
Provides an interactive specification for the active entity type:
- Displays all accepted column names, required/optional status, data types, and accepted synonyms/aliases.
- Provides one-click downloads for styled `.xlsx` workbooks (with column validations and formatting) and plain `.csv` templates.
- Details relational placement rules (e.g. classes must exist before students can be placed in them).

### 2.3 `BulkImportWizardModal`
Four-stage transactional ingestion wizard:
1. **Upload:** Drag-and-drop file upload with format validation (.xlsx, .csv).
2. **Column Mapping:** Auto-matching using canonical alias resolution with manual dropdown override.
3. **Validation & Preview:** Server-side pre-validation reporting valid records, pre-existing updates, intra-file duplicates, and exact row/cell error breakdown.
4. **Commit & Results:** Transactional database commit with option toggles (`clearEmptyFields`, `skipInvalidRows`), progress tracking, and structured error logs.

