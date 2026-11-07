-- CreateTable
CREATE TABLE "fee_receipts" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "paymentTransactionId" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "cashierName" TEXT NOT NULL,
    "instrumentNo" TEXT,
    "instrumentDate" TIMESTAMP(3),
    "issuingBank" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataSnapshot" JSONB,
    "reprintCount" INTEGER NOT NULL DEFAULT 0,
    "lastReprintedAt" TIMESTAMP(3),
    "lastReprintedById" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "paymentTransactionId" TEXT,
    "invoiceId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(14,2) NOT NULL,
    "principalPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "finePaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "previousBalance" DECIMAL(14,2) NOT NULL,
    "remainingBalance" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_advance_credits" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "remainingCredit" DECIMAL(14,2) NOT NULL,
    "sourceReceiptNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_advance_credits_pkey" PRIMARY KEY ("id")
);

-- Indexes for fee_receipts
CREATE UNIQUE INDEX "fee_receipts_schoolId_receiptNo_key" ON "fee_receipts"("schoolId", "receiptNo");
CREATE INDEX "fee_receipts_schoolId_studentId_idx" ON "fee_receipts"("schoolId", "studentId");
CREATE INDEX "fee_receipts_schoolId_paidAt_idx" ON "fee_receipts"("schoolId", "paidAt");
CREATE INDEX "fee_receipts_schoolId_cashierId_idx" ON "fee_receipts"("schoolId", "cashierId");
CREATE INDEX "fee_receipts_schoolId_paymentMethod_idx" ON "fee_receipts"("schoolId", "paymentMethod");

-- Indexes for payment_allocations
CREATE INDEX "payment_allocations_schoolId_invoiceId_idx" ON "payment_allocations"("schoolId", "invoiceId");
CREATE INDEX "payment_allocations_receiptId_idx" ON "payment_allocations"("receiptId");
CREATE INDEX "payment_allocations_paymentTransactionId_idx" ON "payment_allocations"("paymentTransactionId");

-- Indexes for student_advance_credits
CREATE INDEX "student_advance_credits_schoolId_studentId_status_idx" ON "student_advance_credits"("schoolId", "studentId", "status");

-- AddForeignKey
ALTER TABLE "fee_receipts" ADD CONSTRAINT "fee_receipts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_receipts" ADD CONSTRAINT "fee_receipts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_receipts" ADD CONSTRAINT "fee_receipts_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "fee_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_advance_credits" ADD CONSTRAINT "student_advance_credits_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_advance_credits" ADD CONSTRAINT "student_advance_credits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security
ALTER TABLE "fee_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_receipts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_isolation" ON "fee_receipts";
CREATE POLICY "school_isolation" ON "fee_receipts" FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());

ALTER TABLE "payment_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_allocations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_isolation" ON "payment_allocations";
CREATE POLICY "school_isolation" ON "payment_allocations" FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());

ALTER TABLE "student_advance_credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_advance_credits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_isolation" ON "student_advance_credits";
CREATE POLICY "school_isolation" ON "student_advance_credits" FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());

-- Role Grants
GRANT ALL ON TABLE "fee_receipts" TO ssvm_app_group, ssvm_fixture_group;
GRANT ALL ON TABLE "payment_allocations" TO ssvm_app_group, ssvm_fixture_group;
GRANT ALL ON TABLE "student_advance_credits" TO ssvm_app_group, ssvm_fixture_group;

