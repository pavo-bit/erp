# SSVM ERP — Backend Directives & API Handoff for Portals (Agent B)

**Canonical Document:** `docs/AUDIT/evidence/api-for-portals.md`  
**Author:** Agent A (Backend Engineering)  
**Target:** Agent B (Frontend & Portals Engineering)  
**Working Branch:** `main`

---

## 1. Portal Security & Dependency Remediation (Action Required for Agent B)

During the Stage 2 CI security triage, monorepo Trivy scans identified several Critical and High CVEs residing strictly in frontend portal lockfiles. These have been temporarily allowlisted in `.trivyignore` (expiry `2026-12-15` per directive) to unblock CI, but require remediation by Agent B during portal tasks:

1. **Next.js 16 Framework Upgrades:**
   - **Advisories:** `CVE-2026-75604` (Critical RCE), `CVE-2026-64641` (High DoS), `CVE-2026-64642`, `CVE-2026-64645`, `CVE-2026-64649`, `CVE-2026-94482` (High Server Actions DoS), `CVE-2026-94483` (High Image Optimization SSRF).
   - **Portals Affected:** `erp-admin`, `super-admin`, `teacher-portal`, `parent-portal`, `student-portal`, `payment-portal`, `saas-frontend`.
   - **Action:** Bump `next` to safe version `^16.4.1` (or `>=16.3.8`) in each portal's `package.json` and regenerate `package-lock.json`.
2. **`nanoid` Upgrades:**
   - **Advisories:** `CVE-2026-67213`, `CVE-2026-67214` (High DoS).
   - **Action:** Ensure `nanoid` is bumped to `>=3.3.18` or `>=5.1.6` across portals.
3. **`brace-expansion` Overrides:**
   - **Advisories:** `CVE-2026-102276`, `CVE-2026-102278`, `CVE-2026-13149`, `CVE-2026-14257`, `CVE-2026-69152` (High DoS).
   - **Action:** Add `"overrides": { "brace-expansion": "^2.1.8" }` to `super-admin/package.json` and `parent-portal/package.json`.
4. **`postcss` Upgrades:**
   - **Advisories:** `CVE-2026-45623`, `CVE-2026-73646` (High DoS and Path Traversal).
   - **Action:** Update `postcss` to `>=8.5.18` across all portal dependencies.
5. **`browserslist` Upgrades:**
   - **Advisories:** `CVE-2026-73088`, `CVE-2026-73089` (High DoS).
   - **Action:** Update `browserslist` to `>=4.28.7` in `parent-portal`.
6. **`fast-uri` Upgrades:**
   - **Advisories:** `CVE-2026-13676`, `CVE-2026-16221`, `CVE-2026-18446`, `CVE-2026-75899`, `CVE-2026-75975`, `CVE-2026-76172`, `CVE-2026-84292` (High SSRF / Authority Injection).
   - **Action:** Override or update `fast-uri` to `>=3.1.7` / `>=4.1.4` in `parent-portal`.

---

## 2. Phase 1 School Shift Configuration & Validation APIs

Super Admin and Portal developers should consume the following finalized endpoints for managing institution shifts:

### Endpoints:
1. `GET /api/v1/super-admin/schools/:schoolId/sessions`
   - Returns all academic sessions configured for the target school.
2. `GET /api/v1/super-admin/schools/:schoolId/sessions/:sessionId/classes`
   - Returns all active classes for the session.
3. `POST /api/v1/super-admin/schools/:schoolId/shifts`
   - Body: `{ name: string, type: "MORNING"|"DAY"|"EVENING", startTime: "HH:mm", endTime: "HH:mm", sessionId: string, classIds: string[] }`
   - Creates shift in `DRAFT` state with class associations. Fails 400 if `startTime >= endTime`.
4. `POST /api/v1/super-admin/schools/:schoolId/shifts/validate`
   - Body: `{ sessionId: string }`
   - Verifies all classes in the session are mapped to non-overlapping shifts.
5. `POST /api/v1/super-admin/schools/:schoolId/shifts/publish`
   - Body: `{ sessionId: string }`
   - Transitions valid shifts from `DRAFT` to `PUBLISHED` and bumps `shiftVersion`.

---

## 3. Bulk Admission Attestation & User Identity Contract

