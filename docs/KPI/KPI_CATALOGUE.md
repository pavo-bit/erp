# SSVM ERP — Key Performance Indicators (KPI) Catalogue

> **Generated Document:** Auto-generated from `ssvm-backend/src/kpi/registry.ts` by `scripts/generate-kpi-catalogue.cjs`.
> **Total Registered KPIs:** 30

---

## Summary Matrix

| Scope | Count |
| :--- | :--- |
| **SCHOOL** | 23 |
| **PLATFORM** | 7 |
| **Total** | **30** |

---

## Full KPI Definitions

| ID | Name | Module | Scope | Period | Unit | Required Module | Formula |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `kpi_school_admissions` | **New Student Admissions** | `ACADEMICS` | `SCHOOL` | `ACADEMIC_YEAR` | `count` | *none* | `COUNT(Student) WHERE admissionDate >= periodStart AND admissionDate <= periodEnd AND deletedAt IS NULL` |
| `kpi_school_active_students` | **Enrolled Active Students** | `ACADEMICS` | `SCHOOL` | `REALTIME` | `count` | *none* | `COUNT(Student) WHERE isActive = true AND deletedAt IS NULL` |
| `kpi_school_student_attendance_rate` | **Student Attendance Rate** | `ACADEMICS` | `SCHOOL` | `MONTHLY` | `percentage` | *none* | `(COUNT(Attendance WHERE status = 'PRESENT') / COUNT(Attendance)) * 100` |
| `kpi_school_staff_attendance_rate` | **Staff Attendance Rate** | `HR_PAYROLL` | `SCHOOL` | `MONTHLY` | `percentage` | *none* | `(COUNT(TeacherAttendance WHERE status = 'PRESENT') / COUNT(TeacherAttendance)) * 100` |
| `kpi_school_exam_pass_rate` | **Examination Pass Rate** | `EXAMS` | `SCHOOL` | `ACADEMIC_YEAR` | `percentage` | *none* | `(COUNT(StudentMark WHERE marksObtained >= examSubject.passMarks) / COUNT(StudentMark)) * 100` |
| `kpi_school_fee_collection_efficiency` | **Fee Collection Efficiency** | `FINANCE` | `SCHOOL` | `ACADEMIC_YEAR` | `percentage` | *none* | `(SUM(Invoice.amountPaid) / SUM(Invoice.amount)) * 100` |
| `kpi_school_fee_dues` | **Outstanding Student Fee Dues** | `FINANCE` | `SCHOOL` | `REALTIME` | `currency` | *none* | `SUM(Invoice.remainingAmount WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE') AND isVoided = false)` |
| `kpi_school_fee_defaulters` | **Fee Defaulter Student Count** | `FINANCE` | `SCHOOL` | `REALTIME` | `count` | *none* | `COUNT(DISTINCT studentId FROM Invoice WHERE isOverdue = true OR (dueDate < NOW() AND remainingAmount > 0 AND isVoided = false))` |
| `kpi_school_refund_rate` | **Fee Refund Ratio** | `FINANCE` | `SCHOOL` | `ACADEMIC_YEAR` | `percentage` | *none* | `(SUM(DailyRevenueProjection.totalRefunded) / SUM(DailyRevenueProjection.totalCollected)) * 100` |
| `kpi_school_monthly_payroll_cost` | **Monthly Staff Payroll Cost** | `HR_PAYROLL` | `SCHOOL` | `MONTHLY` | `currency` | *none* | `SUM(Salary.netPay WHERE month = currentMonth AND year = currentYear AND status = 'PAID')` |
| `kpi_school_hostel_occupancy` | **Hostel Bed Occupancy Rate** | `HOSTEL` | `SCHOOL` | `REALTIME` | `percentage` | `HOSTEL` | `(COUNT(HostelAllocation WHERE status = 'ACTIVE') / SUM(HostelRoom.capacity)) * 100` |
| `kpi_school_library_circulation` | **Active Library Book Circulations** | `LIBRARY` | `SCHOOL` | `REALTIME` | `count` | `LIBRARY` | `COUNT(BookIssue WHERE status = 'ISSUED' AND returnDate IS NULL)` |
| `kpi_school_inventory_low_stock` | **Inventory Low Stock Alerts** | `INVENTORY` | `SCHOOL` | `REALTIME` | `count` | `INVENTORY` | `COUNT(InventoryItem WHERE isActive = true AND quantity <= reorderLevel)` |
| `kpi_school_notification_delivery_rate` | **Notification Delivery Success Rate** | `COMMUNICATIONS` | `SCHOOL` | `MONTHLY` | `percentage` | `COMMUNICATIONS` | `(COUNT(Notification WHERE status = 'SENT') / COUNT(Notification)) * 100` |
| `kpi_teacher_classes_count` | **Teacher Assigned Sections Count** | `ACADEMICS` | `SCHOOL` | `REALTIME` | `count` | *none* | `COUNT(TeacherSubjectAssignment WHERE teacherId = :teacherId)` |
| `kpi_teacher_class_attendance_rate` | **Teacher Classroom Student Attendance Rate** | `ACADEMICS` | `SCHOOL` | `MONTHLY` | `percentage` | *none* | `(COUNT(Attendance WHERE status = 'PRESENT' AND sectionId IN (:teacherSections)) / COUNT(Attendance)) * 100` |
| `kpi_student_own_attendance_rate` | **Student Personal Attendance Rate** | `ACADEMICS` | `SCHOOL` | `MONTHLY` | `percentage` | *none* | `(COUNT(Attendance WHERE studentId = :studentId AND status = 'PRESENT') / COUNT(Attendance)) * 100` |
| `kpi_student_own_fee_due` | **Student Personal Outstanding Fee Dues** | `FINANCE` | `SCHOOL` | `REALTIME` | `currency` | *none* | `SUM(Invoice.remainingAmount WHERE studentId = :studentId AND isVoided = false)` |
| `kpi_student_own_average_marks` | **Student Personal Academic Average Marks** | `EXAMS` | `SCHOOL` | `ACADEMIC_YEAR` | `percentage` | *none* | `AVG((StudentMark.marksObtained / ExamSubject.maxMarks) * 100)` |
| `kpi_student_own_books_borrowed` | **Student Active Borrowed Books Count** | `LIBRARY` | `SCHOOL` | `REALTIME` | `count` | `LIBRARY` | `COUNT(BookIssue WHERE userId = :studentId AND status = 'ISSUED')` |
| `kpi_parent_children_count` | **Parent Enrolled Wards Count** | `ACADEMICS` | `SCHOOL` | `REALTIME` | `count` | *none* | `COUNT(StudentGuardian WHERE guardianId = :guardianId)` |
| `kpi_parent_total_fee_due` | **Parent Wards Total Outstanding Fee Dues** | `FINANCE` | `SCHOOL` | `REALTIME` | `currency` | *none* | `SUM(Invoice.remainingAmount WHERE studentId IN (:wardIds) AND isVoided = false)` |
| `kpi_parent_average_children_attendance` | **Parent Wards Average Attendance Rate** | `ACADEMICS` | `SCHOOL` | `MONTHLY` | `percentage` | *none* | `(COUNT(Attendance WHERE studentId IN (:wardIds) AND status = 'PRESENT') / COUNT(Attendance)) * 100` |
| `kpi_platform_schools_total` | **Platform Registered Schools** | `PLATFORM` | `PLATFORM` | `REALTIME` | `count` | *none* | `COUNT(School WHERE deletedAt IS NULL)` |
| `kpi_platform_schools_active` | **Platform Active Schools** | `PLATFORM` | `PLATFORM` | `REALTIME` | `count` | *none* | `COUNT(School WHERE status = 'ACTIVE' AND deletedAt IS NULL)` |
| `kpi_platform_schools_suspended` | **Platform Suspended Schools** | `PLATFORM` | `PLATFORM` | `REALTIME` | `count` | *none* | `COUNT(School WHERE status = 'SUSPENDED' AND deletedAt IS NULL)` |
| `kpi_platform_module_adoption_rate` | **Platform Average Module Adoption Rate** | `PLATFORM` | `PLATFORM` | `REALTIME` | `percentage` | *none* | `(COUNT(SchoolFeature WHERE isEnabled = true) / (COUNT(School) * totalRegistryModules)) * 100` |
| `kpi_platform_daily_active_users` | **Platform Daily Active Users (DAU)** | `PLATFORM` | `PLATFORM` | `DAILY` | `count` | *none* | `COUNT(DISTINCT userId FROM User WHERE lastLogin >= NOW() - 24 HOURS AND isActive = true)` |
| `kpi_platform_support_sessions_active` | **Platform Active Support Sessions** | `PLATFORM` | `PLATFORM` | `REALTIME` | `count` | *none* | `COUNT(SupportSessions WHERE status = 'ACTIVE' AND expiresAt > NOW())` |
| `kpi_platform_api_error_rate` | **Platform 24-Hour API Error Rate** | `PLATFORM` | `PLATFORM` | `DAILY` | `percentage` | *none* | `(SUM(ssvm_http_requests_total{status=~'5..'}) / SUM(ssvm_http_requests_total)) * 100` |

