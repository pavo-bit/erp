-- DropIndex
DROP INDEX IF EXISTS "GoodsReceipt_grNumber_key";

-- DropIndex
DROP INDEX IF EXISTS "InventoryItem_sku_key";

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
ALTER COLUMN "reorderLevel" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "InventoryStock" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "PurchaseRequest" ALTER COLUMN "totalEstAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "PurchaseRequestItem" ALTER COLUMN "estimatedPrice" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "StockLedger" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "balanceAfter" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "VendorInvoice" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "fee_structures" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "fine_rules" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT 'LATE_FEE',
ADD COLUMN IF NOT EXISTS "frequency" TEXT NOT NULL DEFAULT 'ONCE',
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Late Payment Fine',
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fineAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "amountPaid" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "remainingAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "fineAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "payment_transactions" ALTER COLUMN "amountPaid" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "purchase_order_items" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "salaries" ALTER COLUMN "basicPay" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "allowances" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "deductions" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "netPay" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "scholarships" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT NOT NULL,
    "receivedQuantity" DECIMAL(14,2) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BankStatementLine" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "matchedLedgerEntryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryCategory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoodsReceiptLine_schoolId_idx" ON "GoodsReceiptLine"("schoolId");
CREATE INDEX IF NOT EXISTS "GoodsReceiptLine_goodsReceiptId_idx" ON "GoodsReceiptLine"("goodsReceiptId");
CREATE INDEX IF NOT EXISTS "GoodsReceiptLine_purchaseOrderItemId_idx" ON "GoodsReceiptLine"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankStatementLine_schoolId_idx" ON "BankStatementLine"("schoolId");
CREATE INDEX IF NOT EXISTS "BankStatementLine_schoolId_status_idx" ON "BankStatementLine"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "BankStatementLine_matchedLedgerEntryId_idx" ON "BankStatementLine"("matchedLedgerEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryCategory_schoolId_idx" ON "InventoryCategory"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryCategory_schoolId_name_key" ON "InventoryCategory"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoodsReceipt_schoolId_grNumber_key" ON "GoodsReceipt"("schoolId", "grNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_schoolId_sku_key" ON "InventoryItem"("schoolId", "sku");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fine_rules_schoolId_idx" ON "fine_rules"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "fine_rules_schoolId_code_key" ON "fine_rules"("schoolId", "code");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoodsReceipt_schoolId_fkey') THEN
    ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoodsReceiptLine_goodsReceiptId_fkey') THEN
    ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoodsReceiptLine_purchaseOrderItemId_fkey') THEN
    ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoodsReceiptLine_schoolId_fkey') THEN
    ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankStatementLine_matchedLedgerEntryId_fkey') THEN
    ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_matchedLedgerEntryId_fkey" FOREIGN KEY ("matchedLedgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankStatementLine_schoolId_fkey') THEN
    ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryCategory_schoolId_fkey') THEN
    ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_categoryId_fkey') THEN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_schoolId_fkey') THEN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryStock_schoolId_fkey') THEN
    ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Enable and force RLS on new tenant tables
ALTER TABLE "GoodsReceiptLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoodsReceiptLine" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation ON "GoodsReceiptLine";
CREATE POLICY school_isolation ON "GoodsReceiptLine" FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());

ALTER TABLE "BankStatementLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankStatementLine" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation ON "BankStatementLine";
CREATE POLICY school_isolation ON "BankStatementLine" FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());

ALTER TABLE "InventoryCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryCategory" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation ON "InventoryCategory";
CREATE POLICY school_isolation ON "InventoryCategory" FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());

-- Grant ssvm_app_group and ssvm_fixture_group access to new tables
GRANT ALL ON TABLE "GoodsReceiptLine" TO ssvm_app_group, ssvm_fixture_group;
GRANT ALL ON TABLE "BankStatementLine" TO ssvm_app_group, ssvm_fixture_group;
GRANT ALL ON TABLE "InventoryCategory" TO ssvm_app_group, ssvm_fixture_group;

