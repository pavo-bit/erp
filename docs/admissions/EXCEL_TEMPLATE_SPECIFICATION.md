# SSVM ERP — Excel Template Specification

**Document:** `docs/admissions/EXCEL_TEMPLATE_SPECIFICATION.md`  
**Status:** Canonical & Verified  
**Audience:** Data Ingestion Specialists, Admission Officers, QA Engineers

---

## 1. Multi-Sheet Architecture Overview

Each admission workbook is structured into dedicated worksheets to avoid denormalized, redundant multi-hundred column spreadsheets.

| Worksheet Name | New Admission | Re-admission | Incoming Transfer | Primary Key / Foreign Key | Description |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`Instructions`** | Yes | Yes | Yes | N/A | Guidelines, color legends, and valid class/blood-group lists. |
| **`Students`** | Yes | No | Yes | `Import_Key` | Core demographic and personal identity attributes. |
| **`ReAdmissions`** | No | Yes | No | `Import_Key`, `Existing_SSVM_Admission_No` | Target re-admitting student lookup and verification. |
| **`Profile_Updates`** | No | Yes | No | `Import_Key` | Authorized profile changes applied on re-admission. |
| **`Guardians`** | Yes | Yes | Yes | `Guardian_Key` | Normalized parents/guardians contact directory. |
| **`Student_Guardians`** | Yes | Yes | Yes | `Import_Key` + `Guardian_Key` | Multi-guardian relationship mapping with `Is_Primary`. |
| **`Previous_School`** | No | No | Yes | `Import_Key` | Origin school name, board, TC number, and issue date. |
| **`Previous_Education`** | Yes | No | Yes | `Import_Key` | Prior academic history and marks percentage. |
| **`Academic_Placement`** | Yes | Yes | Yes | `Import_Key` | Target academic session, configured class, and section. |
| **`Documents`** | Yes | Yes | Yes | `Import_Key` | Document metadata references (Birth Certificate, TC, Photo). |
| **`Student_Facilities`** | Yes | Yes | Yes | `Import_Key` | Optional transport, hostel, and meal opt-ins. |

---

## 2. Controlled Vocabularies

### 2.1 Blood Group
Accepted values strictly validated against standard clinical groups:
- `A+`
- `A-`
- `B+`
- `B-`
- `AB+`
- `AB-`
- `O+`
- `O-`
- `NOT_KNOWN`

### 2.2 Gender
- `MALE`
- `FEMALE`
- `OTHER`

### 2.3 Guardian Relationship
- `FATHER`
- `MOTHER`
- `GUARDIAN`
- `OTHER`

### 2.4 Configured Admission Classes
Classes must match the institutional academic catalogue dynamically (Prarambha, Bodha, Class 1 through Class 12). Classes are validated against active school session masters, never hardcoded in the parser.

---

## 3. Strict Column Mapping & Empty-Cell Policy

1. **Non-Compacting Column Mapping:** Empty cells maintain exact positional alignment. Under no circumstance are missing cells compacted to cause column shifting.
2. **Empty Value Representation:**
   - Empty optional cells in new records resolve to database `NULL`.
   - Literal text `"N/A"`, `"-"`, or `"null"` is sanitized to database `NULL`.
   - Blank required cells trigger fatal validation errors.
3. **Re-admission Overwrite Safety:** In Re-admission workbooks, blank optional cells **do not** overwrite existing database values unless the user explicitly flags `clearEmptyFields: true` (disabled by default).