---

## KPI Specifications by Domain

### Academic & Student Operations

#### `kpi_school_admissions` — New Student Admissions
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `ACADEMIC_YEAR`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(Student) WHERE admissionDate >= periodStart AND admissionDate <= periodEnd AND deletedAt IS NULL`

#### `kpi_school_active_students` — Enrolled Active Students
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(Student) WHERE isActive = true AND deletedAt IS NULL`

#### `kpi_school_student_attendance_rate` — Student Attendance Rate
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `MONTHLY`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(COUNT(Attendance WHERE status = 'PRESENT') / COUNT(Attendance)) * 100`

#### `kpi_teacher_classes_count` — Teacher Assigned Sections Count
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(TeacherSubjectAssignment WHERE teacherId = :teacherId)`

#### `kpi_teacher_class_attendance_rate` — Teacher Classroom Student Attendance Rate
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `MONTHLY`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(COUNT(Attendance WHERE status = 'PRESENT' AND sectionId IN (:teacherSections)) / COUNT(Attendance)) * 100`

#### `kpi_student_own_attendance_rate` — Student Personal Attendance Rate
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `MONTHLY`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(COUNT(Attendance WHERE studentId = :studentId AND status = 'PRESENT') / COUNT(Attendance)) * 100`

#### `kpi_parent_children_count` — Parent Enrolled Wards Count
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(StudentGuardian WHERE guardianId = :guardianId)`

#### `kpi_parent_average_children_attendance` — Parent Wards Average Attendance Rate
- **Owner Module:** `ACADEMICS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `MONTHLY`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(COUNT(Attendance WHERE studentId IN (:wardIds) AND status = 'PRESENT') / COUNT(Attendance)) * 100`

### Financial & Revenue Operations

#### `kpi_school_fee_collection_efficiency` — Fee Collection Efficiency
- **Owner Module:** `FINANCE`
- **Scope:** `SCHOOL`
- **Measurement Period:** `ACADEMIC_YEAR`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(SUM(Invoice.amountPaid) / SUM(Invoice.amount)) * 100`