When submitting bulk admissions or offline approval attestations (`POST /api/v1/admissions/bulk`):
- `attestedByUserId` must be the UUID of the authenticated staff/admin user (`req.user.id`).
- Dummy strings (e.g. `"USER-1"`) will fail foreign key constraint checks against `users(id)`.
- If a student has no email, send the invitation to the guardian email; if no guardian email exists, the record is flagged with status `UNDELIVERABLE`. Never generate fake `@student.ssvm` email addresses.

---

## 4. Platform Health, Observability & Audited Support Session API Contract (Block M7)

Targeted for Super Admin Portal (`super-admin`) and Institutional Administration (`erp-admin`):

### 1. Per-School Platform Health & Usage Aggregates
- **Endpoints:**
  - `GET /api/v1/platform/schools/health-usage` (all schools)
  - `GET /api/v1/platform/schools/:schoolId/health-usage` (single school)
- **Security:** Requires `SUPER_ADMIN` role and `aud: PLATFORM`. School tokens and anonymous requests receive `403` / `401`.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "schoolId": "cmvwy984q0001qocgpclzv585",
        "schoolName": "SSVM Central Campus",
        "schoolCode": "MAIN",
        "status": "ACTIVE",
        "plan": "ENTERPRISE",
        "modules": ["CORE_HR", "FEE_MANAGEMENT", "ATTENDANCE_LMS"],
        "lastLogin": "2026-11-17T08:00:00.000Z",
        "activeUsers": 42,
        "requestVolume": 12850,
        "errorRate": 0.0
      }
    ]
  }
  ```
- **Privacy Guarantee:** Aggregates only; zero student rows are queried or exposed.

### 2. Audited Support Session Request (MFA-Gated)
- **Endpoint:** `POST /api/v1/platform/support-sessions/request`
- **Security:** Requires `SUPER_ADMIN` role, `aud: PLATFORM`, and valid MFA re-authentication code (`mfaCode`).
- **Request Body:**
  ```json
  {
    "schoolId": "cmvwy984q0001qocgpclzv585",
    "reason": "Investigating ledger reconciliation anomaly reported in ticket #4092",
    "durationMinutes": 30,
    "mfaCode": "123456"
  }
  ```
- **Response Shape (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "supp_1794901200000_a1b2c3d4",
      "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2026-11-17T08:30:00.000Z",
      "durationMinutes": 30,
      "schoolId": "cmvwy984q0001qocgpclzv585",
      "reason": "Investigating ledger reconciliation anomaly reported in ticket #4092",
      "status": "ACTIVE"
    }
  }
  ```
- **Operational Invariants:**
  - Increments Prometheus gauge `ssvm_support_sessions_active`.
  - Emits in-app transactional notification to the target school.
  - Appends SHA256 hashed audit log `SUPPORT_SESSION_INITIATED`.

### 3. Support Session Revocation
- **Endpoint:** `POST /api/v1/platform/support-sessions/:id/revoke`
- **Security:** Requires `SUPER_ADMIN` role and `aud: PLATFORM`.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Support session successfully revoked",
      "session": {
        "id": "supp_1794901200000_a1b2c3d4",
        "schoolId": "cmvwy984q0001qocgpclzv585",
        "status": "REVOKED",
        "revokedAt": "2026-11-17T08:15:00.000Z"
      }
    }
  }
  ```
- **Operational Invariants:**
  - Decrements Prometheus gauge `ssvm_support_sessions_active`.
  - Blocklists JWT session `jti` in Redis.
  - Appends SHA256 hashed audit log `SUPPORT_SESSION_REVOKED`.

### 4. School Active Support Session Visibility
- **Endpoint:** `GET /schools/me/support-session` (also accessible via `/api/v1/schools/me/support-session`)
- **Security:** Authenticated school staff / `ERP_ADMIN`.
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "active": true,
      "session": {
        "id": "supp_1794901200000_a1b2c3d4",
        "reason": "Investigating ledger reconciliation anomaly reported in ticket #4092",
        "startedAt": "2026-11-17T08:00:00.000Z",
        "expiresAt": "2026-11-17T08:30:00.000Z",
        "superAdminEmail": "platform-admin@ssvm.internal",
        "status": "ACTIVE"
      }
    }
  }
  ```

