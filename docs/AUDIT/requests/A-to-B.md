# Lane A requests to Lane B — Finance & Payments Integration

**Requested owner:** Lane B (finance/payments)  
**Requested by:** Lane A (DB spine)  
**Status:** OPEN — Lane A database migrations and helpers are applied and verified.

---

### 1. Trusted Payment Webhook Database Path
When the provider webhook handler is processed, use Lane A's exported `getTrustedPrisma()` (or `runWithTenantDatabaseTransaction(schoolId, ...)` once tenant is resolved) for tenant discovery and provider event lookup before a school context is known. Do not instantiate a new Prisma client in Lane B and do not fall back to the default application database URL. After the verified provider event yields a school and target payment, perform business writes in the callback of `runWithTenantDatabaseTransaction(schoolId, callback)` to guarantee RLS context and ledger posting atomicity. Record actor `SYSTEM:WEBHOOK`, provider event ID, request ID, and outcome through the audited path without unaudited super-admin bypasses.

---

### 2. Money Columns Migrated to Decimal(14, 2)
All monetary values in the database schema have been migrated from `Float` / `Int` to PostgreSQL `Decimal(14, 2)`:
- `Invoice`: `amount`, `amountPaid`, `remainingAmount`, `fineAmount`
- `FeeStructure`: `amount`
- `FineRule`: `fineAmount`
- `PaymentTransaction`: `amountPaid`
- `Salary`: `basicPay`, `allowances`, `deductions`, `netPay`
- `Scholarship`: `amount`
- `PurchaseOrder`: `totalAmount`
- `PurchaseOrderItem`: `unitPrice`, `totalPrice`
- `VendorInvoice`: `amount`
- `PurchaseRequest`: `totalEstAmount`
- `PurchaseRequestItem`: `estimatedPrice`
- `StockLedger`: `quantity`, `balanceAfter`
- `InventoryItem`: `quantity`, `reorderLevel`
- `InventoryStock`: `quantity`

#### Use `src/lib/money.ts` Helpers
Lane A has provided `src/lib/money.ts` with battle-tested arithmetic and serialization helpers:
- `toPaise(val: Decimal | number | string): number`
- `fromPaise(paise: number): Decimal`
- `toDecimal(val: Decimal | number | string): Decimal`
- `safeRound(val: Decimal | number, decimals?: number): Decimal`
- `sumDecimals(...vals: (Decimal | number | string)[]): Decimal`

Lane B route handlers and business logic should avoid raw floating-point operations (`+`, `-`, `*`, `/`) and instead use `Prisma.Decimal` methods (`add`, `sub`, `mul`, `div`) or the helpers in `src/lib/money.ts`.

#### JSON Response Serialization (Integer-Paise Contracts)
When returning monetary values over REST/JSON endpoints, format money fields as integer paise (or explicit 2-decimal formatted strings/numbers) rather than allowing default `Prisma.Decimal` object serialization.

---

### 3. FineRule Per-School Multi-Tenancy
- `FineRule` now includes `schoolId` with a composite unique index: `@@unique([schoolId, code])`.
- Fields added: `name`, `frequency`, `isActive`, `updatedAt`.
- All queries in Lane B finance routes must filter/scope by `schoolId`.

---

### 4. Bank Reconciliation (`BankStatementLine`)
- Model `BankStatementLine` has been created with fields: `id`, `schoolId`, `date`, `amount (Decimal 14,2)`, `reference`, `matchedLedgerEntryId`, `status (UNMATCHED / MATCHED / RECONCILED)`, `createdAt`, `updatedAt`.
- Linked via foreign key to `LedgerEntry` (`matchedLedgerEntryId`) and `School` (`schoolId`).
- Row Level Security is enabled and forced with policy `school_isolation`.
- Lane B reconciliation services can now perform matching queries directly through `tx.bankStatementLine`.

---

### 5. GoodsReceiptLine Model
- Model `GoodsReceiptLine` links `GoodsReceipt` with `PurchaseOrderItem`:
  - `goodsReceiptId`, `purchaseOrderItemId`, `receivedQuantity (Decimal 14,2)`, `location`, `notes`.
- `GoodsReceipt.grNumber` is now unique per school: `@@unique([schoolId, grNumber])`.

---

### 6. Default Chart of Accounts Seeding
- Lane A implemented `seedDefaultChartOfAccounts(schoolId: string, tx?: Prisma.TransactionClient)` in `src/lib/chartOfAccounts.ts`.
- Populates the standard Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses) with 9 standard accounts idempotently.
- Wired into school creation in `src/routes/schools.ts` and `src/routes/saas.ts`.

---

**Gate for Lane B Integration:**
- Real PostgreSQL tests running under restricted roles (`ssvm_app`, `ssvm_auth`).
- All finance test assertions updated to account for Decimal types and integer-paise calculations.

