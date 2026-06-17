-- GAP 1: Payment Idempotency Migration
-- Adds IdempotencyRecord table and composite constraints

-- 1. Create IdempotencyRecord table (DB-level fallback for Redis idempotency)
CREATE TABLE IF NOT EXISTS "idempotency_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- 2. Unique index on idempotency key for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_records_key_key" ON "idempotency_records"("key");

-- 3. Index on expiresAt for efficient cleanup sweeps
CREATE INDEX IF NOT EXISTS "idempotency_records_expiresAt_idx" ON "idempotency_records"("expiresAt");

-- 4. Composite unique constraint on payment_transactions
-- Prevents duplicate (invoiceId, transactionId) pairs
-- Use DO block to handle case where constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payment_transactions_invoiceId_transactionId_key'
    ) THEN
        ALTER TABLE "payment_transactions"
        ADD CONSTRAINT "payment_transactions_invoiceId_transactionId_key"
        UNIQUE ("invoiceId", "transactionId");
    END IF;
END $$;
