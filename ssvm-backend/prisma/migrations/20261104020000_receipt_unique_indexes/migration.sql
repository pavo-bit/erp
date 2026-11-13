-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "receiptNo" TEXT;

-- Report all existing school-scoped receipt collisions before enforcing uniqueness.
DO $$
DECLARE
  duplicate_rows TEXT;
BEGIN
  SELECT string_agg(
    format('invoices: schoolId=%s receiptNo=%s rows=%s', "schoolId", "receiptNo", row_count),
    E'\n' ORDER BY "schoolId", "receiptNo"
  )
  INTO duplicate_rows
  FROM (
    SELECT "schoolId", "receiptNo", COUNT(*) AS row_count
    FROM "invoices"
    WHERE "receiptNo" IS NOT NULL
    GROUP BY "schoolId", "receiptNo"
    HAVING COUNT(*) > 1
  ) AS collisions;

  SELECT concat_ws(E'\n', duplicate_rows, string_agg(
    format('payment_transactions: schoolId=%s receiptNo=%s rows=%s', "schoolId", "receiptNo", row_count),
    E'\n' ORDER BY "schoolId", "receiptNo"
  ))
  INTO duplicate_rows
  FROM (
    SELECT "schoolId", "receiptNo", COUNT(*) AS row_count
    FROM "payment_transactions"
    WHERE "receiptNo" IS NOT NULL
    GROUP BY "schoolId", "receiptNo"
    HAVING COUNT(*) > 1
  ) AS collisions;

  IF NULLIF(BTRIM(duplicate_rows), '') IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot enforce unique (schoolId, receiptNo); duplicate receipt rows found'
      USING DETAIL = duplicate_rows,
            HINT = 'Resolve each reported collision, then rerun this migration.';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_schoolId_receiptNo_key" ON "invoices"("schoolId", "receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_schoolId_receiptNo_key" ON "payment_transactions"("schoolId", "receiptNo");
