-- Password-setup (invitation) tokens for school-scoped onboarding.
CREATE TABLE IF NOT EXISTS "password_setup_tokens" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_setup_tokens_tokenHash_key" ON "password_setup_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "password_setup_tokens_schoolId_idx" ON "password_setup_tokens"("schoolId");
CREATE INDEX IF NOT EXISTS "password_setup_tokens_userId_idx" ON "password_setup_tokens"("userId");

ALTER TABLE "password_setup_tokens"
  ADD CONSTRAINT "password_setup_tokens_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_setup_tokens"
  ADD CONSTRAINT "password_setup_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS enabled + forced, school-scoped.
ALTER TABLE "password_setup_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_setup_tokens" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_isolation" ON "password_setup_tokens";
CREATE POLICY "school_isolation" ON "password_setup_tokens"
  FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());