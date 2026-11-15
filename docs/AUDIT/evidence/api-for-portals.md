# SSVM ERP — Backend Directives & API Handoff for Portals (Agent B)

**Canonical Document:** `docs/AUDIT/evidence/api-for-portals.md`  
**Author:** Agent A (Backend Engineering)  
**Target:** Agent B (Frontend & Portals Engineering)  
**Working Branch:** `main`

---

## 1. Portal Security & Dependency Remediation (Action Required for Agent B)

During the Stage 2 CI security triage, monorepo Trivy scans identified several Critical and High CVEs residing strictly in frontend portal lockfiles. These have been temporarily allowlisted in `.trivyignore` (expiry `2027-05-31`) to unblock CI, but require remediation by Agent B during portal tasks:

1. **Next.js 16 Framework Upgrades:**
   - **Advisories:** `CVE-2026-75604` (Critical RCE), `CVE-2026-64641` (High DoS), `CVE-2026-64642`, `CVE-2026-64645`, `CVE-2026-64649`.
   - **Portals Affected:** `erp-admin`, `super-admin`, `teacher-portal`, `parent-portal`, `student-portal`, `payment-portal`, `saas-frontend`.
   - **Action:** Bump `next` to safe version `^16.3.3` (or patch release `>=16.2.11` / `16.3.3`) in each portal's `package.json` and regenerate `package-lock.json`.
2. **`nanoid` Upgrades:**
   - **Advisories:** `CVE-2026-67213`, `CVE-2026-67214` (High DoS).
   - **Action:** Ensure `nanoid` is bumped to `>=3.3.18` or `>=5.1.6` across portals.
3. **`brace-expansion` Overrides:**
   - **Advisories:** `CVE-2026-102276`, `CVE-2026-102278` (High DoS).
   - **Action:** Add `"overrides": { "brace-expansion": "^2.1.8" }` to `super-admin/package.json`.

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
