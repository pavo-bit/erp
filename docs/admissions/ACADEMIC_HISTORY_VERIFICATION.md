# SSVM ERP — Academic History & Re-admission Identity Report
**Module:** Re-admission Lifecycle & Historical Timeline  
**Audit Target:** Identity Preservation & Non-Destructive Progression

---

## 1. Core Rule & Specification

When a student applies for **Re-admission** (e.g. returning to school after a sabbatical, gap year, or rejoining after leaving):
1. **Admission Number = Permanent SSVM Registration Number:** The original admission number (e.g. `ADM-2026-0003`) must **never** change or be reassigned.
2. **Canonical Identity Preservation:** The existing `Student` record (`id`) remains unchanged. A new duplicate student record is never created.
3. **Academic Enrollment History:**
   - Previous classes and sections remain intact in historical audit tables and past session records.
   - A `StudentTimeline` event is appended with `type: READMISSION`, recording the re-admission date, session, and approving authority.
   - The student's active `sectionId` is updated to the newly requested placement.

---

## 2. Test Verification Evidence

Verified in automated test `preserves original permanent admission number and creates a historical re-admission event`:
1. **Initial Registration:** Student "Priya Mohanty" admitted to Class 1, Session 2026-2027.
   - Allocated Admission No: `ADM-2026-0003`.
   - Initial Timeline: `[ { type: "NEW_ADMISSION" } ]`.
2. **Re-admission Submission:** Re-admission batch submitted for Session 2027-2028 into Class 2 with `existingAdmissionNo = "ADM-2026-0003"`.
3. **Post-Commit Verification:**
   - `updatedStudent.id` matched the original student ID.
   - `updatedStudent.admissionNo` remained strictly `ADM-2026-0003`.
   - `updatedStudent.sectionRef.class.name` transitioned to `Class 2`.
   - `updatedStudent.timelines` recorded 2 events: `NEW_ADMISSION` followed by `READMISSION`.
   - Full past academic history preserved.

