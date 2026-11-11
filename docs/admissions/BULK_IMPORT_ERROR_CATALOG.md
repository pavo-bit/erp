# SSVM ERP — Bulk Import Error Catalog

**Document:** `docs/admissions/BULK_IMPORT_ERROR_CATALOG.md`  
**Status:** Canonical & Verified  
**Audience:** Front-End Engineers, Technical Support, Data Stewards

---

## 1. Structural & Parsing Errors

| Error Code | Level | Description | Recommended Correction |
| :--- | :--- | :--- | :--- |
| `CORRUPT_WORKBOOK` | Fatal | Excel file cannot be unpacked by OpenXML parser. | Re-save workbook as clean `.xlsx` file and upload. |
| `MISSING_REQUIRED_SHEET` | Fatal | A required sheet (e.g. `Students`, `Guardians`) is missing. | Download official template and populate required tabs. |
| `DUPLICATE_IMPORT_KEY` | Fatal | Two students share the exact same `Import_Key`. | Ensure every row has a unique `Import_Key` (`STU-001`, `STU-002`). |

---

## 2. Relational & Master Data Errors

| Error Code | Level | Description | Recommended Correction |
| :--- | :--- | :--- | :--- |
| `BROKEN_GUARDIAN_REFERENCE` | Fatal | `Student_Guardians` links to non-existent `Guardian_Key`. | Verify `Guardian_Key` exists in `Guardians` sheet. |
| `NO_GUARDIAN_LINKED` | Warning | Student has no linked guardian in `Student_Guardians`. | Link at least one primary guardian (`Is_Primary = TRUE`). |
| `CLASS_NOT_FOUND` | Fatal | Referenced class does not exist in the active school masters. | Verify class name matches institutional classes (`Class 1`). |
| `SECTION_NOT_FOUND` | Fatal | Referenced section does not exist in target class. | Verify section name (`A`, `B`) under target class. |

---

## 3. Data Dictionary & Attribute Errors

| Error Code | Level | Description | Recommended Correction |
| :--- | :--- | :--- | :--- |
| `INVALID_STUDENT_NAME` | Fatal | Student name is empty or shorter than 2 characters. | Enter the student's legal name. |
| `MISSING_DOB` | Fatal | Date of birth is missing. | Enter birth date in `YYYY-MM-DD` format. |
| `INVALID_DOB_FORMAT` | Fatal | Date string could not be parsed as valid date. | Use `YYYY-MM-DD` format. |
| `INVALID_GENDER` | Fatal | Gender is not `MALE`, `FEMALE`, or `OTHER`. | Select one of the controlled values. |
| `INVALID_BLOOD_GROUP` | Fatal | Blood group is not in controlled list. | Use: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `NOT_KNOWN`. |
| `INVALID_EMAIL` | Fatal | Email failed standard RFC format validation. | Correct email syntax or leave blank if optional. |
| `INVALID_PHONE_NUMBER` | Fatal | Phone number is not a valid 10-15 digit string. | Enter numeric mobile contact. |
| `DUPLICATE_PEN_NUMBER` | Fatal | Permanent Education Number belongs to another student. | Verify National PEN or resolve duplicate. |

---

## 4. Admission Type Specific Errors

| Error Code | Level | Description | Recommended Correction |
| :--- | :--- | :--- | :--- |
| `MISSING_EXISTING_ADMISSION_NO` | Fatal | Re-admission row missing mandatory previous number. | Provide existing SSVM Admission Number. |
| `STUDENT_NOT_FOUND_IN_SCHOOL` | Fatal | Re-admission number does not exist in this school. | Check number against Admission Register. |
| `DUPLICATE_SESSION_ENROLLMENT` | Fatal | Student is already enrolled in the target session. | Re-admission cannot duplicate an active session enrollment. |
| `MISSING_TRANSFER_SCHOOL` | Fatal | Transfer student missing `Previous_School_Name`. | Enter transferring school in `Previous_School` sheet. |
| `MISSING_TC_NUMBER` | Fatal | Transfer student missing `TC_Number`. | Enter Transfer Certificate Number in `Previous_School` sheet. |
| `ATTESTATION_REQUIRED` | Fatal | User did not attest to offline approval (`attested: false`). | Check the required offline attestation checkbox. |

