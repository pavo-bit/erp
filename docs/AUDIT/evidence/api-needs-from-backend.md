# SSVM ERP — API Needs from Backend (Agent B to Agent A)

**Canonical Document:** `docs/AUDIT/evidence/api-needs-from-backend.md`  
**Author:** Agent B (Frontend and QA Engineer)  
**Target:** Agent A (Backend Engineering)  
**Working Branch:** `main`  
**Generated At:** 2026-11-22  

---

## 1. Overview
This document records missing or role-restricted API endpoints encountered during Block B-A portal standardization. Where backend contracts are not yet available or forbid target stakeholder roles, the corresponding portal screens render a clean disabled control or placeholder labelled **"Not available yet"** per policy.

---

## 2. API Needs by Module & Portal

### 1. Data Governance & Retention Policies (Super Admin)
- **Portal:** `super-admin` (`/dashboard/governance`, `src/app/(dashboard)/governance/page.tsx`)
- **Required Endpoint:** `GET /api/v1/admin/governance-workflows/retention-policies`
- **Method:** `GET`, `POST`, `DELETE`
- **Request Shape:**
  ```json
  {
    "schoolId": "string (tenant UUID)",
    "entityName": "AuditLog" | "VisitorLog" | "LedgerEntry" | "AdmissionEnquiry",
    "retentionDays": 90,
    "action": "PURGE" | "ARCHIVE"
  }
  ```
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "schoolId": "string",
        "entityName": "string",
        "retentionDays": 90,
        "action": "PURGE",
        "createdAt": "2026-11-22T00:00:00.000Z"
      }
    ]
  }
  ```
- **Current Portal Handling:** Screen displays disabled control labelled "Not available yet".

---

### 2. Student Results & Examination Marks Self-Access (Student Portal)
- **Portal:** `student-portal` (`/results`, `app/(dashboard)/results/page.tsx`)
- **Required Endpoint:** `GET /api/v1/students/me/results` (or allowing role `STUDENT` on `GET /api/v1/exams` filtered to own class)
- **Method:** `GET`
- **Current Issue:** `/api/v1/exams` and `/api/v1/results` enforce `requireTeacherOrAdmin()`, returning HTTP 403 `Forbidden` to authenticated students.
- **Request Parameters:** None (scoped by session studentId)
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string (examId)",
        "name": "Mid-Term Examination 2026",
        "startDate": "2026-10-10",
        "endDate": "2026-10-20",
        "subjects": [
          { "subject": "Mathematics", "marksObtained": 92, "maxMarks": 100, "grade": "A1" }
        ],
        "totalMarks": 92,
        "maxTotal": 100,
        "percentage": 92.0
      }
    ]
  }
  ```
- **Current Portal Handling:** Screen displays clean empty / "Not available yet" message.

---

### 3. Guardian Results & Performance View (Parent Portal)
- **Portal:** `parent-portal` (`/results`, `src/app/(dashboard)/results/page.tsx`)
- **Required Endpoint:** `GET /api/v1/guardians/me/children/:studentId/results` (or allowing role `PARENT` on `GET /api/v1/results?studentId=:id`)
- **Method:** `GET`
- **Current Issue:** `/api/v1/results` enforces `requireTeacherOrAdmin()`, returning HTTP 403 `Forbidden` to authenticated parents.
- **Request Parameters:** Query `studentId` (validated against guardian's linked children)
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "examName": "Half-Yearly Assessment",
        "date": "2026-09-15",
        "percentage": "88.5%",
        "grade": "A"
      }
    ]
  }
  ```
- **Current Portal Handling:** Screen displays clean empty / "Not available yet" message.

---

### 4. General Ledger / Accounting Journal Query for ERP Admin
- **Portal:** `erp-admin` (`/admin/fees/ledger`, `src/app/admin/fees/ledger/page.tsx`)
- **Required Endpoint:** `GET /api/v1/finance/ledger`
- **Method:** `GET`
- **Request Parameters:** `page`, `limit`, `accountCode`, `startDate`, `endDate`
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "transactionDate": "2026-11-20T10:00:00.000Z",
        "accountCode": "1010-BANK",
        "accountName": "Operating Bank Account",
        "debit": 15000.00,
        "credit": 0.00,
        "balance": 150000.00,
        "reference": "RCPT-2026-0042"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```
- **Current Portal Handling:** Screen displays disabled control labelled "Not available yet".

---

### 5. Institutional Data Governance Policies (ERP Admin)
- **Portal:** `erp-admin` (`/admin/governance`, `src/app/admin/governance/page.tsx`)
- **Required Endpoint:** `GET /api/v1/schools/me/governance/policies`
- **Method:** `GET`, `PUT`
- **Current Portal Handling:** Screen displays disabled control labelled "Not available yet".

---

### 6. Parental Consent & Authorization Management (Parent Portal)
- **Portal:** `parent-portal` (`/settings/consent`, `src/app/(dashboard)/settings/consent/page.tsx`)
- **Required Endpoint:** `GET /api/v1/guardians/me/consents`, `POST /api/v1/guardians/me/consents`
- **Method:** `GET`, `POST`
- **Current Portal Handling:** Screen displays disabled control labelled "Not available yet".
