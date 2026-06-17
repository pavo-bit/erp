# SSVM College Square — Full Platform Documentation

> **Note**: This document was last reconciled against source code on June 17, 2026. Any future discrepancy should be resolved in favor of the code, and this note updated.
> **Version**: 3.2.0 | **Last Updated**: June 17, 2026  
> **Base URL**: `http://localhost:5000` (Backend API)  
> **Stack**: Node.js / Express / Prisma / PostgreSQL / Next.js

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Database Schema (ERD)](#3-database-schema-erd)
4. [Backend API Reference](#4-backend-api-reference)
5. [Frontend Application Structure](#5-frontend-application-structure)
6. [Environment Configuration](#6-environment-configuration)

---

## 1. System Architecture

```mermaid
graph TB
    subgraph "Docker Compose Network"
        DB["PostgreSQL 16<br/>:5432"]
        API["Express Backend<br/>:5000"]
        ERP["ERP Admin Dashboard<br/>Next.js :3000"]
        SA["Super Admin Portal<br/>Next.js :3001"]
        TP["Teacher Portal<br/>Next.js :3002"]
        PP["Parent Portal<br/>Next.js :3006"]
        PAY["Payment Portal<br/>Next.js :3007"]
        SAAS["SaaS Landing Page<br/>Next.js :3008"]
        GF["Grafana Analytics<br/>:3004"]
    end

    DB --> API
    API --> ERP
    API --> SA
    API --> TP
    API --> PP
    API --> PAY
    API --> SAAS
    API --> REDIS["Redis<br/>:6379"]
    API --> SENTRY["Sentry (External)"]
    DB --> GF

    style DB fill:#336791,color:#fff
    style API fill:#68A063,color:#fff
    style ERP fill:#FF6B00,color:#fff
    style SA fill:#8B5CF6,color:#fff
    style TP fill:#3B82F6,color:#fff
    style PP fill:#10B981,color:#fff
    style PAY fill:#EF4444,color:#fff
    style SAAS fill:#D49A2A,color:#fff
    style GF fill:#F46800,color:#fff
```

### Service Map

| Service | Container | Port | Technology | Purpose |
|---|---|---|---|---|
| **Database** | `ssvm-database` | `5432` | PostgreSQL 16 Alpine | Primary data store |
| **Backend API** | `ssvm-backend` | `5000` | Express + Prisma + TypeScript | REST API server |
| **ERP Admin** | `ssvm-erp-admin` | `3000` | Next.js 16 | School admin dashboard |
| **Super Admin** | `ssvm-super-admin` | `3001` | Next.js 16 | Platform-wide management |
| **Teacher Portal** | `ssvm-teacher-portal` | `3002` | Next.js 16 | Teacher-facing portal |
| **Parent Portal** | `ssvm-parent-portal` | `3006` | Next.js 16 | Parent and student dashboard |
| **Payment Portal** | `ssvm-payment-portal` | `3007` | Next.js 16 | Dedicated student fee payment portal |
| **SaaS Landing** | `ssvm-saas-frontend` | `3008` | Next.js 16 | Public Greyscales registration & marketing |
| **Grafana** | `ssvm-grafana` | `3004` | Grafana Enterprise | Analytics & monitoring |
| **Redis Cache** | `ssvm-redis` | `6379` | Redis 7 Alpine | Rate limits, Caching, BullMQ |
| **Sentry** | `External` | `-` | @sentry/node | Error tracking & profiling |

### Backend Directory Structure

```
ssvm-backend/
├── prisma/
│   ├── schema.prisma          # 202 models, 15 enums, ~3800 lines
│   └── migrations/
│       └── 20260612100205_add_phase_10a_features/
├── src/
│   ├── index.ts               # Express app entry point (30 route mounts)
│   ├── config/
│   │   └── env.ts             # Environment validation
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── logger.ts          # Pino logger
│   ├── middleware/
│   │   ├── auth.ts            # JWT + RBAC middleware
│   │   ├── errorHandler.ts    # Global error handler
│   │   ├── tenant.ts          # Multi-tenant school scoping
│   │   └── validate.ts        # Zod schema validation
│   ├── validators/
│   │   └── schemas.ts         # Zod validation schemas
│   └── routes/                # 55 route files
│       ├── auth.ts            # Authentication & login
│       ├── users.ts           # User management (CRUD, role assign, password reset)
│       ├── schools.ts         # School CRUD + setup
│       ├── branches.ts        # Branch management
│       ├── academic.ts        # Sessions, Classes, Sections, ClassTeachers
│       ├── students.ts        # Student CRUD
│       ├── teachers.ts        # Teacher CRUD
│       ├── invoices.ts        # Invoice CRUD + payment recording
│       ├── finance.ts         # Defaulters, monthly fee generation
│       ├── payments.ts        # Razorpay integration + late fines
│       ├── exams.ts           # Exam CRUD, marks entry, report cards
│       ├── attendance.ts      # Student attendance
│       ├── assignments.ts     # Assignments, submissions, grading, study materials
│       ├── admissions.ts      # Application pipeline
│       ├── hr.ts              # Salaries, payslips, leaves
│       ├── timetable.ts       # Timetable & slot management
│       ├── notices.ts         # Notice board CRUD
│       ├── events.ts          # Event CRUD
│       ├── notifications.ts   # SMS/Email/WhatsApp + templates
│       ├── communications.ts  # Communication templates + send + logs
│       ├── gallery.ts         # Image upload & gallery
│       ├── alumni.ts          # Alumni profiles & contributions
│       ├── cms.ts             # Testimonials, site content, analytics
│       ├── stats.ts           # Dashboard stats (public, detailed, activity feed)
│       ├── reports.ts         # PDF receipts, report cards, attendance export
│       ├── subscriptions.ts   # SaaS plan management + payments
│       ├── search.ts          # Global cross-entity search
│       ├── bulk.ts            # CSV bulk import with validation pipeline
│       ├── activity.ts        # Activity log feed
│       ├── webhooks.ts        # Outbound webhooks and Razorpay webhook listener
│       └── saas.ts            # SaaS registration & approval logic
├── Dockerfile
└── entrypoint.sh
```

---

## 2. Authentication & Authorization

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth API
    participant D as Database
    C->>A: POST /api/auth/login {email, password}
    A->>D: Find user by email
    D-->>A: User record
    A->>A: bcrypt.compare(password, hash)
    A-->>C: JWT token + Set-Cookie (httpOnly)
```

### Login Types

| Login Type | Endpoint | Credentials |
|---|---|---|
| **Staff/Admin** | `POST /api/auth/login` | email + password |
| **Student** | `POST /api/auth/student/login` | admissionNo + password |
| **Alumni** | `POST /api/auth/alumni/register` | Self-registration (public) |

### JWT Payload

```json
{
  "id": "cuid_user_id",
  "email": "admin@ssvm.edu.in",
  "role": "ERP_ADMIN",
  "name": "Admin User",
  "schoolId": "cuid_string"
}
```

### Role-Based Access Control (RBAC) Matrix

| Role | Scope | Permissions |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide | Full access to all schools, users, and configurations |
| `ERP_ADMIN` | Single school | Manage students, teachers, fees, exams, notices within their school |
| `WEBSITE_ADMIN` | Single school | Manage CMS, gallery, testimonials, notices, events |
| `TEACHER` | Own school | View students, mark attendance, manage results, view timetable |
| `ACCOUNTANT` | Single school | Fee management and financial reports |
| `HR` | Single school | Salary and leave management |
| `LIBRARIAN` | Single school | Library management (future module) |
| `RECEPTIONIST` | Single school | Front-desk operations |
| `ASSET_MANAGER` | Single school | Inventory management, asset tracking, stock monitoring, procurement |
| `PARENT` | Own children | View own children's attendance, results, fees |
| `ALUMNI` | Self | View/update own alumni profile |
| `STUDENT` | Self | View own results, attendance, assignments |

### Middleware Stack

| Middleware | Function | Description |
|---|---|---|
| `authenticate` | Required auth | Verifies JWT, attaches `req.user` |
| `optionalAuth` | Optional auth | Attaches user if token present, continues otherwise |
| `requireRole(...roles)` | Role guard | Restricts to specific roles |
| `requireTeacherOrAdmin()` | Teacher+ | `SUPER_ADMIN`, `ERP_ADMIN`, `TEACHER` |
| `requireFinanceAdmin()` | Finance Domain | `SUPER_ADMIN`, `ERP_ADMIN`, `ACCOUNTANT` |
| `requireContentAdmin()` | Content Domain | `SUPER_ADMIN`, `ERP_ADMIN`, `WEBSITE_ADMIN` |
| `requireHRAdmin()` | HR Domain | `SUPER_ADMIN`, `ERP_ADMIN`, `HR` |
| `requireAcademicAdmin()` | Academic Domain | `SUPER_ADMIN`, `ERP_ADMIN` |
| `requireLibraryAdmin()` | Library Domain | `SUPER_ADMIN`, `ERP_ADMIN`, `LIBRARIAN` |
| `requireAdmissionsAdmin()` | Admissions Domain | `SUPER_ADMIN`, `ERP_ADMIN`, `RECEPTIONIST` |
| `requireCommunicationsAdmin()` | Comm Domain | `SUPER_ADMIN`, `ERP_ADMIN`, `RECEPTIONIST`, `HR` |
| `requireOperationsAdmin()` | Operations Domain | `SUPER_ADMIN`, `ERP_ADMIN` |
| `requireSuperAdmin()` | Platform admin | `SUPER_ADMIN` only |
| `requireSchoolAccess()` | Tenant guard | Ensures users can only access their own school's data |
| `schoolContextMiddleware` | Tenant Isolation | Injects `app.current_school_id` into Prisma via AsyncLocalStorage |
| `bruteForceCheck` | Rate Limiting | Progressive delay (up to 1hr lockout) for failed auth attempts |
| `securityHeaders` | WAF/Sec Headers | Hardens response headers (HSTS, NoSniff, Frame-Options) |
| `rejectClosedPeriod` | Financial Guard | Blocks mutations on records within a CLOSED financial period |
| `metricsMiddleware` | SLO/SLI | Tracks request duration, active connections, and per-tenant usage |

---

## 3. Database Schema (ERD)

### Core Entity Relationship Diagram

```mermaid
erDiagram
    School ||--o{ Branch : has
    School ||--o| Subscription : has
    School ||--o{ AcademicSession : has
    School ||--o{ Department : has
    School ||--o{ Class : has
    School ||--o{ Student : has
    School ||--o{ Teacher : has
    School ||--o{ Subject : has
    School ||--o{ Invoice : has
    School ||--o{ FeeCategory : has
    School ||--o{ FeeStructure : has
    School ||--o{ FineRule : has
    School ||--o{ Exam : has
    School ||--o{ Timetable : has
    School ||--o{ Admission : has
    School ||--o{ Notice : has
    School ||--o{ Event : has
    School ||--o{ Notification : has
    School ||--o{ Salary : has
    School ||--o{ Attendance : has
    School ||--o{ Assignment : has
    School ||--o{ AuditLog : has
    School ||--o{ ActivityLog : has
    School ||--o{ TeacherSubjectAssignment : has
    School ||--o{ NotificationTemplate : has
    School ||--o{ Scholarship : has
    School ||--o| OnboardingProgress : has

    AcademicSession ||--o{ Class : contains
    Class ||--o{ Section : contains
    Section ||--o{ Student : enrolls
    Section ||--o{ Timetable : has
    Section ||--o{ Attendance : tracks
    Section ||--o{ ClassTeacher : assigned
    Section ||--o{ TeacherSubjectAssignment : maps

    User ||--o| Teacher : is
    User ||--o| Alumni : is
    User ||--o| Guardian : is
    User ||--o{ Notice : authors
    User ||--o{ Event : creates
    User ||--o{ AuditLog : generates

    Department ||--o{ Teacher : contains

    Teacher ||--o{ TeacherAttendance : has
    Teacher ||--o{ LeaveRequest : submits
    Teacher ||--o{ Salary : receives
    Teacher ||--o{ Attendance : marks
    Teacher ||--o{ ClassTeacher : assigned
    Teacher ||--o{ TeacherSubjectAssignment : maps
    Teacher ||--o{ Assignment : creates

    Guardian ||--o{ Student : parents
    Student ||--o{ Attendance : has
    Student ||--o{ StudentMark : receives
    Student ||--o{ Invoice : has
    Student ||--o{ AssignmentSubmission : submits
    Student ||--o{ StudentTimeline : has
    Student ||--o{ Scholarship : receives

    Subject ||--o{ ClassSubject : linked
    Subject ||--o{ TeacherSubject : linked
    Subject ||--o{ ExamSubject : tested
    Subject ||--o{ TeacherSubjectAssignment : assigned

    TeacherSubjectAssignment ||--o{ TimetableSlot : scheduled

    Exam ||--o{ ExamSubject : contains
    ExamSubject ||--o{ StudentMark : records

    Timetable ||--o{ TimetableSlot : contains

    Invoice ||--o{ PaymentTransaction : has
    FeeCategory ||--o{ FeeStructure : defines

    Assignment ||--o{ AssignmentSubmission : receives
    Assignment ||--o{ AssignmentAttachment : has

    Admission ||--o{ AdmissionLog : tracks
    Alumni ||--o{ Contribution : makes

    Subscription ||--o{ SubscriptionPayment : has
```

### Enums (15 Enums)

| Enum | Values |
|---|---|
| `Role` | `SUPER_ADMIN`, `ERP_ADMIN`, `WEBSITE_ADMIN`, `TEACHER`, `ACCOUNTANT`, `HR`, `LIBRARIAN`, `RECEPTIONIST`, `ASSET_MANAGER`, `PARENT`, `ALUMNI`, `STUDENT` |
| `DocumentOwnerType` | `STUDENT`, `TEACHER`, `ADMISSION`, `STAFF`, `SCHOOL` |
| `DocumentCategory` | `AADHAAR`, `BIRTH_CERTIFICATE`, `MARKSHEET`, `TC`, `ADMISSION_FORM`, `PASSPORT`, `OTHER` |
| `ActivityType` | `ADMISSION`, `PAYMENT`, `RESULT`, `ATTENDANCE`, `TEACHER`, `NOTICE` |
| `NoticeStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `EventStatus` | `PLANNING`, `UPCOMING`, `COMPLETED`, `CANCELLED` |
| `InvoiceStatus` | `PAID`, `PENDING`, `OVERDUE`, `PARTIAL`, `UNPAID` |
| `FeeType` | `ADMISSION`, `READMISSION`, `MONTHLY`, `EXAM`, `TRANSPORT`, `HOSTEL`, `MISCELLANEOUS` |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `LATE`, `HOLIDAY` |
| `AssignmentStatus` | `PENDING`, `SUBMITTED`, `GRADED`, `LATE_SUBMITTED` |
| `LeaveStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `AdmissionStatus` | `PENDING`, `UNDER_REVIEW`, `DOCUMENTS_VERIFIED`, `INTERVIEW`, `APPROVED`, `REJECTED`, `ENROLLED` |
| `NotificationType` | `SMS`, `EMAIL`, `WHATSAPP` |
| `NotificationStatus` | `QUEUED`, `SENT`, `FAILED` |
| `SalaryStatus` | `PENDING`, `PAID`, `HOLD` |

### Model Summary (202 Models)

| # | Model | Table | Key Fields | Relations |
|---|---|---|---|---|
| 1 | `School` | `schools` | id, name, code, status | → SchoolStatus, TenantState |
| 2 | `Branch` | `branches` | id, schoolId, name | → School |
| 3 | `Subscription` | `subscriptions` | id, schoolId, status | → SubscriptionPlanConfig, School |
| 4 | `SubscriptionPlanConfig` | `subscription_plan_configs` | id, name | - |
| 5 | `SubscriptionPayment` | `subscription_payments` | id, schoolId | → School, Subscription |
| 6 | `Permission` | `permissions` | id, name | - |
| 7 | `RolePermission` | `role_permissions` | id | → Role, Permission |
| 8 | `User` | `users` | id, email, name, schoolId | → Role |
| 9 | `RefreshToken` | `refresh_tokens` | id, token | → User |
| 10 | `OTP` | `otps` | id | - |
| 11 | `AcademicSession` | `academic_sessions` | id, schoolId, name | → School |
| 12 | `Class` | `classes` | id, schoolId, name | → School, AcademicSession |
| 13 | `Section` | `sections` | id, name | → Class |
| 14 | `ClassTeacher` | `class_teachers` | id | → Section, Teacher |
| 15 | `Department` | `departments` | id, schoolId, name | → School |
| 16 | `Teacher` | `teachers` | id, userId, schoolId | → School, User |
| 17 | `Guardian` | `guardians` | id, userId, schoolId | - |
| 18 | `Student` | `students` | id, schoolId, admissionNo, name, userId | → School |
| 19 | `StudentTimeline` | `student_timeline` | id, title, type | → Student |
| 20 | `Alumni` | `alumni` | id, userId | → User |
| 21 | `Attendance` | `attendance` | id, schoolId, status | → AttendanceStatus, School, Student |
| 22 | `TeacherAttendance` | `teacher_attendance` | id, status | → AttendanceStatus, Teacher |
| 23 | `LeaveRequest` | `leave_requests` | id, status | → LeaveStatus, Teacher |
| 24 | `Subject` | `subjects` | id, schoolId, name | → School |
| 25 | `ClassSubject` | `class_subjects` | id | → Class, Subject |
| 26 | `TeacherSubject` | `teacher_subjects` | id | → Subject, Teacher |
| 27 | `Timetable` | `timetables` | id, schoolId | → School, Section |
| 28 | `TimetableSlot` | `timetable_slots` | id | → TeacherSubjectAssignment, Timetable |
| 29 | `Exam` | `exams` | id, schoolId, name | → Class, School |
| 30 | `ExamSubject` | `exam_subjects` | id | → Exam, Subject |
| 31 | `StudentMark` | `student_marks` | id | → ExamSubject, Student |
| 32 | `Notice` | `notices` | id, schoolId, title, status | → NoticeStatus, User |
| 33 | `Event` | `events` | id, schoolId, title, status | → EventStatus, User |
| 34 | `FeeCategory` | `fee_categories` | id, schoolId, name | → School |
| 35 | `FeeStructure` | `fee_structures` | id, schoolId | → FeeCategory, School |
| 36 | `FineRule` | `fine_rules` | id, schoolId | → School |
| 37 | `Invoice` | `invoices` | id, schoolId, type, status | → FeeType, InvoiceStatus, School |
| 38 | `Assignment` | `assignments` | id, schoolId, title | → School, Subject |
| 39 | `AssignmentAttachment` | `assignment_attachments` | id | → Assignment |
| 40 | `AssignmentSubmission` | `assignment_submissions` | id, status | → AssignmentStatus, Assignment, Student |
| 41 | `StudyMaterial` | `study_materials` | id, schoolId, title | → School |
| 42 | `Admission` | `admissions` | id, schoolId, status | → AdmissionStatus, School |
| 43 | `AdmissionLog` | `admission_logs` | id, status | → AdmissionStatus, Admission |
| 44 | `Salary` | `salaries` | id, schoolId, status | → SalaryStatus, School, Teacher |
| 45 | `Notification` | `notifications` | id, schoolId, type, status | → NotificationType, NotificationStatus |
| 46 | `NotificationDelivery` | `notification_deliveries` | id, schoolId, status | → NotificationChannel, NotificationStatus, Notification |
| 47 | `MessageTemplate` | `message_templates` | id, schoolId, name | → NotificationType |
| 48 | `GalleryImage` | `gallery_images` | id, schoolId, title | - |
| 49 | `Contribution` | `contributions` | id | → Alumni |
| 50 | `SiteContent` | `site_content` | id, schoolId, type | - |
| 51 | `Testimonial` | `testimonials` | id, schoolId, name | - |
| 52 | `PaymentTransaction` | `payment_transactions` | id, transactionId, status, schoolId, gatewayPaymentId | → Invoice |
| 53 | `RazorpayReconciliation` | `razorpay_reconciliations` | id, schoolId, settlementId, status | → ReconciliationStatus, School |
| 54 | `IdempotencyRecord` | `idempotency_records` | id, key, status | - |
| 55 | `ReportTemplate` | `report_templates` | id, schoolId, name, type | → School |
| 56 | `DocumentRepository` | `document_repository` | id, schoolId, name | → School |
| 57 | `CommunicationTemplate` | `communication_templates` | id, schoolId, name | → School |
| 58 | `CommunicationLog` | `communication_logs` | id, schoolId, type, status | → School |
| 59 | `AuditLog` | `audit_logs` | id, schoolId | - |
| 60 | `TeacherSubjectAssignment` | `teacher_subject_assignments` | id, schoolId | → AcademicSession, School, Section |
| 61 | `OnboardingProgress` | `onboarding_progress` | id, schoolId | → School |
| 62 | `Document` | `documents` | id, schoolId, title | → DocumentOwnerType, DocumentCategory, School |
| 63 | `ActivityLog` | `activity_logs` | id, schoolId, type, title | → ActivityType, School |
| 64 | `Scholarship` | `scholarships` | id, schoolId, name, status | → ScholarshipStatus, School, Student |
| 65 | `NotificationTemplate` | `notification_templates` | id, schoolId, name, type | → NotificationType, School |
| 66 | `Book` | `books` | id, schoolId, title | → School |
| 67 | `BookIssue` | `book_issues` | id, schoolId, status | → Book, School |
| 68 | `SystemBackup` | `system_backups` | id, type, status | - |
| 69 | `BulkJob` | `bulk_jobs` | id, schoolId, type, status | → School |
| 70 | `Template` | `unified_templates` | id, schoolId, name | → School |
| 71 | `UserSession` | `user_sessions` | id, sessionId | → User |
| 72 | `AdmissionEnquiry` | `admission_enquiries` | id, schoolId, status | → School |
| 73 | `PipelineStage` | `PipelineStage` | id, schoolId, name | - |
| 74 | `LeadInteraction` | `LeadInteraction` | id, type | → AdmissionEnquiry |
| 75 | `MarketingCampaign` | `MarketingCampaign` | id, schoolId, name | - |
| 76 | `VisitorLog` | `visitor_logs` | id, schoolId | → School |
| 77 | `ReceptionComplaint` | `reception_complaints` | id, schoolId, name, status | → ComplaintStatus, School |
| 78 | `ReceptionCallLog` | `reception_call_logs` | id, schoolId | → School |
| 79 | `WebhookEndpoint` | `webhook_endpoints` | id, schoolId | - |
| 80 | `ScheduledJob` | `scheduled_jobs` | id, name, status | - |
| 81 | `SupportTicket` | `support_tickets` | id, schoolId, status | → School, User |
| 82 | `SupportMessage` | `support_messages` | id | → User, SupportTicket |
| 83 | `CertificateTemplate` | `certificate_templates` | id, schoolId, name | → School |
| 84 | `IssuedCertificate` | `issued_certificates` | id, qrHash, status | → User, Student, CertificateTemplate |
| 85 | `MessageThread` | `message_threads` | id, schoolId | → School |
| 86 | `MessageParticipant` | `message_participants` | id | → MessageThread, User |
| 87 | `Message` | `messages` | id | → User, MessageThread |
| 88 | `MessageAttachment` | `message_attachments` | id | → Message |
| 89 | `UserDevice` | `user_devices` | id, deviceToken | → User |
| 90 | `AppVersion` | `app_versions` | id, platform | - |
| 91 | `TransportVehicle` | `transport_vehicles` | id, schoolId, registrationNumber, status | → School |
| 92 | `TransportRoute` | `transport_routes` | id, schoolId, name | → School |
| 93 | `TransportStop` | `transport_stops` | id, name | → TransportRoute |
| 94 | `TransportAllocation` | `transport_allocations` | id, schoolId, status | → School, TransportStop, Student |
| 95 | `DataClassification` | `data_classifications` | id, schoolId | → School |
| 96 | `UserConsent` | `user_consents` | id, schoolId | → School, User |
| 97 | `FinancialPeriod` | `financial_periods` | id, schoolId, name, status | → School |
| 98 | `ArchiveJobLog` | `archive_job_logs` | id, schoolId, status | → School |
| 99 | `HostelRoom` | `hostel_rooms` | id, schoolId, status | → School |
| 100 | `HostelAllocation` | `hostel_allocations` | id, schoolId, status | → HostelRoom, School, Student |
| 101 | `HelpdeskTicket` | `helpdesk_tickets` | id, schoolId, title, status | → User, School |
| 102 | `MessageReadReceipt` | `message_read_receipts` | id | → Message |
| 103 | `FeatureFlag` | `feature_flags` | id, code, name | - |
| 104 | `SchoolFeature` | `school_features` | id, schoolId | → FeatureFlag, School |
| 105 | `SchoolSettings` | `school_settings` | id, schoolId | → School |
| 106 | `BrandSettings` | `brand_settings` | id, schoolId, customDomain | → School |
| 107 | `SchoolRegistrationRequest` | `school_registration_requests` | id, email, status | - |
| 108 | `StorageObject` | `storage_objects` | id, key, schoolId | → School, User |
| 109 | `AssetCategory` | `asset_categories` | id, schoolId, name | → School |
| 110 | `Vendor` | `vendors` | id, schoolId, name | → School |
| 111 | `Asset` | `assets` | id, schoolId, name, status | → AssetCondition, AssetCategory, School |
| 112 | `AssetAssignment` | `asset_assignments` | id | → Asset, User, User |
| 113 | `AssetTransfer` | `asset_transfers` | id | → Asset, User |
| 114 | `AssetDepreciation` | `asset_depreciations` | id | → Asset |
| 115 | `MaintenanceRecord` | `maintenance_records` | id, type, status | → Asset |
| 116 | `PurchaseOrder` | `purchase_orders` | id, schoolId, poNumber, status | → User, School, Vendor |
| 117 | `PurchaseOrderItem` | `purchase_order_items` | id, status | → PurchaseOrder |
| 118 | `FailedJob` | `failed_jobs` | id, status | - |
| 119 | `SystemLog` | `system_logs` | id, schoolId | - |
| 120 | `Contract` | `contracts` | id, schoolId, status | → School |
| 121 | `UsageMetric` | `usage_metrics` | id, schoolId | → BigInt, School |
| 122 | `CustomDomain` | `custom_domains` | id, schoolId, domain, status | → School |
| 123 | `ConsentRecord` | `consent_records` | id, schoolId, type | → Guardian, School |
| 124 | `NotificationPreference` | `notification_preferences` | id, type | → User |
| 125 | `SchoolSettingsHistory` | `school_settings_history` | id, schoolId | → User, School |
| 126 | `SchoolArchive` | `school_archives` | id, schoolId, status | → User, School |
| 127 | `LegalHold` | `legal_holds` | id, schoolId, status | → User, School |
| 128 | `AccountingPeriod` | `AccountingPeriod` | id, schoolId, name, status | → AccountingPeriodStatus, FiscalYear, School |
| 129 | `BankReconciliation` | `BankReconciliation` | id, schoolId | → Decimal, Decimal, LedgerAccount |
| 130 | `Budget` | `Budget` | id, schoolId, name | → School |
| 131 | `BudgetLine` | `BudgetLine` | id | → Decimal, LedgerAccount, Budget |
| 132 | `ConsolidationJournal` | `ConsolidationJournal` | id | → SchoolGroup |
| 133 | `Currency` | `Currency` | code, name | - |
| 134 | `DailyRevenueProjection` | `DailyRevenueProjection` | id, schoolId | → School |
| 135 | `DeferredRevenueSchedule` | `DeferredRevenueSchedule` | id, schoolId, invoiceId, status | → Invoice, School |
| 136 | `DocumentVersion` | `DocumentVersion` | id | → DocumentRepository |
| 137 | `DomainEvent` | `DomainEvent` | id, schoolId | → SystemDomainEventType |
| 138 | `FederatedUser` | `FederatedUser` | id | → IdentityProvider, User |
| 139 | `FinancialApprovalPolicy` | `FinancialApprovalPolicy` | id, schoolId | → Decimal, Decimal, School |
| 140 | `FinancialAudit` | `FinancialAudit` | id, schoolId | → FinancialEntityType, FinancialAuditAction, School |
| 141 | `FinancialClose` | `FinancialClose` | id, schoolId | → AccountingPeriod, School |
| 142 | `FinancialDimension` | `FinancialDimension` | id, schoolId, name | → School |
| 143 | `FinancialDimensionValue` | `FinancialDimensionValue` | id | → FinancialDimension |
| 144 | `FinancialReportCache` | `FinancialReportCache` | id, schoolId | → School |
| 145 | `FiscalYear` | `FiscalYear` | id, schoolId, name, status | → FiscalYearStatus, School |
| 146 | `IdentityProvider` | `IdentityProvider` | id, name, type | - |
| 147 | `InterCompanyTransaction` | `InterCompanyTransaction` | id, type, status, ledgerTxIdFrom, ledgerTxIdTo | → School, School |
| 148 | `JournalTemplate` | `JournalTemplate` | id, schoolId, name | → School |
| 149 | `JournalTemplateLine` | `JournalTemplateLine` | id | → LedgerAccount, JournalTemplate |
| 150 | `LedgerAccount` | `LedgerAccount` | id, schoolId, name, type | → LedgerCategory, LedgerAccountType, School |
| 151 | `LedgerEntry` | `LedgerEntry` | id | → Decimal, Decimal, LedgerAccount |
| 152 | `LedgerEvent` | `LedgerEvent` | id, schoolId | → LedgerDomainEvent, School |
| 153 | `LedgerIntegrityReport` | `LedgerIntegrityReport` | id, schoolId | → School |
| 154 | `LedgerMerkleRoot` | `LedgerMerkleRoot` | id, schoolId | → School |
| 155 | `LedgerSnapshot` | `LedgerSnapshot` | id, schoolId | → Decimal, LedgerAccount, School |
| 156 | `LedgerTransaction` | `LedgerTransaction` | id, schoolId, status, idempotencyKey | → LedgerReferenceType, LedgerSource, LedgerStatus |
| 157 | `MasterDataRegistry` | `MasterDataRegistry` | id, authoritativeId | - |
| 158 | `MasterRecordAlias` | `MasterRecordAlias` | id | → MasterDataRegistry |
| 159 | `MasterRecordMerge` | `MasterRecordMerge` | id | → MasterDataRegistry |
| 160 | `OutboxMessage` | `OutboxMessage` | id, domainEventId, status | → OutboxStatus, DomainEvent |
| 161 | `PolicyDefinition` | `PolicyDefinition` | id, schoolId, name | → School |
| 162 | `PolicyEvaluationLog` | `PolicyEvaluationLog` | id | → PolicyVersion |
| 163 | `PolicyVersion` | `PolicyVersion` | id | → PolicyDefinition |
| 164 | `PostingRule` | `PostingRule` | id, schoolId | → School |
| 165 | `PostingRuleLine` | `PostingRuleLine` | id | → LedgerAccount, PostingRule |
| 166 | `RevenueRecognitionEntry` | `RevenueRecognitionEntry` | id, ledgerTxId | → DeferredRevenueSchedule |
| 167 | `SSOConfiguration` | `SSOConfiguration` | id, schoolId | → IdentityProvider, School |
| 168 | `SchoolGroup` | `SchoolGroup` | id, name | - |
| 169 | `SequenceCounter` | `SequenceCounter` | id, schoolId | → School |
| 170 | `StudentFinancialProjection` | `StudentFinancialProjection` | id, schoolId, studentId | → School, Student |
| 171 | `WorkflowDefinition` | `WorkflowDefinition` | id, schoolId, name | → School |
| 172 | `WorkflowInstance` | `WorkflowInstance` | id, status | → WorkflowStatus, WorkflowDefinition |
| 173 | `WorkflowNode` | `WorkflowNode` | id, name, type | → WorkflowNodeType, WorkflowDefinition |
| 174 | `WorkflowTask` | `WorkflowTask` | id, status | → TaskStatus, WorkflowInstance, WorkflowNode |
| 175 | `WorkflowTransition` | `WorkflowTransition` | id | → WorkflowNode, WorkflowNode |
| 176 | `auth_events` | `auth_events` | id, schoolId | → AuthEventType |
| 177 | `IntegrationApp` | `IntegrationApp` | id, name, clientId | - |
| 178 | `SchoolIntegration` | `SchoolIntegration` | id, schoolId, status | → School |
| 179 | `WebhookDelivery` | `WebhookDelivery` | id, schoolId, status | → School |
| 180 | `PermissionGroup` | `permission_groups` | id, schoolId, name | - |
| 181 | `UserDelegation` | `user_delegations` | id, schoolId | → User, User, School |
| 182 | `MasterCountry` | `mdm_countries` | id, code, name | - |
| 183 | `MasterState` | `mdm_states` | id, code, name | → MasterCountry |
| 184 | `MasterCity` | `mdm_cities` | id, name | → MasterState |
| 185 | `MasterReligion` | `mdm_religions` | id, name | - |
| 186 | `MasterCategory` | `mdm_categories` | id, name | - |
| 187 | `MasterSubject` | `mdm_subjects` | id, code, name | - |
| 188 | `MasterDepartment` | `mdm_departments` | id, code, name | - |
| 189 | `AccessReview` | `access_reviews` | id, schoolId, status | → AccessReviewStatus, User, School |
| 190 | `IncidentReport` | `incident_reports` | id, schoolId, type, title, status | → User, School, Student |
| 191 | `BackupValidation` | `backup_validations` | id, status | - |
| 192 | `PurchaseRequest` | `PurchaseRequest` | id, schoolId, requestNumber, status | → PRStatus |
| 193 | `PurchaseRequestItem` | `PurchaseRequestItem` | id | → PurchaseRequest |
| 194 | `GoodsReceipt` | `GoodsReceipt` | id, schoolId, grNumber | → PurchaseOrder |
| 195 | `VendorInvoice` | `VendorInvoice` | id, schoolId, status | → Vendor |
| 196 | `InventoryLocation` | `InventoryLocation` | id, schoolId, name | - |
| 197 | `InventoryItem` | `InventoryItem` | id, schoolId, sku, name | - |
| 198 | `InventoryStock` | `InventoryStock` | id, schoolId | → InventoryItem, InventoryLocation |
| 199 | `StockLedger` | `StockLedger` | id, schoolId | → InventoryMovementType |
| 200 | `DataRetentionPolicy` | `DataRetentionPolicy` | id, schoolId | - |
| 201 | `CustomWorkflow` | `CustomWorkflow` | id, schoolId, name | - |
| 202 | `WorkflowStep` | `WorkflowStep` | id | → CustomWorkflow |

---

## Known Gaps

- Frontend hook `useTeacherAttendance` exists but backend route `/api/v1/attendance/teachers` does not — tracked for Phase 2.
- Frontend hook `useResults` exists but backend route `/api/v1/results` does not — tracked for Phase 2.

## 4. Backend API Reference

> **Standard Response Format**:
> ```json
> { "success": true|false, "data": {...}, "error": "message" }
> ```
> 
> **API Versioning (Phase 12A.1)**:
> All API routes will be migrated to the `/api/v1/*` namespace globally. Backwards compatibility for unversioned routes will eventually be deprecated via the `Deprecation` header.

/api/v1/auth/refresh:
    post:
      summary: Refresh Access Token
      description: Issues a new access token using a valid refresh token. Rotates the refresh token and checks for family reuse.
      tags:
        - Authentication
      security:
        - cookieAuth: []
      responses:
        "200":
          description: Token refreshed successfully. New tokens are set as httpOnly cookies.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      message:
                        type: string
                        example: "Token refreshed"
        "401":
          description: Invalid or expired refresh token, or token family reused
  
  /api/v1/auth/logout:
    post:
      summary: Logout
      description: Logs the user out by blocklisting the token (JTI) in Redis and deactivating the session.
      tags:
        - Authentication
      security:
        - cookieAuth: []
      responses:
        "200":
          description: Logged out successfully

  /api/v1/search:
    get:
      summary: Global Full-Text Search
      description: Performs a fast `tsvector` indexed search across multiple entities (Students, Documents, Users) while enforcing RLS based on the user's role and school.
      tags:
        - Search
      security:
        - cookieAuth: []
      parameters:
        - in: query
          name: q
          schema:
            type: string
          required: true
          description: The search query (supports partial matches and lexemes)
      responses:
        "200":
          description: Search results

  /api/v1/payments/webhook:
    post:
      summary: Payment Webhook Receiver
      description: Receives webhook events from Razorpay. Verifies HMAC signatures, replay protections, and ensures payment idempotency.
      tags:
        - Webhooks
      security: []
      parameters:
        - in: header
          name: x-razorpay-signature
          required: true
          schema:
            type: string
          description: HMAC SHA256 Signature for webhook verification
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: Webhook processed successfully or ignored idempotenly

  /api/v1/messages/threads:
    get:
      summary: Get Message Threads
      tags:
        - Messaging
      security:
        - cookieAuth: []
      responses:
        "200":
          description: List of message threads for the current user
    post:
      summary: Start New Thread
      tags:
        - Messaging
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - subject
                - participantIds
              properties:
                subject:
                  type: string
                participantIds:
                  type: array
                  items:
                    type: string
      responses:
        "201":
          description: Thread created successfully

  /api/v1/messages/{threadId}:
    get:
      summary: Get Thread Messages
      tags:
        - Messaging
      security:
        - cookieAuth: []
      parameters:
        - in: path
          name: threadId
          required: true
          schema:
            type: string
      responses:
        "200":
          description: List of messages in the thread
    post:
      summary: Send Message to Thread
      tags:
        - Messaging
      security:
        - cookieAuth: []
      parameters:
        - in: path
          name: threadId
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - content
              properties:
                content:
                  type: string
      responses:
        "201":
          description: Message sent and notifications queued

  /api/v1/messages/{threadId}/read:
    put:
      summary: Mark Thread as Read
      tags:
        - Messaging
      security:
        - cookieAuth: []
      parameters:
        - in: path
          name: threadId
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Thread marked as read.

### 4.1 Auth — `/api/v1/auth`

> [!IMPORTANT]
> Auth endpoints are rate-limited: **10 requests per 15 minutes** per IP.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/login` | ✗ | Authenticate staff/admin user (enforces 5-attempt lockout policy) |
| `POST` | `/student/login` | ✗ | Authenticate student with admissionNo + password |
| `POST` | `/register` | `ADMIN` | Create new user account |
| `POST` | `/alumni/register` | ✗ (public) | Alumni self-registration |
| `POST` | `/refresh` | ✗ | Exchange valid Refresh Token for a new Access Token |
| `GET` | `/me` | ✓ | Get current user profile |
| `POST` | `/logout` | ✗ | Clear auth cookies |

#### `POST /api/auth/login`

```json
// Request
{ "email": "admin@ssvm.edu.in", "password": "password123" }

// Response 200 (Success)
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "role": "ERP_ADMIN", "schoolId": "..." }
  }
}
// Cookies Set: access_token (15m), refresh_token (30d)

// Response 200 (2FA Required)
{
  "success": true,
  "data": {
    "requires2FA": true,
    "pendingToken": "eyJhbGciOi...",
    "message": "Two-Factor Authentication required"
  }
}

// Response 401
{ "success": false, "error": "Invalid credentials" }

// Response 403
{ "success": false, "error": "Account deactivated" }
```

#### `POST /api/auth/refresh`

Rotates access token seamlessly in the background.

---

### 4.2 Two-Factor Authentication (2FA) — `/api/2fa`

> **Access**: Authenticated Users only

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/setup` | ✓ | Generate TOTP secret and QR code for authenticator app |
| `POST` | `/verify-setup` | ✓ | Verify authenticator code and enable 2FA |
| `POST` | `/disable` | ✓ | Disable 2FA using a valid code |
| `POST` | `/validate` | ✗ | Second step of login using `pendingToken` and TOTP code |

---

### 4.3 Server-Sent Events (SSE) — `/api/sse`

Provides real-time push notifications. Clients connect to `/api/sse/stream` to receive events.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/stream` | ✓ | Establish SSE connection (heartbeat every 30s) |

---

### 4.4 Library Management — `/api/library`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/books` | ✓ | List books (searchable by title, category, isbn) |
| `POST` | `/books` | Admin, Librarian | Add new book |
| `PUT` | `/books/:id` | Admin, Librarian | Update book details |
| `DELETE` | `/books/:id` | Admin, Librarian | Soft delete a book (if no active issues) |
| `GET` | `/issues` | ✓ | List book issues (filterable by student, status) |
| `POST` | `/issues/issue` | Admin, Librarian | Issue a book to a student/teacher |
| `POST` | `/issues/return` | Admin, Librarian | Return an issued book, marks returned date (Generates Fine Invoice) |
| `PUT` | `/issues/:id/waive-fine` | Admin, Librarian | Waives a fine and voids associated pending invoice |
| `GET` | `/overdue` | Admin, Librarian | List overdue book issues |

---

### 4.5 Asset Management — `/api/v1/assets`

> **Access**: `ASSET_MANAGER`, `ADMIN`, `SUPER_ADMIN`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✓ | List all assets |
| `POST` | `/` | ✓ | Create a new asset |
| `PUT` | `/:id` | ✓ | Update an asset |
| `DELETE` | `/:id` | ✓ | Soft delete an asset (`deletedAt`) |
| `GET` | `/categories` | ✓ | List asset categories |
| `GET` | `/vendors` | ✓ | List asset vendors |
| `POST` | `/vendors` | ✓ | Create a new vendor |
| `PUT` | `/vendors/:id` | ✓ | Update a vendor |

---

### 4.6 Reception Management — `/api/v1/reception`

> **Access**: `RECEPTIONIST`, `ADMIN`, `SUPER_ADMIN`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/enquiries` | ✓ | List admission enquiries |
| `POST` | `/enquiries` | ✓ | Create new admission enquiry |
| `PUT` | `/enquiries/:id` | ✓ | Update enquiry status and notes |
| `GET` | `/visitors` | ✓ | List visitor logs |
| `POST` | `/visitors` | ✓ | Create a new visitor log |
| `PUT` | `/visitors/:id` | ✓ | Record checkout time for visitor |

---

### 4.7 Health Monitoring — `/api/health`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✗ | Returns system health (Database, Redis, Queue, Storage). Version `3.0.0` |

---

### 4.8 User Management — `/api/users`

> **Access**: `SUPER_ADMIN`, `ERP_ADMIN` only

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ERP Admin+ | List all users (filterable by role, search, pagination) |
| `POST` | `/` | ERP Admin+ | Create a new user with temporary password (must meet complexity rules) |
| `PUT` | `/:id` | ERP Admin+ | Update user details (role, department, employeeId) |
| `PUT` | `/:id/status` | ERP Admin+ | Enable/disable user account |
| `PUT` | `/:id/reset-password` | ERP Admin+ | Reset user password (generates temporary password) |

> [!NOTE]
> User creation generates a temporary password and logs the action to `AuditLog`. The UI displays the generated password for the admin to share with the user.

---

### 4.9 Schools — `/api/schools`

> **Access**: `SUPER_ADMIN` only

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | SUPER_ADMIN | List all schools |
| `GET` | `/:id` | SUPER_ADMIN | Get school details |
| `POST` | `/` | SUPER_ADMIN | Create new school |
| `POST` | `/:id/setup` | SUPER_ADMIN | Initial school setup (sessions, classes, fee categories) |
| `GET` | `/:id/onboarding` | SUPER_ADMIN/ERP_ADMIN | Get school onboarding progress |
| `PUT` | `/:id/onboarding` | SUPER_ADMIN/ERP_ADMIN | Update onboarding progress flags |
| `PUT` | `/:id` | SUPER_ADMIN | Update school |
| `DELETE` | `/:id` | SUPER_ADMIN | Delete school |
| `GET` | `/:id/stats` | SUPER_ADMIN | Get school statistics |

---

### 4.10 Branches — `/api/branches`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Auth | List branches for current school |
| `POST` | `/` | ERP Admin+ | Create branch |
| `PUT` | `/:id` | ERP Admin+ | Update branch |
| `DELETE` | `/:id` | SUPER_ADMIN | Delete branch |

---

### 4.11 Academic — `/api/academic`

> **Access**: Teacher+ for reads, Admin for writes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/sessions` | Teacher+ | List academic sessions |
| `POST` | `/sessions` | Admin | Create academic session |
| `GET` | `/classes` | Teacher+ | List classes (filterable by sessionId) |
| `POST` | `/classes` | Admin | Create single class |
| `POST` | `/classes/bulk` | Admin | Bulk create classes |
| `GET` | `/sections` | Teacher+ | List sections for a class |
| `POST` | `/sections` | Admin | Create single section |
| `POST` | `/sections/bulk` | Admin | Bulk create sections |
| `POST` | `/class-teachers` | Admin | Assign class teacher to section |
| `GET` | `/class-teachers/:sectionId` | Teacher+ | Get class teachers for section |
| `DELETE` | `/class-teachers/:id` | Admin | Remove class teacher assignment |

#### Academic Hierarchy

```mermaid
flowchart TD
    S["School"] --> AS["AcademicSession (2025-2026)"]
    AS --> C1["Class I"]
    AS --> C2["Class X"]
    C1 --> S1A["Section A"]
    C1 --> S1B["Section B"]
    C2 --> S2A["Section A"]
    S1A --> ST1["Student 1"]
    S1A --> ST2["Student 2"]
    S2A --> ST3["Student 3"]
```

---

### 4.12 Students — `/api/students`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Teacher+, Parent | List students (school-scoped, paginated) |
| `GET` | `/:id` | Auth | Get student details with guardian and section/class |
| `PUT` | `/:id` | Admin | Update student (sectionId, rollNo, guardianId, admissionNo, password) |

#### Query Filters

`GET /api/students?classId=xxx&sectionId=yyy&search=ravi&page=1&limit=20`

> [!NOTE]
> Students are linked to classes via `sectionId → Section → Class → AcademicSession`. The old string-based `class`/`section` fields have been removed. Parent users see only their own children via `guardianId`.

---

### 4.13 Teachers — `/api/teachers`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Teacher+ | List teachers (school-scoped) |
| `GET` | `/:id` | Teacher+ | Get teacher profile |
| `POST` | `/` | Admin | Create teacher + linked user account |
| `PUT` | `/:id` | Admin | Update teacher profile |
| `DELETE` | `/:id` | Admin | Deactivate teacher + disable user login |

> [!WARNING]
> **DELETE** performs a transaction: sets `teacher.isActive = false` AND `user.isActive = false`.

---

### 4.14 Invoices & Finance — `/api/invoices`, `/api/finance`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/invoices` | Auth | List invoices (paginated, student/school scoped) |
| `POST` | `/invoices` | Admin | Create invoice |
| `PUT` | `/invoices/:id/pay` | Admin | Record payment on invoice |
| `GET` | `/finance/defaulters` | Admin | List fee defaulters |
| `POST` | `/finance/generate-monthly-fees` | Admin | Auto-generate monthly invoices for all active students |
| `POST` | `/finance/reconciliation/trigger` | Admin | Manually trigger Razorpay fee reconciliation sync |
| `GET` | `/finance/reconciliation` | Admin | List fee reconciliation batch results |
| `GET` | `/finance/reconciliation/:id` | Admin | Get details of a specific reconciliation batch |
| `GET` | `/finance/scholarships` | Admin/Teacher | List scholarships |
| `POST` | `/finance/scholarships` | Finance Admin | Create scholarship request |
| `PUT` | `/finance/scholarships/:id/approve` | Finance Admin | Approve scholarship and apply credit to invoice |
| `PUT` | `/finance/scholarships/:id/reject` | Finance Admin | Reject scholarship request |

#### Invoice Flow

```mermaid
flowchart LR
    A["Invoice Generated"] --> B["Due Date"]
    B --> C{"Past Grace Period?"}
    C -->|Yes| D["Fine Applied"]
    C -->|No| E["Awaiting Payment"]
    D --> F["Payment Received"]
    E --> F
    F --> G["Receipt Generated"]
```

---

### 4.15 Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create-order` | Auth | Create Razorpay payment order |
| `POST` | `/verify` | Auth | Verify Razorpay payment signature from client |
| `POST` | `/webhook` | ✗ (Razorpay) | Receive Razorpay webhook events (with signature validation, 5-min replay protection, and `gatewayPaymentId` idempotency) |
| `POST` | `/trigger-late-fines` | Auth | Apply late fines to overdue invoices |

---

### 4.16 Exams — `/api/exams`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Teacher+ | List exams (filterable by classId) |
| `POST` | `/` | Admin | Create exam (linked to classId) |
| `PUT` | `/:id` | Admin | Update exam |
| `DELETE` | `/:id` | Admin | Soft archive exam (`isArchived: true`) |
| `POST` | `/:id/marks` | Teacher+ | Submit/update marks for an exam |
| `GET` | `/:examId/report-card/:studentId` | Teacher+ | Generate student report card data |

#### Exam Architecture

```mermaid
flowchart TD
    E["Exam (Midterm - Class X)"] --> ES1["ExamSubject (Math, maxMarks: 100)"]
    E --> ES2["ExamSubject (Science, maxMarks: 100)"]
    ES1 --> SM1["StudentMark (Ravi, 85)"]
    ES1 --> SM2["StudentMark (Priya, 92)"]
    ES2 --> SM3["StudentMark (Ravi, 78)"]
    ES2 --> SM4["StudentMark (Priya, 88)"]
```

---

### 4.17 Attendance — `/api/attendance`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Auth | List attendance records (filterable by studentId, date, classId) |
| `POST` | `/` | Teacher+ | Mark attendance for a student |

---

### 4.18 Assignments — `/api/assignments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Auth | List assignments (filterable by classId, subjectId) |
| `POST` | `/` | Teacher+ | Create assignment with optional attachments |
| `POST` | `/:id/submit` | Student | Submit assignment |
| `POST` | `/submissions/:submissionId/grade` | Teacher+ | Grade a submission (marks, feedback, rubric scoring) |
| `GET` | `/study-materials` | Auth | List study materials (filterable by classId, subjectId) |

---

### 4.19 Admissions — `/api/admissions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | List admission applications |
| `POST` | `/apply` | ✗ (public) | Submit admission application |
| `PUT` | `/:id/review` | Admin | Update application status (review, approve, reject) |
| `POST` | `/:id/enroll` | Admin | Convert approved admission → Student record |
| `DELETE` | `/:id` | Admin | Soft delete application (`deletedAt`) |

#### Admission Pipeline

```mermaid
flowchart LR
    A["PENDING"] --> B["UNDER_REVIEW"]
    B --> C["DOCUMENTS_VERIFIED"]
    C --> D["INTERVIEW"]
    D --> E{"Decision"}
    E -->|Pass| F["APPROVED"]
    E -->|Fail| G["REJECTED"]
    F --> H["ENROLLED → Student Created"]
```

---

### 4.20 HR & Payroll — `/api/hr`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/salaries` | Admin | List salary records |
| `POST` | `/salaries` | Admin | Create salary entry |
| `PUT` | `/salaries/:id/pay` | Admin | Mark salary as paid |
| `GET` | `/payslips/:teacherId` | Teacher+ | Get teacher's payslips |
| `GET` | `/leaves` | Teacher+ | List leave requests |
| `POST` | `/leaves` | Teacher+ | Submit leave request |
| `PUT` | `/leaves/:id` | Admin | Approve/reject leave |

---

### 4.21 Timetable — `/api/timetable`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Teacher+ | Get timetable for a section |
| `GET` | `/teacher/:teacherId` | Teacher+ | Get teacher's personal schedule |
| `POST` | `/` | Admin | Create timetable with slots (uses `teacherSubjectAssignmentId`) |
| `DELETE` | `/:id` | Admin | Delete timetable |

> [!NOTE]
> Timetable slots reference `TeacherSubjectAssignment` which combines teacher + subject + section + session in a single relational link — no raw strings.

---

### 4.22 Messaging (Teacher ↔ Parent) — `/api/messages`

> **Note**: These endpoints represent the new Phase 12A Messaging Infrastructure.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/threads` | Auth | List all message threads for the current user |
| `POST` | `/threads` | Auth | Start a new message thread |
| `GET` | `/:threadId` | Auth | Fetch all messages for a specific thread |
| `POST` | `/:threadId` | Auth | Send a new message to a thread |
| `PUT` | `/:threadId/read` | Auth | Mark thread as read |

---


### 4.24 Notices & Events — `/api/notices`, `/api/events`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/notices` | Optional | List notices (public + private based on auth) |
| `POST` | `/notices` | Admin | Create notice |
| `GET` | `/notices/:id` | ✗ (public) | Get single notice |
| `PUT` | `/notices/:id` | Admin | Update notice |
| `DELETE` | `/notices/:id` | Admin | Delete notice |
| `GET` | `/events` | ✗ (public) | List events |
| `POST` | `/events` | Admin | Create event |
| `PUT` | `/events/:id` | Admin | Update event |
| `DELETE` | `/events/:id` | Admin | Delete event |

---

### 4.23 Notifications — `/api/notifications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/send` | Admin | Send single notification (SMS/Email/WhatsApp) |
| `POST` | `/bulk` | Admin | Send bulk notifications |
| `GET` | `/` | Admin | List sent notifications |
| `POST` | `/fee-reminder` | Admin | Send fee payment reminders |
| `GET` | `/templates` | Admin | List notification templates |
| `POST` | `/templates` | Admin | Create notification template (supports `{{variables}}`) |
| `PUT` | `/templates/:id` | Admin | Update notification template |
| `DELETE` | `/templates/:id` | Admin | Delete notification template |

#### Template Variables

Templates support dynamic variables like:

```
Dear {{studentName}},

Your fee of ₹{{feeAmount}} is due on {{dueDate}}.

School: {{schoolName}}
Parent: {{parentName}}
Invoice: {{invoiceNumber}}
```

---

### 4.24 Communications — `/api/communications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/templates` | Admin | List communication templates |
| `POST` | `/templates` | Admin | Create communication template (Handlebars content) |
| `POST` | `/send` | Admin | Send communication using template |
| `GET` | `/logs` | Admin | List communication logs |

---

### 4.25 Gallery — `/api/gallery`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✗ (public) | List gallery images (filterable by category) |
| `POST` | `/` | Admin | Upload image (multipart form) |
| `DELETE` | `/:id` | Admin | Delete image |

---

### 4.26 Alumni — `/api/alumni`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✗ (public) | List alumni profiles |
| `PUT` | `/` | Admin | Update alumni profile |
| `GET` | `/contributions` | ✗ (public) | List alumni contributions |
| `POST` | `/contributions` | Admin, Alumni | Record contribution |

---

### 4.27 CMS — `/api/testimonials`, `/api/site-content`, `/api/analytics`

> Mounted as `/api/*` via `cms.ts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/testimonials` | ✗ (public) | List testimonials |
| `POST` | `/testimonials` | Admin | Create testimonial |
| `GET` | `/site-content` | ✗ (public) | Get CMS content (filterable by section) |
| `PUT` | `/site-content` | Admin | Update CMS content |
| `GET` | `/analytics` | Admin | Get website analytics |

---

### 4.28 Statistics — `/api/stats`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/public` | ✗ (public) | Public statistics (student count, teacher count etc.) |
| `GET` | `/detailed` | ✗ | Detailed statistics |
| `GET` | `/activity-feed` | Auth | Paginated activity feed (`?page=1&limit=10&type=PAYMENT`) |

---

### 4.29 SaaS Registration — `/api/v1/saas`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/request` | ✗ (public) | Submit a new school registration request from the SaaS landing page |
| `GET` | `/requests` | SUPER_ADMIN | List all pending, approved, and rejected registration requests |
| `POST` | `/approve/:id` | SUPER_ADMIN | Approve a request (auto-provisions `School` tenant and `ERP_ADMIN` user) |
| `POST` | `/reject/:id` | SUPER_ADMIN | Reject a school registration request |

---

### 4.30 SaaS Settings & Branding — `/api/v1/saas/settings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ERP_ADMIN, SUPER_ADMIN | Get tenant settings (themes, branding, SEO config, features) |
| `PUT` | `/` | ERP_ADMIN, SUPER_ADMIN | Update tenant settings |

---

### 4.31 Security Operations Center — `/api/v1/saas/security`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/audit-logs` | SUPER_ADMIN, ERP_ADMIN | Fetch platform audit logs |
| `GET` | `/failed-logins` | SUPER_ADMIN, ERP_ADMIN | Fetch failed login attempts from System Logs |
| `POST` | `/quarantine/:documentId` | SUPER_ADMIN, ERP_ADMIN | Manually quarantine a suspicious document |
| `POST` | `/impersonate/:schoolId` | SUPER_ADMIN | Impersonate a tenant (generates scoped token) |

---

### 4.32 Data Export Center — `/api/v1/saas/export`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | SUPER_ADMIN, ERP_ADMIN | Enqueue an async background data export job via BullMQ. Returns job details. File is uploaded to S3 and user is emailed when complete. |

---

### 4.33 Notification Preferences & Consent — `/api/v1/preferences`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Auth | Get current user's notification preferences |
| `PUT` | `/` | Auth | Update notification preferences |
| `GET` | `/consent` | Guardian | Get active communication consent records (DPDP Compliance) |
| `POST` | `/consent` | Guardian | Toggle consent (opt-in/opt-out) for marketing/promotions |

---

### 4.34 Webhooks — `/api/webhooks`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | List all configured webhook endpoints |
| `POST` | `/` | Admin | Create a new webhook endpoint |
| `DELETE` | `/:id` | Admin | Delete a webhook endpoint |
| `POST` | `/razorpay` | ✗ (Razorpay) | Enterprise-grade Razorpay Webhook listener with Signature Validation |

---

### 4.35 Background Jobs (BullMQ) — `/admin/queues`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/queues` | SUPER_ADMIN | Access the Bull-Board GUI to monitor background queues (Emails, SMS, Exports, Imports) |

---

### 4.36 Bulk Operations — `/api/v1/bulk`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/upload` | Admin | Upload bulk data (students, teachers, invoices). Validates rows and imports valid ones. Fails per-row (partial import) if CSV row validation fails. |
| `GET` | `/jobs` | Admin | List bulk import jobs for the dashboard |
| `GET` | `/jobs/:id` | Admin | Poll for specific job status |

---

### 4.37 Transport Management — `/api/v1/transport`

> **Access**: `SUPER_ADMIN`, `ERP_ADMIN` only

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/vehicles` | Admin | List transport vehicles |
| `POST` | `/vehicles` | Admin | Create a new transport vehicle |
| `GET` | `/routes` | Admin | List transport routes (with stops & vehicles) |
| `POST` | `/routes` | Admin | Create a new transport route |
| `POST` | `/stops` | Admin | Add a stop to an existing transport route |
| `POST` | `/allocate` | Admin | Allocate a student to a transport stop |

---

### 4.38 Discipline & Incident Tracking — `/api/v1/discipline`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/incidents` | Auth | List incidents (Teachers see own, Parents see wards) |
| `POST` | `/incidents` | Teacher+ | Create new incident report |
| `PUT` | `/incidents/:id/resolve` | Teacher+ | Resolve an incident |
| `GET` | `/incidents/student/:id` | Auth | Get behavior/incident summary for a student |

---

### 4.39 Accessgovernance — `/api/v1/admin/accessgovernance`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/delegations` | Admin | Auto-generated endpoint |
| `GET` | `/delegations` | Admin | Auto-generated endpoint |
| `POST` | `/reviews` | Admin | Auto-generated endpoint |
| `PUT` | `/reviews/:id` | Admin | Auto-generated endpoint |

---

### 4.40 Ancillary — `/api/v1/admin/ancillary`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/hostel/rooms` | Admin | Auto-generated endpoint |
| `POST` | `/hostel/rooms` | Admin | Auto-generated endpoint |
| `POST` | `/hostel/allocate` | Admin | Auto-generated endpoint |
| `GET` | `/hostel/allocations` | Admin | Auto-generated endpoint |
| `PUT` | `/hostel/allocations/:id/checkout` | Admin | Auto-generated endpoint |
| `GET` | `/helpdesk/tickets` | Admin | Auto-generated endpoint |
| `POST` | `/helpdesk/tickets` | Admin | Auto-generated endpoint |

---

### 4.41 Backups — `/api/v1/admin/backups`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Admin | Auto-generated endpoint |
| `GET` | `/` | Admin | Auto-generated endpoint |

---

### 4.42 Billing — `/api/v1/admin/billing`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | Admin | Auto-generated endpoint |
| `POST` | `/categories` | Admin | Auto-generated endpoint |
| `POST` | `/structures` | Admin | Auto-generated endpoint |
| `POST` | `/invoices/generate` | Admin | Auto-generated endpoint |

---

### 4.43 Dataexport — `/api/v1/admin/dataexport`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Admin | Auto-generated endpoint |

---

### 4.44 Governance Workflows — `/api/v1/admin/governance-workflows`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/retention-policies` | Admin | Auto-generated endpoint |
| `GET` | `/retention-policies` | Admin | Auto-generated endpoint |
| `POST` | `/retention-policies/execute` | Admin | Auto-generated endpoint |
| `POST` | `/workflows` | Admin | Auto-generated endpoint |

---

### 4.45 Inventory — `/api/v1/admin/inventory`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/locations` | Admin | Auto-generated endpoint |
| `POST` | `/locations` | Admin | Auto-generated endpoint |
| `GET` | `/items` | Admin | Auto-generated endpoint |
| `POST` | `/items` | Admin | Auto-generated endpoint |
| `GET` | `/stock` | Admin | Auto-generated endpoint |

---

### 4.46 Ledgeraccounts — `/api/v1/admin/ledgeraccounts`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | Auto-generated endpoint |
| `POST` | `/` | Admin | Auto-generated endpoint |
| `PUT` | `/:id` | Admin | Auto-generated endpoint |

---

### 4.47 Ledgertransactions — `/api/v1/admin/ledgertransactions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | Auto-generated endpoint |
| `POST` | `/` | Admin | Auto-generated endpoint |
| `GET` | `/balance` | Admin | Auto-generated endpoint |

---

### 4.48 Mdm — `/api/v1/admin/mdm`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/countries` | Admin | Auto-generated endpoint |
| `GET` | `/states` | Admin | Auto-generated endpoint |
| `GET` | `/cities` | Admin | Auto-generated endpoint |
| `GET` | `/religions` | Admin | Auto-generated endpoint |
| `GET` | `/categories` | Admin | Auto-generated endpoint |
| `GET` | `/subjects` | Admin | Auto-generated endpoint |
| `GET` | `/departments` | Admin | Auto-generated endpoint |
| `POST` | `/countries` | Admin | Auto-generated endpoint |
| `POST` | `/states` | Admin | Auto-generated endpoint |
| `POST` | `/cities` | Admin | Auto-generated endpoint |
| `POST` | `/religions` | Admin | Auto-generated endpoint |
| `POST` | `/categories` | Admin | Auto-generated endpoint |
| `POST` | `/subjects` | Admin | Auto-generated endpoint |
| `POST` | `/departments` | Admin | Auto-generated endpoint |
| `DELETE` | `/:entity/:id` | Admin | Auto-generated endpoint |

---

### 4.49 Payroll — `/api/v1/admin/payroll`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/generate` | Admin | Auto-generated endpoint |
| `POST` | `/:id/disburse` | Admin | Auto-generated endpoint |
| `GET` | `/` | Admin | Auto-generated endpoint |

---

### 4.50 Procurement — `/api/v1/admin/procurement`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/vendors` | Admin | Auto-generated endpoint |
| `POST` | `/vendors` | Admin | Auto-generated endpoint |
| `GET` | `/orders` | Admin | Auto-generated endpoint |
| `POST` | `/orders` | Admin | Auto-generated endpoint |
| `PUT` | `/orders/:id/status` | Admin | Auto-generated endpoint |

---

### 4.51 Purchaseorders — `/api/v1/admin/purchaseorders`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | Auto-generated endpoint |
| `POST` | `/` | Admin | Auto-generated endpoint |
| `POST` | `/:id/approve` | Admin | Auto-generated endpoint |
| `POST` | `/:id/receive` | Admin | Auto-generated endpoint |

---

### 4.52 Saassettings — `/api/v1/admin/saassettings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/settings` | Admin | Auto-generated endpoint |
| `PUT` | `/settings` | Admin | Auto-generated endpoint |
| `GET` | `/branding` | Admin | Auto-generated endpoint |
| `PUT` | `/branding` | Admin | Auto-generated endpoint |
| `GET` | `/features` | Admin | Auto-generated endpoint |
| `POST` | `/features/toggle` | Admin | Auto-generated endpoint |

---

### 4.53 Support — `/api/v1/admin/support`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/diagnostics` | Admin | Auto-generated endpoint |

---

### 4.54 Vendors — `/api/v1/admin/vendors`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | Auto-generated endpoint |
| `POST` | `/` | Admin | Auto-generated endpoint |
| `PUT` | `/:id` | Admin | Auto-generated endpoint |
| `DELETE` | `/:id` | Admin | Auto-generated endpoint |

---

### 4.55 Backups — `/api/v1/backups`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/status` | Admin | Auto-generated endpoint |
| `POST` | `/trigger` | Admin | Auto-generated endpoint |
| `GET` | `/:id/download` | Admin | Auto-generated endpoint |

---

### 4.56 Certificates — `/api/v1/certificates`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/templates` | Admin | Auto-generated endpoint |
| `POST` | `/issue` | Admin | Auto-generated endpoint |
| `GET` | `/verify/:certNo` | Admin | Auto-generated endpoint |

---

### 4.57 Crm — `/api/v1/crm`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/leads` | Admin | Auto-generated endpoint |
| `POST` | `/leads/:id/interactions` | Admin | Auto-generated endpoint |
| `PUT` | `/leads/:id/stage` | Admin | Auto-generated endpoint |
| `GET` | `/pipeline` | Admin | Auto-generated endpoint |

---

### 4.58 Documents — `/api/v1/documents`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | Auto-generated endpoint |
| `POST` | `/upload` | Admin | Auto-generated endpoint |
| `GET` | `/:id` | Admin | Auto-generated endpoint |
| `DELETE` | `/:id` | Admin | Auto-generated endpoint |
| `PUT` | `/:id/verify` | Admin | Auto-generated endpoint |

---

### 4.59 Finance Governance — `/api/v1/finance-governance`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/periods/:id/close` | Admin | Auto-generated endpoint |
| `POST` | `/reconcile` | Admin | Auto-generated endpoint |

---

### 4.60 Finance Reconciliation — `/api/v1/finance-reconciliation`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Admin | Auto-generated endpoint |
| `GET` | `/unmatched` | Admin | Auto-generated endpoint |
| `POST` | `/manual-match` | Admin | Auto-generated endpoint |
| `POST` | `/trigger` | Admin | Auto-generated endpoint |

---

### 4.61 Inventory — `/api/v1/inventory`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/movements` | Admin | Auto-generated endpoint |
| `GET` | `/stocks` | Admin | Auto-generated endpoint |

---

### 4.62 Mobile — `/api/v1/mobile`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/config` | Admin | Auto-generated endpoint |
| `POST` | `/devices` | Admin | Auto-generated endpoint |
| `DELETE` | `/devices/:token` | Admin | Auto-generated endpoint |
| `PUT` | `/config/:platform` | Admin | Auto-generated endpoint |

---

### 4.63 Procurement — `/api/v1/procurement`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/requests` | Admin | Auto-generated endpoint |
| `POST` | `/requests/:id/approve` | Admin | Auto-generated endpoint |
| `POST` | `/orders/:id/receive` | Admin | Auto-generated endpoint |

---

### 4.64 Storage — `/api/v1/storage`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/upload` | Admin | Auto-generated endpoint |
| `GET` | `/signed-url` | Admin | Auto-generated endpoint |

---

### 4.65 Ledger — `/api/v1/ledger`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/hash-chain-verification` | Admin | Auto-generated endpoint |

---


## 5. Frontend Application Structure

### 5.1 ERP Admin Dashboard (`erp-admin` — Port 3000)

#### Page Routes (22 Admin Pages)

| Route | Page | Purpose |
|---|---|---|
| `/` | Public Landing | School website with hero, programs, gallery |
| `/admin` | Dashboard | Overview stats, quick actions, activity feed, fee chart |
| `/admin/students` | Student Management | CRUD, search, filters by class/section |
| `/admin/teachers` | Teacher Management | Profiles, dynamic experience, deactivation |
| `/admin/admissions` | Admissions | Application pipeline management |
| `/admin/fees` | Fee Management | Invoices, structures, categories |
| `/admin/fees/defaulters` | Defaulter Dashboard | Overdue tracking, reminder actions |
| `/admin/exams` | Exam Management | Create exams, manage marks via ExamSubject |
| `/admin/results` | Results | Grades, report cards |
| `/admin/attendance` | Attendance | Mark and view student attendance |
| `/admin/timetable` | Timetable | Weekly schedule management |
| `/admin/hr` | HR & Payroll | Salaries, leaves, payslips |
| `/admin/notices` | Notice Board | Create and manage notices |
| `/admin/events` | Events | Create and manage events |
| `/admin/notifications` | Notifications | SMS/Email/WhatsApp sending |
| `/admin/notifications/templates` | Notification Templates | CRUD for dynamic `{{variable}}` templates |
| `/admin/analytics` | Analytics | Finance and operational analytics |
| `/admin/gallery` | Photo Gallery | Upload and manage images |
| `/admin/faculty` | Faculty Overview | Faculty listing |
| `/admin/assignments` | Assignments | Create and track assignments |
| `/admin/alumni-mgmt` | Alumni Management | Alumni profiles and contributions |
| `/admin/users` | User Management | Create/edit users, assign roles, reset passwords |
| `/admin/settings` | Settings | System configuration |
| `/admin/site-settings` | CMS Settings | Website content management |

#### Component Library (21 Components)

| Component | File | Purpose |
|---|---|---|
| `DashboardLayout` | `DashboardLayout.tsx` | Sidebar, header, stat cards, tables, badges |
| `GlobalSearch` | `GlobalSearch.tsx` | Real-time search across all entities |
| `QuickActionModals` | `QuickActionModals.tsx` | Popup forms for quick data entry + CSV bulk import with validation |
| `QuickActionsDropdown` | `QuickActionsDropdown.tsx` | Header dropdown for additional quick actions |
| `ActivityFeed` | `ActivityFeed.tsx` | Dashboard widget showing recent activity (paginated API) |
| `LoginModal` | `LoginModal.tsx` | Animated login form |
| `CinematicHeroSection` | `CinematicHeroSection.tsx` | Public landing page hero |
| `NewNavbar` | `NewNavbar.tsx` | Public navigation bar |
| `NewFooter` | `NewFooter.tsx` | Public footer |
| `AcademicProgramsSection` | `AcademicProgramsSection.tsx` | Academic programs display |
| `AdmissionCTASection` | `AdmissionCTASection.tsx` | Admission call-to-action |
| `CoreValuesSection` | `CoreValuesSection.tsx` | School core values |
| `EventsNoticesSection` | `EventsNoticesSection.tsx` | Events and notices feed |
| `GallerySection` | `GallerySection.tsx` | Photo gallery carousel |
| `LeadershipSection` | `LeadershipSection.tsx` | Leadership team display |
| `StatsSection` | `StatsSection.tsx` | Public statistics counters |
| `StudentAchievementsSection` | `StudentAchievementsSection.tsx` | Student achievements showcase |
| `TestimonialsSection` | `TestimonialsSection.tsx` | Testimonial cards |
| `WelcomeSection` | `WelcomeSection.tsx` | Welcome message area |
| `BackButton` | `BackButton.tsx` | Navigation back button |

#### Frontend Libraries

| Library | Version | Purpose |
|---|---|---|
| `next` | 16.2.6 | React framework (App Router) |
| `react` | 19.2.4 | UI library |
| `framer-motion` | ^12.38.0 | Animations and transitions |
| `recharts` | ^3.8.1 | Data visualization charts |
| `swr` | ^2.4.1 | Data fetching and caching |
| `papaparse` | latest | CSV parsing for bulk uploads |

#### API Hooks (`api-hooks.ts`)

| Hook | Endpoint | Description |
|---|---|---|
| `useStudents(params)` | `/api/students` | Fetch students with filters |
| `useTeachers(params)` | `/api/teachers` | Fetch teachers |
| `useNotices(params)` | `/api/notices` | Fetch notices with filters |
| `useEvents(params)` | `/api/events` | Fetch events with filters |
| `useExams(params)` | `/api/exams` | Fetch exams |
| `useResults(params)` | `/api/results` | Fetch results |
| `useAttendance(params)` | `/api/attendance` | Fetch attendance |
| `useTeacherAttendance(params)` | `/api/attendance/teachers` | Fetch teacher attendance |
| `useAssignments(params)` | `/api/assignments` | Fetch assignments |
| `useTimetable(params)` | `/api/timetable` | Fetch timetable |
| `useAdmissions(params)` | `/api/admissions` | Fetch admissions |
| `useInvoices(params)` | `/api/invoices` | Fetch invoices |
| `useGallery(category)` | `/api/gallery` | Fetch gallery images |
| `useAlumni(params)` | `/api/alumni` | Fetch alumni |
| `useContributions(alumniId)` | `/api/alumni/contributions` | Fetch alumni contributions |
| `useTestimonials()` | `/api/testimonials` | Fetch testimonials |
| `useSiteContent(section)` | `/api/site-content` | Fetch CMS content |
| `useSalaries(params)` | `/api/hr/salaries` | Fetch salary records |
| `useLeaves(params)` | `/api/hr/leaves` | Fetch leave requests |
| `useNotifications(params)` | `/api/notifications` | Fetch notifications |
| `useAnalytics()` | `/api/stats/overview` | Fetch dashboard analytics |
| `useFinanceStats()` | `/api/stats/finance` | Fetch finance metrics |
| `usePublicStats()` | `/api/stats/public` | Fetch public stats |
| `useSearch(query)` | `/api/search?q=` | Global search (triggers at 2+ chars) |
| `apiCall(url, method, body)` | — | Generic API mutation helper |
| `invalidateAll(key)` | — | SWR cache invalidation |

### 5.2 Super Admin Portal (`super-admin` — Port 3001)

#### Page Routes
| Route | Page | Purpose |
|---|---|---|
| `/login` | Login | Super Admin secure login |
| `/dashboard/schools` | Tenant Management | Provision, suspend, and view school tenants |
| `/dashboard/requests` | SaaS Leads | Review and approve SaaS registration requests |
| `/dashboard/analytics` | Platform Analytics | Platform-wide revenue and usage metrics |
| `/dashboard/governance` | Governance & Auditing | View platform audit logs and security events |
| `/dashboard/settings` | Platform Settings | Global system configuration and billing plans |
| `/portal` | Quick Actions | Impersonation entry point |

#### Component Library
Shares core UI components with ERP Admin:
- `PageHeader`: Consistent page titles and actions
- `DataTable`: Responsive tables for tenants and requests
- `StatusBadge`: For SaaS request statuses
- `Modal`: For impersonation and approval confirmations

#### Frontend Libraries
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Data Fetching:** SWR (via `api-hooks.ts`)
- **Animations:** Framer Motion
- **Icons:** Lucide React

#### API Hooks (`api-hooks.ts`)
| Hook | Endpoint | Description |
|---|---|---|
| `useSchools(params)` | `/api/v1/schools` | Fetch all configured school tenants |
| `useSaaSRequests(params)` | `/api/v1/saas/requests` | Fetch SaaS registration leads |
| `useAuditLogs(params)` | `/api/v1/saas/security/audit-logs` | Fetch platform audit events |
| `useFailedLogins(params)` | `/api/v1/saas/security/failed-logins` | Fetch suspicious login activities |
| `apiCall(url, method, body)` | — | Generic API mutation wrapper |

### 5.3 Teacher Portal (`teacher-portal` — Port 3002)

#### Page Routes
| Route | Page | Purpose |
|---|---|---|
| `/login` | Login | Teacher secure authentication |
| `/portal/attendance` | Attendance Entry | Quick entry for class/subject attendance |
| `/portal/discipline` | Discipline Tracking | Record student behavior and incidents |
| `/portal/exams` | Exam Marks Entry | Enter marks for assigned subjects |
| `/portal/homework` | Assignments | Create and review daily homework/assignments |
| `/portal/leaves` | Leave Management | Apply for leave and view status |
| `/portal/profile` | Teacher Profile | View personal details and documents |
| `/portal/salary` | Salary & Payslips | View and download monthly payslips |
| `/portal/timetable` | Timetable | View weekly teaching schedule |

#### Component Library
Shares core UI components with ERP Admin, optimized for mobile:
- `PageHeader`: Mobile-friendly headers
- `DataTable`: Scrollable tables for marks and attendance
- `StatusBadge`: For leave statuses and attendance states

#### Frontend Libraries
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Data Fetching:** SWR (via `api-hooks.ts`)
- **Animations:** Framer Motion
- **Icons:** Lucide React

#### API Hooks (`api-hooks.ts`)
| Hook | Endpoint | Description |
|---|---|---|
| `useTeacherProfile()` | `/api/v1/teachers/me` | Fetch authenticated teacher profile |
| `useAssignedClasses()` | `/api/v1/academic/assignments` | Fetch assigned subjects/classes |
| `useTeacherAttendance()` | `/api/v1/attendance/teachers` | Fetch teacher's own attendance |
| `useLeaves()` | `/api/v1/hr/leaves` | Fetch teacher's leave requests |
| `useSalaries()` | `/api/v1/hr/salaries` | Fetch teacher's payslips |
| `apiCall(url, method, body)` | — | Generic API mutation wrapper |

### 5.4 Parent Portal (`parent-portal` — Port 3006)

#### Page Routes
| Route | Page | Purpose |
|---|---|---|
| `/login` | Login | Parent authentication (supports multiple wards) |
| `/dashboard/attendance` | Ward Attendance | View student daily attendance |
| `/dashboard/assignments` | Homework | View pending and completed assignments |
| `/dashboard/behavior` | Behavior Logs | View discipline and positive behavior records |
| `/dashboard/fees` | Fee Management | View invoices, payment history, and pay online |
| `/dashboard/notices` | Communications | View school notices, circulars, and messages |
| `/dashboard/results` | Report Cards | Download digital report cards |
| `/dashboard/timetable` | Class Timetable | View student's weekly schedule |
| `/dashboard/transport` | Transport | Track school bus and transport routes |
| `/dashboard/settings/consent` | Consent Management | Opt-in/out of notifications and data sharing |

#### Component Library
Optimized for mobile-first consumption by parents:
- `MetricCard`: Quick stats for attendance and grades
- `Timeline`: For behavior logs and notices
- `InvoiceCard`: For pending and paid fee invoices

#### Frontend Libraries
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Data Fetching:** SWR (via `api-hooks.ts`)
- **Animations:** Framer Motion
- **Icons:** Lucide React

#### API Hooks (`api-hooks.ts`)
| Hook | Endpoint | Description |
|---|---|---|
| `useWards()` | `/api/v1/guardians/wards` | Fetch all students linked to the parent |
| `useWardAttendance(id)` | `/api/v1/attendance?studentId={id}` | Fetch attendance for a specific ward |
| `useWardResults(id)` | `/api/v1/results?studentId={id}` | Fetch results for a specific ward |
| `useWardInvoices(id)` | `/api/v1/invoices?studentId={id}` | Fetch fee invoices for a specific ward |
| `useNotices()` | `/api/v1/notices` | Fetch public and class-specific notices |
| `apiCall(url, method, body)` | — | Generic API mutation wrapper |

### 5.5 Payment Portal (`payment-portal` — Port 3007)

#### Page Routes
| Route | Page | Purpose |
|---|---|---|
| `/login` | Secure Access | Student/Parent login for quick fee payments |
| `/checkout` | Razorpay Checkout | Processing invoices via Razorpay gateway |

#### Component Library
Focused exclusively on checkout flows:
- `CheckoutForm`: Razorpay integrated payment form
- `InvoiceSummary`: Breakdown of fees and late fines
- `ReceiptViewer`: Printable payment receipts

#### Frontend Libraries
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Payments:** Razorpay Checkout JS
- **Data Fetching:** SWR (via `api-hooks.ts`)

#### API Hooks (`api-hooks.ts`)
| Hook | Endpoint | Description |
|---|---|---|
| `usePendingInvoices()` | `/api/v1/payments/pending` | Fetch unpaid invoices for the user |
| `usePaymentHistory()` | `/api/v1/payments/history` | Fetch completed payment receipts |
| `apiCall(url, method, body)` | — | Generic API mutation wrapper |

### 5.6 SaaS Landing (`saas-frontend` — Port 3008)

#### Page Routes
| Route | Page | Purpose |
|---|---|---|
| `/` | Landing Page | Public marketing site for the SaaS platform |
| `/pricing` | Pricing Plans | Subscription tiers and feature comparison |
| `/apply` | Registration | Lead capture form for new schools |

#### Component Library
Marketing-focused components:
- `HeroSection`: High-conversion landing hero
- `FeatureGrid`: Showcase of ERP capabilities
- `PricingTable`: Comparative feature matrices
- `TurnstileForm`: Cloudflare-protected lead capture forms

#### Frontend Libraries
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Security:** `@marsidev/react-turnstile` (Cloudflare CAPTCHA)
- **Animations:** Framer Motion

#### API Hooks (`api-hooks.ts`)
| Hook | Endpoint | Description |
|---|---|---|
| `usePublicStats()` | `/api/v1/stats/public` | Fetch platform-wide usage stats for marketing |
| `apiCall(url, method, body)` | — | Generic API mutation wrapper |


---

## 6. Environment Configuration

### Required Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `postgres` | Database username |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_DB` | `ssvm_platform` | Database name |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `BACKEND_PORT` | `5000` | Backend API port |
| `FRONTEND_PORT` | `3000` | ERP Admin port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string for caching |
| `SENTRY_DSN` | (optional) | Sentry DSN for error tracking |
| `ACCESS_TOKEN_SECRET` | (generated) | JWT access signing secret |
| `REFRESH_TOKEN_SECRET`| (generated) | JWT refresh signing secret |
| `ACCESS_TOKEN_EXPIRES_IN`| `15m` | Access token expiry |
| `REFRESH_TOKEN_EXPIRES_IN`| `30d` | Refresh token expiry |
| `NODE_ENV` | `production` | Runtime environment |
| `RAZORPAY_KEY_ID` | — | Razorpay integration ID |
| `RAZORPAY_KEY_SECRET` | — | Razorpay integration Secret |
| `AWS_S3_BUCKET` | — | S3 bucket for system backups |
| `AWS_REGION` | `ap-south-1` | S3 region |
| `AWS_ACCESS_KEY_ID` | — | AWS IAM Access Key |
| `AWS_SECRET_ACCESS_KEY` | — | AWS IAM Secret Key |

### Security Configuration

| Feature | Implementation |
|---|---|
| **Helmet** | HTTP security headers |
| **Rate Limiting** | 200 req/min global, 10 req/15min for auth |
| **CORS** | Restricted to `FRONTEND_URL` origin |
| **bcrypt** | 12 salt rounds for password hashing |
| **JWT** | HS256 with configurable expiry |
| **Cookie** | HttpOnly, SameSite=Lax, Secure in production |

### Migration Strategy

```bash
# Development: tracked migrations (team-safe)
npx prisma migrate dev --name <description>

# Production: apply migrations
npx prisma migrate deploy
```

> [!IMPORTANT]
> Always use `prisma migrate dev` instead of `prisma db push`. Migrations provide change history, are team-friendly, and safer for production deployments.

---

> **Total API Endpoints**: ~140+  
> **Total Database Models**: 202  
> **Total Enums**: 15  
> **Total Route Files**: 55  
> **Total Frontend Pages**: 25 routes  
> **Total Components**: 21 reusable UI components  
> **Total API Hooks**: 26 SWR hooks
