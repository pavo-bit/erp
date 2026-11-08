# SSVM ERP Platform — Seven-Portal Integration & UX Verification Report
**Document Version:** 1.0.0  
**Status:** Verified  
**Component:** Next.js Portals, Responsive UI, Session Handling & API Binding

---

## 1. Overview of Portal Architecture

The ERP frontend is partitioned into seven specialized Next.js web applications, each tailored to distinct user personas and security contexts:

1. **Super Admin Portal (`super-admin`):** Global SaaS control plane.
2. **ERP Admin Portal (`erp-admin`):** School administration, bursar operations, HR, fleet, and academics.
3. **Teacher Portal (`teacher-portal`):** Daily academic workflows, attendance marking, grading.
4. **Parent Portal (`parent-portal`):** Guardian child monitoring, fee payments, live transport tracking.
5. **Student Portal (`student-portal`):** Homework, grades, class timetable, profile.
6. **Payment Portal (`payment-portal`):** Hosted payment checkout and receipt rendering.
7. **SaaS Marketing Portal (`saas-frontend`):** Public marketing landing page, tier pricing, registration requests.

---

## 2. Portal-by-Portal Integration Status

### 1. Super Admin Portal (`super-admin`)
- **Key Routes:** `/schools`, `/subscriptions`, `/billing`, `/metrics`, `/settings`.
- **Modular SaaS Management:** Integrates with `/api/v1/saas/modules/registry` and `/api/v1/saas/schools/:id/modules` to enable/disable school feature bundles.
- **Security:** Guarded by `Role.SUPER_ADMIN` token and IP allowlisting.
- **Integration Status:** **Complete & Verified**.

### 2. ERP Admin Portal (`erp-admin`)
- **Key Routes:** `/finance/fee-collection/record-payment`, `/academics/classes`, `/students`, `/transport/vehicles`, `/library/books`, `/hr/payroll`.
- **Cash Fee Collection UI:** Dedicated bursar counter form with student search, multi-invoice selection, cash receipt generation, and PDF printing.
- **Fleet Monitoring:** Live vehicle map view with moving GPS markers.
- **Integration Status:** **Complete & Verified**.

### 3. Parent Portal (`parent-portal`)
- **Key Routes:** `/`, `/attendance`, `/fees`, `/results`, `/transport`, `/notices`.
- **Dynamic Modular Navigation:** Side navigation queries `/api/v1/schools/me/modules` and suppresses the `/transport` tab if the school has not enabled `TRANSPORT`.
- **Live Bus Tracking:** Real-time polling (`refreshInterval: 5000`) of `/api/v1/transport/vehicles/:id/location` showing bus coordinates, speed, and active trip status.
- **Integration Status:** **Complete & Verified**.

### 4. Teacher Portal (`teacher-portal`)
- **Key Routes:** `/attendance`, `/grades`, `/assignments`, `/timetable`.
- **Attendance Marking:** Bulk class attendance grid with `PRESENT`, `ABSENT`, `LATE` toggles and instant submission.
- **Integration Status:** **Complete & Verified**.

### 5. Student Portal (`student-portal`)
- **Key Routes:** `/`, `/timetable`, `/assignments`, `/fees`, `/profile`.
- **Child Scoping:** Strict tenant and student scoping preventing viewing any sibling or peer records.
- **Integration Status:** **Complete & Verified**.

### 6. Payment Portal (`payment-portal`)
- **Key Routes:** `/checkout/:invoiceId`, `/receipt/:receiptId`.
- **Features:** Order creation, simulated checkout, instant receipt rendering.
- **Integration Status:** **Complete & Verified**.

### 7. SaaS Marketing Frontend (`saas-frontend`)
- **Key Routes:** `/`, `/pricing`, `/features`, `/register`.
- **Registration Pipeline:** Integrated with Cloudflare Turnstile bot detection and spam heuristics, submitting to `/api/v1/saas/request`.
- **Integration Status:** **Complete & Verified**.

---

## 3. Scope Note on Parent Mobile App

> [!NOTE]
> As established in project specifications, a standalone native Android APK is explicitly out of scope for the current local-first milestone. The Parent Web Portal provides a responsive mobile-friendly interface designed for smartphone web browsers.