#### `kpi_school_fee_dues` — Outstanding Student Fee Dues
- **Owner Module:** `FINANCE`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `currency`
- **Mathematical Formula:** `SUM(Invoice.remainingAmount WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE') AND isVoided = false)`

#### `kpi_school_fee_defaulters` — Fee Defaulter Student Count
- **Owner Module:** `FINANCE`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(DISTINCT studentId FROM Invoice WHERE isOverdue = true OR (dueDate < NOW() AND remainingAmount > 0 AND isVoided = false))`

#### `kpi_school_refund_rate` — Fee Refund Ratio
- **Owner Module:** `FINANCE`
- **Scope:** `SCHOOL`
- **Measurement Period:** `ACADEMIC_YEAR`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(SUM(DailyRevenueProjection.totalRefunded) / SUM(DailyRevenueProjection.totalCollected)) * 100`

#### `kpi_student_own_fee_due` — Student Personal Outstanding Fee Dues
- **Owner Module:** `FINANCE`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `currency`
- **Mathematical Formula:** `SUM(Invoice.remainingAmount WHERE studentId = :studentId AND isVoided = false)`

#### `kpi_parent_total_fee_due` — Parent Wards Total Outstanding Fee Dues
- **Owner Module:** `FINANCE`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `currency`
- **Mathematical Formula:** `SUM(Invoice.remainingAmount WHERE studentId IN (:wardIds) AND isVoided = false)`

### Examinations & Grading

#### `kpi_school_exam_pass_rate` — Examination Pass Rate
- **Owner Module:** `EXAMS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `ACADEMIC_YEAR`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(COUNT(StudentMark WHERE marksObtained >= examSubject.passMarks) / COUNT(StudentMark)) * 100`

#### `kpi_student_own_average_marks` — Student Personal Academic Average Marks
- **Owner Module:** `EXAMS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `ACADEMIC_YEAR`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `AVG((StudentMark.marksObtained / ExamSubject.maxMarks) * 100)`

### Human Resources & Staff Payroll

#### `kpi_school_staff_attendance_rate` — Staff Attendance Rate
- **Owner Module:** `HR_PAYROLL`
- **Scope:** `SCHOOL`
- **Measurement Period:** `MONTHLY`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(COUNT(TeacherAttendance WHERE status = 'PRESENT') / COUNT(TeacherAttendance)) * 100`

