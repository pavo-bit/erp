-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "receiptNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_schoolId_receiptNo_key" ON "invoices"("schoolId", "receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_schoolId_receiptNo_key" ON "payment_transactions"("schoolId", "receiptNo");
