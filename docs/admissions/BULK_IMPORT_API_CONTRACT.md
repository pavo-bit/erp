# SSVM ERP — Bulk Import REST API Contract

**Document:** `docs/admissions/BULK_IMPORT_API_CONTRACT.md`  
**Status:** Canonical & Verified  
**Audience:** Frontend Developers, Integration Engineers, QA Testers

---

## 1. Endpoints Overview

All routes are mounted under `/api/v1/admin/admissions/bulk`:

| Method | Endpoint | Description | Guards |
| :--- | :--- | :--- | :--- |
| **GET** | `/templates` | List metadata of supported admission templates | `authenticate`, `ERP_ADMIN`/`SUPER_ADMIN` |
| **GET** | `/templates/:type/download` | Download versioned `.xlsx` template file | `authenticate`, `ERP_ADMIN`/`SUPER_ADMIN` |
| **POST** | `/preview` | Upload and validate workbook buffer; return preview metrics | `authenticate`, `ERP_ADMIN`/`SUPER_ADMIN` |
| **POST** | `/commit` | Atomically commit validated records with user attestation | `authenticate`, `ERP_ADMIN`/`SUPER_ADMIN` |
| **GET** | `/history` | Query past admission batch jobs with pagination | `authenticate`, `ERP_ADMIN`/`SUPER_ADMIN` |
| **GET** | `/history/:jobId` | Retrieve detailed audit log and error file for a batch | `authenticate`, `ERP_ADMIN`/`SUPER_ADMIN` |

---

## 2. Payload Specifications

### 2.1 POST `/preview`
- **Request:** `multipart/form-data` with `file: File` (.xlsx)
- **Response:**
```json
{
  "success": true,
  "data": {
    "fileName": "SSVM_New_Admission_Bulk.xlsx",
    "fileSize": 18452,
    "batchId": "ADM-BATCH-1794393818",
    "admissionType": "NEW",
    "templateVersion": "1.0.0",
    "totalRows": 45,
    "validRows": 43,
    "invalidRows": 2,
    "warningRows": 1,
    "duplicateReviewRows": 1,
    "readyToRegisterCount": 43,
    "isValid": false,
    "errors": [
      {
        "sheet": "Students",
        "rowNumber": 12,
        "field": "Blood_Group",
        "fieldLabel": "Blood Group",
        "value": "X+",
        "code": "INVALID_BLOOD_GROUP",
        "message": "Blood Group 'X+' is invalid. Allowed: [A+, A-, B+, B-, AB+, AB-, O+, O-, NOT_KNOWN]."
      }
    ],
    "entries": [...]
  }
}
```

### 2.2 POST `/commit`
- **Request:** `application/json`
```json
{
  "batchId": "ADM-BATCH-1794393818",
  "admissionType": "NEW",
  "attestation": {
    "admissionType": "NEW",
    "sessionId": "session_2026_2027",
    "approvalDate": "2026-03-25",
    "approvingAuthority": "Dr. S. K. Dash, Principal",
    "approvalRegisterNumber": "REG-2026-OFFLINE-04",
    "attested": true
  },
  "entries": [...],
  "clearEmptyFields": false,
  "skipInvalidRows": true
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "ADM-BATCH-1794393818",
    "admissionType": "NEW",
    "totalRows": 43,
    "successCount": 43,
    "failedCount": 0,
    "status": "COMPLETED",
    "results": [
      {
        "importKey": "STU-001",
        "sourceRowNumber": 2,
        "studentId": "cmwbzrksj000bc7ocugr5xyau",
        "studentName": "Aditya Narayan Nayak",
        "admissionNo": "ADM-2026-0001",
        "status": "REGISTERED",
        "message": "Student successfully registered and enrolled into Class 1 A."
      }
    ]
  }
}
```

