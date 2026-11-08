-- Migration: 20261108173000_library_enterprise_and_borrowing_history

-- 1. Enhance Book catalogue
ALTER TABLE books ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'English';
ALTER TABLE books ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS "edition" text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS "publicationYear" integer;
ALTER TABLE books ADD COLUMN IF NOT EXISTS "coverImage" text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS "isArchived" boolean NOT NULL DEFAULT false;

-- 2. Physical Book Copies
CREATE TABLE IF NOT EXISTS book_copies (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  "bookId" text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  "copyNumber" integer NOT NULL DEFAULT 1,
  "accessionNumber" text NOT NULL,
  barcode text,
  "shelfLocation" text,
  condition text NOT NULL DEFAULT 'GOOD',
  status text NOT NULL DEFAULT 'AVAILABLE',
  "acquiredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
  price numeric(10, 2),
  notes text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "book_copies_schoolId_accessionNumber_key" ON book_copies("schoolId", "accessionNumber");
CREATE INDEX IF NOT EXISTS "book_copies_schoolId_status_idx" ON book_copies("schoolId", status);
CREATE INDEX IF NOT EXISTS "book_copies_bookId_idx" ON book_copies("bookId");

-- 3. Borrowing Policies
CREATE TABLE IF NOT EXISTS borrowing_policies (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  "targetGroup" text NOT NULL DEFAULT 'STUDENT',
  "maxActiveBooks" integer NOT NULL DEFAULT 3,
  "maxDurationDays" integer NOT NULL DEFAULT 14,
  "durationUnit" text NOT NULL DEFAULT 'CALENDAR_DAYS',
  "renewalAllowance" boolean NOT NULL DEFAULT true,
  "maxRenewalCount" integer NOT NULL DEFAULT 2,
  "renewalDurationDays" integer NOT NULL DEFAULT 7,
  "dailyFineRate" numeric(10, 2) NOT NULL DEFAULT 5.00,
  "gracePeriodDays" integer NOT NULL DEFAULT 2,
  "countHolidays" boolean NOT NULL DEFAULT false,
  "blockOverdueBorrowing" boolean NOT NULL DEFAULT true,
  "blockFineBorrowing" boolean NOT NULL DEFAULT true,
  "allowReservations" boolean NOT NULL DEFAULT true,
  "isDefault" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "borrowing_policies_schoolId_targetGroup_idx" ON borrowing_policies("schoolId", "targetGroup");

-- 4. Book Requests
CREATE TABLE IF NOT EXISTS book_requests (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  "bookId" text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  "studentId" text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "requestedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status text NOT NULL DEFAULT 'SUBMITTED',
  "reviewNotes" text,
  "reviewedById" text,
  "reviewedAt" timestamp(3) without time zone,
  "expiresAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "book_requests_schoolId_status_idx" ON book_requests("schoolId", status);
CREATE INDEX IF NOT EXISTS "book_requests_studentId_idx" ON book_requests("studentId");
CREATE INDEX IF NOT EXISTS "book_requests_bookId_idx" ON book_requests("bookId");

-- 5. Book Issues enhancement
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "copyId" text REFERENCES book_copies(id) ON DELETE SET NULL;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "issueCardNumber" text;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "fineWaived" boolean NOT NULL DEFAULT false;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "fineWaiveReason" text;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "conditionOnReturn" text;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "damageNotes" text;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "returnNotes" text;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "issuedById" text;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "receivedById" text;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "renewalCount" integer NOT NULL DEFAULT 0;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "maxRenewalsAllowed" integer NOT NULL DEFAULT 2;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "overdueDaysCalculated" integer NOT NULL DEFAULT 0;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "policySnapshot" jsonb;
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "book_issues_copyId_idx" ON book_issues("copyId");

-- 6. Book Renewals
CREATE TABLE IF NOT EXISTS book_renewals (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  "issueId" text NOT NULL REFERENCES book_issues(id) ON DELETE CASCADE,
  "renewalNumber" integer NOT NULL,
  "renewalDate" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousDueDate" timestamp(3) without time zone NOT NULL,
  "newDueDate" timestamp(3) without time zone NOT NULL,
  "renewedById" text,
  reason text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "book_renewals_issueId_idx" ON book_renewals("issueId");
CREATE INDEX IF NOT EXISTS "book_renewals_schoolId_idx" ON book_renewals("schoolId");

-- 7. Library Audit Events
CREATE TABLE IF NOT EXISTS library_audit_events (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  action text NOT NULL,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "performedBy" text NOT NULL,
  "actorRole" text,
  details jsonb,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "library_audit_events_schoolId_action_idx" ON library_audit_events("schoolId", action);
CREATE INDEX IF NOT EXISTS "library_audit_events_entityId_idx" ON library_audit_events("entityId");

-- 8. Row Level Security Tenant Isolation
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_copies' AND policyname = 'school_isolation') THEN
    ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE book_copies FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON book_copies USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrowing_policies' AND policyname = 'school_isolation') THEN
    ALTER TABLE borrowing_policies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE borrowing_policies FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON borrowing_policies USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_requests' AND policyname = 'school_isolation') THEN
    ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE book_requests FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON book_requests USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_renewals' AND policyname = 'school_isolation') THEN
    ALTER TABLE book_renewals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE book_renewals FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON book_renewals USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'library_audit_events' AND policyname = 'school_isolation') THEN
    ALTER TABLE library_audit_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE library_audit_events FORCE ROW LEVEL SECURITY;
    CREATE POLICY school_isolation ON library_audit_events USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id());
  END IF;
END $$;

