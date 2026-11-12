-- Migration: 20261112130000_admission_operational_handoff

-- 1. Enhance students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS "pen" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "religion" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "nationality" text DEFAULT 'Indian';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "motherTongue" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "locality" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "pincode" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "landmark" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "medicalInfo" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "emergencyPhone" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "previousSchool" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "previousBoard" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "previousClass" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "previousSession" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "previousRollNo" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tcNumber" text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tcDate" timestamp(3) without time zone;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tcStatus" text;

CREATE INDEX IF NOT EXISTS "students_pen_idx" ON students("pen");
CREATE INDEX IF NOT EXISTS "students_schoolId_locality_idx" ON students("schoolId", "locality");

-- 2. Enhance documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS "verificationStatus" text NOT NULL DEFAULT 'UPLOADED';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS "verifiedById" text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS "verifiedAt" timestamp(3) without time zone;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS "rejectionReason" text;

CREATE INDEX IF NOT EXISTS "documents_schoolId_ownerType_ownerId_idx" ON documents("schoolId", "ownerType", "ownerId");

-- 3. Normalized Student Guardians Junction Table
CREATE TABLE IF NOT EXISTS student_guardians (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  "studentId" text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "guardianId" text NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'FATHER',
  "isPrimary" boolean NOT NULL DEFAULT false,
  "isEmergencyContact" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_guardians_studentId_guardianId_key" ON student_guardians("studentId", "guardianId");
CREATE INDEX IF NOT EXISTS "student_guardians_schoolId_idx" ON student_guardians("schoolId");
CREATE INDEX IF NOT EXISTS "student_guardians_studentId_idx" ON student_guardians("studentId");
CREATE INDEX IF NOT EXISTS "student_guardians_guardianId_idx" ON student_guardians("guardianId");

-- 4. School Shift Batch Configuration Table
CREATE TABLE IF NOT EXISTS school_shifts (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  "applicableClasses" text NOT NULL,
  "startTime" text NOT NULL,
  "endTime" text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "school_shifts_schoolId_name_key" ON school_shifts("schoolId", name);
CREATE INDEX IF NOT EXISTS "school_shifts_schoolId_idx" ON school_shifts("schoolId");

-- 5. Student Academic Enrollment History Table
CREATE TABLE IF NOT EXISTS student_enrollments (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  "studentId" text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "sessionId" text NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  "classId" text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  "sectionId" text REFERENCES sections(id) ON DELETE SET NULL,
  "rollNo" text,
  "shiftId" text REFERENCES school_shifts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  "startDate" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_enrollments_studentId_sessionId_key" ON student_enrollments("studentId", "sessionId");
CREATE INDEX IF NOT EXISTS "student_enrollments_schoolId_idx" ON student_enrollments("schoolId");
CREATE INDEX IF NOT EXISTS "student_enrollments_studentId_idx" ON student_enrollments("studentId");
CREATE INDEX IF NOT EXISTS "student_enrollments_sessionId_idx" ON student_enrollments("sessionId");
CREATE INDEX IF NOT EXISTS "student_enrollments_classId_sectionId_idx" ON student_enrollments("classId", "sectionId");

-- 6. Facility Requests Operational Handoff Table
CREATE TABLE IF NOT EXISTS facility_requests (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  "studentId" text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "sessionId" text,
  "facilityType" text NOT NULL,
  status text NOT NULL DEFAULT 'REQUESTED',
  details text,
  "batchId" text,
  "reviewedById" text,
  "reviewedAt" timestamp(3) without time zone,
  notes text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "facility_requests_schoolId_facilityType_status_idx" ON facility_requests("schoolId", "facilityType", status);
CREATE INDEX IF NOT EXISTS "facility_requests_studentId_idx" ON facility_requests("studentId");

-- 7. Row Level Security Tenant Isolation
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_guardians' AND policyname = 'school_isolation') THEN
    ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
    ALTER TABLE student_guardians FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON student_guardians USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'school_shifts' AND policyname = 'school_isolation') THEN
    ALTER TABLE school_shifts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE school_shifts FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON school_shifts USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_enrollments' AND policyname = 'school_isolation') THEN
    ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE student_enrollments FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON student_enrollments USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facility_requests' AND policyname = 'school_isolation') THEN
    ALTER TABLE facility_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE facility_requests FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON facility_requests USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;
END $$;

-- 8. Grant privileges to application database roles
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_app') THEN
    GRANT ALL PRIVILEGES ON TABLE student_guardians TO ssvm_app;
    GRANT ALL PRIVILEGES ON TABLE school_shifts TO ssvm_app;
    GRANT ALL PRIVILEGES ON TABLE student_enrollments TO ssvm_app;
    GRANT ALL PRIVILEGES ON TABLE facility_requests TO ssvm_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_fixture') THEN
    GRANT ALL PRIVILEGES ON TABLE student_guardians TO ssvm_fixture;
    GRANT ALL PRIVILEGES ON TABLE school_shifts TO ssvm_fixture;
    GRANT ALL PRIVILEGES ON TABLE student_enrollments TO ssvm_fixture;
    GRANT ALL PRIVILEGES ON TABLE facility_requests TO ssvm_fixture;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_trusted') THEN
    GRANT ALL PRIVILEGES ON TABLE student_guardians TO ssvm_trusted;
    GRANT ALL PRIVILEGES ON TABLE school_shifts TO ssvm_trusted;
    GRANT ALL PRIVILEGES ON TABLE student_enrollments TO ssvm_trusted;
    GRANT ALL PRIVILEGES ON TABLE facility_requests TO ssvm_trusted;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_auth') THEN
    GRANT ALL PRIVILEGES ON TABLE student_guardians TO ssvm_auth;
    GRANT ALL PRIVILEGES ON TABLE school_shifts TO ssvm_auth;
    GRANT ALL PRIVILEGES ON TABLE student_enrollments TO ssvm_auth;
    GRANT ALL PRIVILEGES ON TABLE facility_requests TO ssvm_auth;
  END IF;
END $$;
