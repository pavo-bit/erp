-- Enable all ERP Modules in Feature Flags and School Features for all schools

INSERT INTO feature_flags (id, code, name, description, category, "defaultEnabled", "isActive", "createdAt", "updatedAt")
VALUES
  ('ff_academics', 'ACADEMICS', 'Academics & Curriculum', 'Core academic classes, sessions, subjects, timetable', 'CORE_ACADEMIC', true, true, NOW(), NOW()),
  ('ff_finance', 'FINANCE', 'Fee Management & General Ledger', 'Invoices, fee collection, scholarships, double-entry accounting', 'FINANCE', true, true, NOW(), NOW()),
  ('ff_exams', 'EXAMS', 'Examinations & Report Cards', 'Assessments, marks, GPA computation, report cards', 'CORE_ACADEMIC', true, true, NOW(), NOW()),
  ('ff_hr_payroll', 'HR_PAYROLL', 'Human Resources & Staff Payroll', 'Staff directory, leave tracking, monthly payroll, salary slips', 'OPERATIONS', true, true, NOW(), NOW()),
  ('ff_transport', 'TRANSPORT', 'Transport & Real-Time Bus Fleet GPS', 'Fleet management, vehicle tracking, GPS telemetry, live parent tracking', 'OPERATIONS', true, true, NOW(), NOW()),
  ('ff_library', 'LIBRARY', 'Library & Asset Circulation', 'Book catalog, circulation, borrowing history, overdue fine integration', 'OPERATIONS', true, true, NOW(), NOW()),
  ('ff_hostel', 'HOSTEL', 'Hostel & Dormitory Management', 'Dorm allocations, room tracking, student occupancy', 'OPERATIONS', true, true, NOW(), NOW()),
  ('ff_communications', 'COMMUNICATIONS', 'Multi-Channel Communications & Broadcasts', 'Outbox relay, notification templates, SMS, email announcements', 'COMMUNICATION', true, true, NOW(), NOW()),
  ('ff_biometric', 'BIOMETRIC_ATTENDANCE', 'Biometric & Fingerprint Staff Attendance', 'Terminal hardware registry, mapped punches, morning shift rules', 'SECURITY', true, true, NOW(), NOW()),
  ('ff_admissions', 'ADMISSIONS', 'Online Admissions & Student Inquiries', 'Online applicant workflow, merit review, automated student conversion', 'GOVERNANCE', true, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET "defaultEnabled" = true, "isActive" = true, "name" = EXCLUDED.name, "description" = EXCLUDED.description;

-- Enable for all existing schools
INSERT INTO school_features (id, "schoolId", "featureId", "isEnabled", "enabledBy", "createdAt", "updatedAt")
SELECT
  'sf_' || SUBSTRING(s.id, 1, 10) || '_' || ff.id,
  s.id,
  ff.id,
  true,
  'SUPER_ADMIN',
  NOW(),
  NOW()
FROM schools s
CROSS JOIN feature_flags ff
ON CONFLICT ("schoolId", "featureId") DO UPDATE SET "isEnabled" = true, "updatedAt" = NOW();

