# SSVM ERP — UI/UX BACKEND INTEGRATION GAPS (PART 1 AUDIT)

**Document:** `docs/UI_UX_BACKEND_INTEGRATION_GAPS.md`  
**Phase:** Part 1 UI/UX Refinement & Completion  
**Target Repository:** `pavo-bit/erp`  
**Branch:** `feature/ui-ux-part-1-completion`  
**Date:** 2026-11-20

---

## 1. Executive Summary

In accordance with Section 2 (Operating Rules 6, 7, 8, and 9) of the Part 1 Directive, all user-facing interfaces must interact with real backend endpoints or display explicit, non-simulated unavailable/read-only states. Fabricated numbers, simulated successful toasts without backend confirmation, and fake progress states have been eliminated across all seven portals.

This document records the exact backend integration gaps identified during the UI/UX audit for resolution in Part 2.

---

## 2. Identified Backend Integration Gaps

### Gap 1: Super Admin Global Platform Settings Persistence
- **Portal:** Super Admin (`super-admin`)
- **Page:** `/dashboard/settings`
- **Missing / Incomplete Endpoint:** `PATCH /api/v1/platform/settings/branding` and `PATCH /api/v1/platform/settings/features`
- **Current Backend State:** `ssvm-backend/src/routes/platform.ts` provides `/schools/health-usage`, `/support-sessions/*`, and `/kpi`, but contains no router or database table for global multi-tenant branding fallbacks or cluster-wide feature flags.
- **Expected Request Payload:**
  ```json
  {
    "themeMode": "DARK_PREMIUM" | "LIGHT_CLASSIC",
    "primaryColor": "#a855f7",
    "logoUrl": "https://domain.com/logo.png"
  }
  ```
  and
  ```json
  {
    "enableAIInsights": true,
    "enableCryptoPayments": false,
    "enforceMFA": true,
    "betaTransportV2": false
  }
  ```
- **Expected Response:**
  ```json
  {
    "success": true,
    "data": { "updatedAt": "2026-11-20T12:00:00.000Z", ... }
  }
  ```
- **Part 1 Frontend Handling:** Decorative fake "Save" buttons and uncommitted success toasts were removed. Replaced with explicit `Read-Only / Cluster Invariants` display and an informational notice explaining that persistence is scheduled for Part 2 backend ingestion.
- **Owning Backend Task (Part 2):** Platform Settings Controller & Redis/Database Configuration Store.

---

### Gap 2: Class Section Resolution in Teacher Roll Call
- **Portal:** Teacher Portal (`teacher-portal`)
- **Page:** `/portal/attendance`
- **Endpoint:** `POST /api/v1/attendance`
- **Current Backend State:** `POST /api/v1/attendance` requires `{ sectionId, date, records }`. When teachers submit roll call using standard grade notation (e.g. `10-A`), the backend requires a valid CUID `sectionId` corresponding to a database `Section` record.
- **Expected Request Payload:**
  ```json
  {
    "sectionId": "cmvwy984q0001qocgpclzv585",
    "date": "2026-11-20",
    "records": [
      { "studentId": "std_1", "status": "PRESENT", "remarks": null },
      { "studentId": "std_2", "status": "ABSENT", "remarks": "Sick leave" }
    ]
  }
  ```
- **Expected Improvement (Part 2):** Backend `POST /api/v1/attendance` should allow lookup by composite `className` + `sectionName` when a raw CUID `sectionId` is not known directly by the teacher client.
- **Part 1 Frontend Handling:** Connected form submission to live `apiCall` with explicit error banner reflecting exact backend validation messages rather than an artificial `setTimeout` success modal.
- **Owning Backend Task (Part 2):** Attendance Section Resolution Middleware.

---

### Gap 3: Parent Multi-Child Academic Aggregates API
- **Portal:** Parent Portal (`parent-portal`)
- **Page:** `/dashboard`
- **Missing / Incomplete Endpoint:** `GET /api/v1/parent/children/:studentId/summary`
- **Current Backend State:** Currently requires 4 independent client-side queries (`GET /attendance`, `GET /invoices`, `GET /assignments`, `GET /results`) filtered by `studentId`.
- **Expected Endpoint:**
  ```http
  GET /api/v1/parent/children/:studentId/summary
  ```
- **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "student": { "id": "...", "name": "..." },
      "attendanceRate": 94,
      "pendingFees": 12500,
      "pendingAssignmentsCount": 2,
      "latestResult": { "score": 88, "examTitle": "Term 1" },
      "recentAttendances": [ ... ],
      "upcomingDues": [ ... ]
    }
  }
  ```
- **Part 1 Frontend Handling:** Consolidated into parallel `Promise.all` with fallbacks and dynamic card calculations, removing hardcoded placeholder strings ("3 Pending", "88%").
- **Owning Backend Task (Part 2):** Parent Portal BFF (Backend-For-Frontend) Route.

---

### Gap 4: SaaS Public Registration API Port Alignment
- **Portal:** SaaS Frontend (`saas-frontend`)
- **Page:** `/`
- **Target Endpoint:** `POST /api/v1/saas/request`
- **Previous Configuration:** Defaulted fallback to `http://localhost:3001` (Super Admin portal port) rather than backend API port `5000`.
- **Part 1 Frontend Handling:** Updated fallback URL to `http://localhost:5000` with CSRF handling. Backend endpoint `POST /api/v1/saas/request` confirmed active in `ssvm-backend/src/routes/saas.ts`.

---

## 3. Summary of Status for Part 2

| Portal | Feature | Missing / Needs Backend Work | Status in Part 1 |
|---|---|---|---|
| `super-admin` | Global Settings | Persistent branding & feature flag routes | Contract pending notice shown; fake saves removed |
| `teacher-portal` | Roll Call Submission | Class string to section CUID resolution | Live `apiCall` wired; backend errors caught & displayed |
| `parent-portal` | Child Academic Summary | Single composite BFF endpoint | Client-side parallel fetch wired; hardcoded stats eliminated |
| `saas-frontend` | Public School Onboarding | None (endpoint exists on port 5000) | Port alignment verified |