#### `kpi_school_monthly_payroll_cost` — Monthly Staff Payroll Cost
- **Owner Module:** `HR_PAYROLL`
- **Scope:** `SCHOOL`
- **Measurement Period:** `MONTHLY`
- **Metric Unit:** `currency`
- **Mathematical Formula:** `SUM(Salary.netPay WHERE month = currentMonth AND year = currentYear AND status = 'PAID')`

### Campus Operations (Hostel, Library, Inventory)

#### `kpi_school_hostel_occupancy` — Hostel Bed Occupancy Rate
- **Owner Module:** `HOSTEL`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `percentage`
- **Required Module Entitlement:** `HOSTEL`
- **Mathematical Formula:** `(COUNT(HostelAllocation WHERE status = 'ACTIVE') / SUM(HostelRoom.capacity)) * 100`

#### `kpi_school_library_circulation` — Active Library Book Circulations
- **Owner Module:** `LIBRARY`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Required Module Entitlement:** `LIBRARY`
- **Mathematical Formula:** `COUNT(BookIssue WHERE status = 'ISSUED' AND returnDate IS NULL)`

#### `kpi_school_inventory_low_stock` — Inventory Low Stock Alerts
- **Owner Module:** `INVENTORY`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Required Module Entitlement:** `INVENTORY`
- **Mathematical Formula:** `COUNT(InventoryItem WHERE isActive = true AND quantity <= reorderLevel)`

#### `kpi_student_own_books_borrowed` — Student Active Borrowed Books Count
- **Owner Module:** `LIBRARY`
- **Scope:** `SCHOOL`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Required Module Entitlement:** `LIBRARY`
- **Mathematical Formula:** `COUNT(BookIssue WHERE userId = :studentId AND status = 'ISSUED')`

### Communications & Alerts

#### `kpi_school_notification_delivery_rate` — Notification Delivery Success Rate
- **Owner Module:** `COMMUNICATIONS`
- **Scope:** `SCHOOL`
- **Measurement Period:** `MONTHLY`
- **Metric Unit:** `percentage`
- **Required Module Entitlement:** `COMMUNICATIONS`
- **Mathematical Formula:** `(COUNT(Notification WHERE status = 'SENT') / COUNT(Notification)) * 100`

### SaaS Platform & Multi-Tenancy Health

#### `kpi_platform_schools_total` — Platform Registered Schools
- **Owner Module:** `PLATFORM`
- **Scope:** `PLATFORM`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(School WHERE deletedAt IS NULL)`

#### `kpi_platform_schools_active` — Platform Active Schools
- **Owner Module:** `PLATFORM`
- **Scope:** `PLATFORM`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(School WHERE status = 'ACTIVE' AND deletedAt IS NULL)`

#### `kpi_platform_schools_suspended` — Platform Suspended Schools
- **Owner Module:** `PLATFORM`
- **Scope:** `PLATFORM`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(School WHERE status = 'SUSPENDED' AND deletedAt IS NULL)`

#### `kpi_platform_module_adoption_rate` — Platform Average Module Adoption Rate
- **Owner Module:** `PLATFORM`
- **Scope:** `PLATFORM`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(COUNT(SchoolFeature WHERE isEnabled = true) / (COUNT(School) * totalRegistryModules)) * 100`

#### `kpi_platform_daily_active_users` — Platform Daily Active Users (DAU)
- **Owner Module:** `PLATFORM`
- **Scope:** `PLATFORM`
- **Measurement Period:** `DAILY`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(DISTINCT userId FROM User WHERE lastLogin >= NOW() - 24 HOURS AND isActive = true)`

#### `kpi_platform_support_sessions_active` — Platform Active Support Sessions
- **Owner Module:** `PLATFORM`
- **Scope:** `PLATFORM`
- **Measurement Period:** `REALTIME`
- **Metric Unit:** `count`
- **Mathematical Formula:** `COUNT(SupportSessions WHERE status = 'ACTIVE' AND expiresAt > NOW())`

#### `kpi_platform_api_error_rate` — Platform 24-Hour API Error Rate
- **Owner Module:** `PLATFORM`
- **Scope:** `PLATFORM`
- **Measurement Period:** `DAILY`
- **Metric Unit:** `percentage`
- **Mathematical Formula:** `(SUM(ssvm_http_requests_total{status=~'5..'}) / SUM(ssvm_http_requests_total)) * 100`