-- Chart of accounts backfill for existing schools (idempotent)
INSERT INTO "LedgerAccount" ("id", "schoolId", "code", "name", "category", "type", "isActive", "createdAt")
SELECT 
  'la_' || substr(md5(s.id || a.code), 1, 20),
  s.id,
  a.code,
  a.name,
  a.category::"LedgerCategory",
  a.type::"LedgerAccountType",
  true,
  NOW()
FROM schools s
CROSS JOIN (
  VALUES
    ('1010-BANK', 'Bank Account', 'ASSET', 'BANK'),
    ('1020-CASH', 'Cash in Hand', 'ASSET', 'CASH'),
    ('1200-AR', 'Accounts Receivable (Students/Fees)', 'ASSET', 'RECEIVABLE'),
    ('2010-AP', 'Accounts Payable (Vendors)', 'LIABILITY', 'PAYABLE'),
    ('3010-RETAINED', 'Retained Earnings', 'EQUITY', 'REVENUE'),
    ('4000-TUIT', 'Tuition Fees Revenue', 'REVENUE', 'REVENUE'),
    ('4010-ADM', 'Admission Fees Revenue', 'REVENUE', 'REVENUE'),
    ('4020-FINE', 'Late Fines & Penalties Revenue', 'REVENUE', 'REVENUE'),
    ('4030-OTHER', 'Other Academic Revenue', 'REVENUE', 'REVENUE'),
    ('5010-SAL', 'Salaries & Wages Expense', 'EXPENSE', 'EXPENSE'),
    ('5020-GEN', 'General & Administrative Expense', 'EXPENSE', 'EXPENSE'),
    ('5030-MAINT', 'Repairs & Maintenance Expense', 'EXPENSE', 'EXPENSE'),
    ('5040-UTILITY', 'Utilities & Electricity Expense', 'EXPENSE', 'EXPENSE')
) AS a(code, name, category, type)
ON CONFLICT ("schoolId", "code") DO NOTHING;

-- Student -> User backfill for existing students without userId
DO $student_user_backfill$
DECLARE
  st RECORD;
  v_user_id text;
  v_email text;
BEGIN
  FOR st IN SELECT id, "schoolId", name, "admissionNo" FROM students WHERE "userId" IS NULL LOOP
    v_user_id := 'usr_' || substr(md5(st.id || clock_timestamp()::text), 1, 20);
    v_email := lower(regexp_replace(COALESCE(st."admissionNo", 'std_' || st.id), '[^a-zA-Z0-9]', '', 'g')) 
               || '_' || right(st."schoolId", 6) || '@student.school';
    
    IF EXISTS (SELECT 1 FROM users WHERE email = v_email) THEN
      v_email := lower(regexp_replace(COALESCE(st."admissionNo", 'std_' || st.id), '[^a-zA-Z0-9]', '', 'g')) 
                 || '_' || substr(md5(st.id), 1, 6) || '@student.school';
    END IF;

    INSERT INTO users (id, "schoolId", email, name, role, "passwordHash", "isActive", "createdAt", "updatedAt")
    VALUES (
      v_user_id,
      st."schoolId",
      v_email,
      COALESCE(st.name, 'Student'),
      'STUDENT',
      '$argon2id$v=19$m=65536,t=3,p=4$RESET_REQUIRED$RESET_REQUIRED',
      true,
      NOW(),
      NOW()
    );

    UPDATE students SET "userId" = v_user_id WHERE id = st.id;
  END LOOP;
END;
$student_user_backfill$;

-- Trusted audit & system log read policies for ADMIN_AUDIT
DROP POLICY IF EXISTS trusted_audit_logs_read ON audit_logs;
CREATE POLICY trusted_audit_logs_read ON audit_logs FOR SELECT TO ssvm_app_group
  USING (current_setting('app.trusted_purpose', true) = 'ADMIN_AUDIT');

DROP POLICY IF EXISTS trusted_system_logs_read ON system_logs;
CREATE POLICY trusted_system_logs_read ON system_logs FOR SELECT TO ssvm_app_group
  USING (current_setting('app.trusted_purpose', true) = 'ADMIN_AUDIT');
