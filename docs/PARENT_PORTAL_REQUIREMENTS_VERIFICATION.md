# SSVM ERP Platform — Parent Web Portal Requirements Verification
**Document Version:** 1.0.0  
**Status:** Complete & Verified  
**Component:** Parent Web Portal (`parent-portal`), Child Scoping & Dynamic Entitlements

---

## 1. Executive Summary

The Parent Web Portal provides guardians with a centralized interface for monitoring their children's academic lifecycle, fee settlements, attendance, and school bus transit.

This report confirms the implementation of:
- All 24 permanent parent features.
- Optional module rendering based on school entitlements and child assignment.
- Clear separation between **Scenario 1** (School does not subscribe to Transport) and **Scenario 2** (School subscribes to Transport, but the child is unassigned).
- Multi-child switching with strict child-level data isolation.

---

## 2. Permanent Parent Features Matrix

| Feature # | Feature Name | Portal Route | Backend Endpoint | Authorization & Scoping | Status |
|:---:|:---|:---|:---|:---|:---:|
| **1** | **Home Dashboard** | `/` | `/api/v1/students/me` | Scoped to parent's active child | **VERIFIED** |
| **2** | **My Children Selector** | Header dropdown | `/api/v1/guardians/me/children` | Returns only guardian's linked students | **VERIFIED** |
| **3** | **Multiple-Child Switching**| Global context | Frontend state switch | Instant re-render of child context | **VERIFIED** |
| **4** | **Student Profile** | `/profile` | `/api/v1/students/:childId` | DOB, blood group, roll number, class | **VERIFIED** |
| **5** | **Attendance Calendar** | `/attendance` | `/api/v1/attendance?studentId=:id` | Scoped to selected child | **VERIFIED** |
| **6** | **Daily Timetable** | `/timetable` | `/api/v1/academic/timetable/:classId` | Class schedule for child's section | **VERIFIED** |
| **7** | **Homework & Assignments**| `/assignments`| `/api/v1/assignments?sectionId=:id`| Tasks, due dates, submission status | **VERIFIED** |
| **8** | **Digital Submissions** | `/assignments`| `/api/v1/assignments/:id/submit` | Upload limiter & file MIME check | **VERIFIED** |
| **9** | **Examination Results** | `/results` | `/api/v1/academic/marks?studentId=:id` | Term grades, subject marks, GPA | **VERIFIED** |
| **10**| **Report Cards** | `/results` | `/api/v1/academic/report-card/:id` | Printable official report card | **VERIFIED** |
| **11**| **Fee Billing & Invoices**| `/fees` | `/api/v1/invoices?studentId=:id` | Tuition, term, outstanding balances | **VERIFIED** |
| **12**| **Payment History** | `/fees` | `/api/v1/payments/history?studentId=:id` | Receipt numbers, dates, payment method | **VERIFIED** |
| **13**| **PDF Receipts** | `/fees` | `/api/v1/finance/receipts/:id/pdf` | Branded PDF receipt download | **VERIFIED** |
| **14**| **Circulars & Notices** | `/notices` | `/api/v1/communications/notices` | School-wide announcements | **VERIFIED** |
| **15**| **School Announcements** | `/notices` | `/api/v1/communications/announcements`| Urgent alerts and holiday circulars | **VERIFIED** |
| **16**| **Teacher Messaging** | `/messages` | `/api/v1/messages/teacher` | Communication with class teacher | **VERIFIED** |
| **17**| **School Communication** | `/notices` | `/api/v1/communications` | Administrative correspondence | **VERIFIED** |
| **18**| **Academic Calendar** | `/calendar` | `/api/v1/academic/calendar` | Holidays, exam dates, events | **VERIFIED** |
| **19**| **Student Documents** | `/documents` | `/api/v1/documents?studentId=:id` | Birth cert, transfer cert, medical | **VERIFIED** |
| **20**| **Leave Applications** | `/attendance` | `/api/v1/attendance/leave` | Submit student sick/casual leave | **VERIFIED** |
| **21**| **Helpdesk & Support** | `/support` | `/api/v1/ancillary/helpdesk/tickets` | IT, billing, and maintenance tickets | **VERIFIED** |
| **22**| **Notification Settings**| `/settings` | `/api/v1/preferences/notifications` | Toggle email/SMS/push preferences | **VERIFIED** |
| **23**| **Account Profile** | `/settings` | `/api/v1/users/me` | Contact number and address update | **VERIFIED** |
| **24**| **Session & Security** | `/settings` | `/api/v1/2fa/status` | Password reset, active sessions | **VERIFIED** |

---

## 3. Optional Module Rendering & Transport Absence Behavior

### Optional Module Rules
Optional navigation tabs render only when **both** conditions are satisfied:
1. The school has subscribed to the module in the Central Module Registry.
2. The selected child has an active allocation for that service.

### Transport Absence Verification

#### Scenario 1: School Does Not Have Transport Subscribed
- **Navigation:** The "Transport & Bus" link is completely omitted from the sidebar.
- **Direct Route Access (`/transport`):** If a parent enters the URL directly, the page checks `/api/v1/schools/me/modules` and renders:
  > *"Transport Service Not Subscribed: Your school has not enabled the Transport & Fleet GPS module. Please contact the school administrative office for transport inquiries."*
- **Backend Guard:** Direct calls to `/api/v1/transport/allocations` fail with HTTP 403 `MODULE_DISABLED`.
- **Other Features:** All academic, fee, and notice features continue working without disruption.

#### Scenario 2: School Subscribes to Transport, but Child is Not Assigned
- **Navigation:** The "Transport & Bus" link is visible in the sidebar.
- **Page Content:** The page queries allocations for the selected child. If empty, it renders:
  > *"No Active Transport Allocation: No active school bus allocation is currently mapped to your registered student profile. Contact the school transport desk to request bus allocation."*
- **Data Protection:** No unrelated vehicles, routes, or other students' stops are exposed.

---

## 4. Parent Multi-Child Security & Scoping

1. **Sibling Switching:**
   - The top header provides an instant sibling switcher dropdown for parents with 2+ enrolled children.
   - Changing the child updates `activeChildId` in application state.
2. **Strict Child Scoping:**
   - Every API call (`/invoices`, `/attendance`, `/results`, `/transport/allocations`) explicitly passes `studentId = activeChildId`.
   - The backend validates that `activeChildId` is legally linked to the calling guardian (`guardian.students.some(s => s.id === studentId)`).
   - If a parent attempts to manipulate query parameters to supply a student ID belonging to another family, the backend returns HTTP 403 Forbidden.

