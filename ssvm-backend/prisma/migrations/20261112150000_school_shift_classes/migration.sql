-- Migration: 20261112150000_school_shift_classes
-- Purpose: Institution-Specific, Session-Aware School Shift Configuration with Normalized Class Mappings and PostgreSQL 16 RLS

-- 1. Alter school_shifts with session-awareness, versioning, and publication lifecycle
ALTER TABLE "school_shifts" ALTER COLUMN "applicableClasses" DROP NOT NULL;
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "configurationVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "publicationStatus" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "effectiveTo" TIMESTAMP(3);
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "publishedById" TEXT;
ALTER TABLE "school_shifts" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- Foreign key to academic_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'school_shifts_sessionId_fkey'
  ) THEN
    ALTER TABLE "school_shifts" ADD CONSTRAINT "school_shifts_sessionId_fkey" 
      FOREIGN KEY ("sessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Update unique constraints: drop old (schoolId, name) and create (schoolId, sessionId, name)
DROP INDEX IF EXISTS "school_shifts_schoolId_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "school_shifts_schoolId_sessionId_name_key" ON "school_shifts"("schoolId", "sessionId", "name");
CREATE INDEX IF NOT EXISTS "school_shifts_sessionId_idx" ON "school_shifts"("sessionId");

-- 2. Create normalized school_shift_classes table
CREATE TABLE IF NOT EXISTS "school_shift_classes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_shift_classes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "school_shift_classes_schoolId_sessionId_classId_key" UNIQUE ("schoolId", "sessionId", "classId"),
    CONSTRAINT "school_shift_classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "school_shift_classes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "school_shift_classes_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "school_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "school_shift_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "school_shift_classes_schoolId_idx" ON "school_shift_classes"("schoolId");
CREATE INDEX IF NOT EXISTS "school_shift_classes_sessionId_idx" ON "school_shift_classes"("sessionId");
CREATE INDEX IF NOT EXISTS "school_shift_classes_shiftId_idx" ON "school_shift_classes"("shiftId");
CREATE INDEX IF NOT EXISTS "school_shift_classes_classId_idx" ON "school_shift_classes"("classId");

-- 3. Alter student_enrollments with shiftVersion
ALTER TABLE "student_enrollments" ADD COLUMN IF NOT EXISTS "shiftVersion" INTEGER DEFAULT 1;

-- 4. Safe Backfill for existing school_shifts
-- Associate shifts with current active session if sessionId is NULL
UPDATE "school_shifts" s
SET "sessionId" = sub.id
FROM (
    SELECT id, "schoolId"
    FROM "academic_sessions"
    WHERE "isCurrent" = true
) sub
WHERE s."schoolId" = sub."schoolId" AND s."sessionId" IS NULL;

-- Fallback to the latest session for institutions where isCurrent is false
UPDATE "school_shifts" s
SET "sessionId" = sub.id
FROM (
    SELECT DISTINCT ON ("schoolId") id, "schoolId"
    FROM "academic_sessions"
    ORDER BY "schoolId", "startDate" DESC
) sub
WHERE s."schoolId" = sub."schoolId" AND s."sessionId" IS NULL;

-- Backfill normalized class mappings from applicableClasses
INSERT INTO "school_shift_classes" ("id", "schoolId", "sessionId", "shiftId", "classId", "isActive", "createdAt", "updatedAt")
SELECT 
    'ssc_' || md5(s.id || '_' || c.id) AS id,
    s."schoolId",
    s."sessionId",
    s.id AS "shiftId",
    c.id AS "classId",
    true AS "isActive",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "school_shifts" s
CROSS JOIN LATERAL unnest(string_to_array(s."applicableClasses", ',')) AS raw_class_name
JOIN "classes" c ON c."schoolId" = s."schoolId" 
                AND c."sessionId" = s."sessionId"
                AND LOWER(TRIM(c.name)) = LOWER(TRIM(raw_class_name))
WHERE s."sessionId" IS NOT NULL
  AND s."applicableClasses" IS NOT NULL
ON CONFLICT ("schoolId", "sessionId", "classId") DO NOTHING;

-- 5. PostgreSQL 16 Row Level Security (RLS) Enablement & Permissions
ALTER TABLE "school_shift_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school_shift_classes" FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'school_shift_classes' 
      AND policyname = 'school_shift_classes_school_isolation'
  ) THEN
    CREATE POLICY school_shift_classes_school_isolation ON "school_shift_classes"
      FOR ALL USING ("schoolId" = current_setting('app.current_school_id', true));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON "school_shift_classes" TO ssvm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "school_shift_classes" TO ssvm_fixture;
GRANT SELECT, INSERT, UPDATE, DELETE ON "school_shift_classes" TO ssvm_trusted;
GRANT SELECT, INSERT, UPDATE, DELETE ON "school_shift_classes" TO ssvm_auth;
