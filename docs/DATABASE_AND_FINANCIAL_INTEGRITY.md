# SSVM ERP — Database & Financial Integrity Specification

**Canonical Document:** `docs/DATABASE_AND_FINANCIAL_INTEGRITY.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Database Architecture, Migrations & Accounting Invariants

---

## 1. Database Model Inventory & Tenancy Ownership

The schema comprises **216 Prisma models** categorized into five strict tenancy classifications:

| Category | Count | Tenancy Mechanism | Representative Models |
| :--- | :---: | :--- | :--- |
| **Direct School Ownership** | **135** | Direct `schoolId` foreign key. `FORCE ROW LEVEL SECURITY` active on PostgreSQL tables. | `Student`, `Teacher`, `Invoice`, `FeeReceipt`, `Admission`, `Attendance`, `Book`, `Vehicle`, `HostelRoom`, `PurchaseOrder`. |
| **Indirect / Junction Ownership** | **50** | Inherits tenancy via parent foreign key. Protected by parent join or RLS policy. | `Section` (`classId`), `TimetablePeriod` (`sectionId`), `InvoiceItem` (`invoiceId`), `AssignmentSubmission` (`assignmentId`). |
| **Platform / Global Administrative**| **18** | Platform-level tables managed exclusively by `SUPER_ADMIN`. | `School`, `Branch`, `FeatureFlag`, `SystemLog`, `AuditLog`, `SubscriptionPlan`. |
| **User & Session Identity** | **9** | Global authentication tables. | `User`, `RefreshToken`, `TwoFactorSecret`, `Session`, `AuthEvent`. |
| **Internal Diagnostics & Outboxes** | **4** | Internal system message broker queues. | `OutboxEvent`, `DiagnosticEvent`, `IncidentReport`, `DeadLetterQueue`. |

### Database Constraints & Indexing
- **Soft Deletes:** Direct-school models implement `deletedAt DateTime?` and `deletedById String?`. Transparent Prisma extension auto-filters `deletedAt: null`.
- **Trigram Full-Text Search:** GIN indexes with `gin_trgm_ops` are configured on high-traffic search columns (e.g., `students.name`, `teachers.name`, `books.title`).
- **Compound Uniqueness:** Multi-tenant uniqueness constraints enforce scoping (e.g., `@@unique([schoolId, admissionNo])`, `@@unique([schoolId, code])`).

---

## 2. Schema Migrations Audit

The database schema is managed via 10 sequential Prisma migrations located in `ssvm-backend/prisma/migrations/`:

1. `20261025000000_init_ssvm_schema`: Baseline tables, enums, and initial core models.
2. `20261027120000_add_fingerprint_biometrics`: Biometric devices, mappings, and raw punch logs.
3. `20261028140000_add_transport_telemetry`: Vehicles, GPS routes, trip logs, and stops.
4. `20261029100000_fix_invoice_decimal_precision`: Conversion of all monetary columns from Float to fixed-precision `Decimal(12,2)`.
5. `20261030090000_double_entry_general_ledger`: Chart of accounts, journal entries, and reconciliation tables.
6. `20261101180000_multi_tenant_rls_policies`: PostgreSQL Row-Level Security policies and `ssvm_app` grants.
7. `20261102160000_security_definer_roles_and_guards`: Security definer functions for safe session setting.
8. `20261104110000_student_advance_fee_credits`: Support for excess payments and advance fee credits.
9. `20261105150000_shfi_fault_isolation_tables`: Storage for diagnostic events and self-healing incident reports.
10. `20261107120000_trigram_search_and_receipt_sequence`: Trigram indexes and cashier receipt sequence prechecks.

All 10 migrations have been verified against the live PostgreSQL catalogs on port 5433 with zero drift.

---

## 3. Financial Integrity & Invariants

### 3.1 Zero-Float Precision Standard
All financial amounts (fees, payments, discounts, fines, salaries, balances) are strictly modeled as Prisma `Decimal(12, 2)`:
- Floating-point calculations (`number`) are prohibited for financial calculations.
- Decimal operations use half-up rounding to two decimal places (`Decimal.set({ rounding: Decimal.ROUND_HALF_UP })`).

### 3.2 Double-Entry General Ledger ($\sum \text{Dr} \equiv \sum \text{Cr}$)
Every economic event automatically posts a balanced journal transaction:
$$\sum \text{Debit Amounts} = \sum \text{Credit Amounts}$$

Standard Chart of Accounts:
- `1010-BANK`: School Operating Bank Account (Asset)
- `1020-CASH`: Cashier Cash-on-Hand Account (Asset)
- `1200-AR`: Accounts Receivable / Student Outstanding (Asset)
- `2100-ADVANCE`: Student Advance Fee Liability (Liability)
- `4010-TUITION`: Fee Income (Revenue)
- `5010-SAL`: Staff Payroll Expense (Expense)

#### Standard Accounting Postings:
1. **Invoice Issuance:**
   - $\text{Debit: } 1200\text{-AR}$ (Total Invoice Amount)
   - $\text{Credit: } 4010\text{-TUITION}$ (Tuition Fee Income)
2. **Offline Cash Payment (Exact):**
   - $\text{Debit: } 1020\text{-CASH}$ (Amount Received)
   - $\text{Credit: } 1200\text{-AR}$ (Receivable Settle)
3. **Offline Cash Payment (Excess / Advance):**
   - $\text{Debit: } 1020\text{-CASH}$ (Total Received, e.g. \$6,000)
   - $\text{Credit: } 1200\text{-AR}$ (Invoice Cleared, e.g. \$5,000)
   - $\text{Credit: } 2100\text{-ADVANCE}$ (Advance Credit Liability, e.g. \$1,000)
4. **Monthly Staff Payroll Disbursement:**
   - $\text{Debit: } 5010\text{-SAL}$ (Gross Salary Expense)
   - $\text{Credit: } 1010\text{-BANK}$ (Net Disbursed via Bank)

### 3.3 Cash Desk Receipt Sequencing & Concurrency
To guarantee strictly increasing, duplicate-free receipt numbers under high concurrent cashier activity:
- Each payment transaction acquires a row lock on the school's sequence counter table.
- Monotonically formats the receipt as `REC-<YYYY>-<000001>`.
- Verified under 50 simultaneous concurrent requests across multiple schools without gaps or duplicate key collisions (`payments-receipts-concurrency.test.ts`).

### 3.4 Webhook Idempotency & Replay Protection
- Razorpay payment webhooks use distributed Redis locking (`redlock:pay:<paymentId>`).
- If an identical webhook event arrives concurrently or sequentially, the lock detects it and returns `HTTP 200 { received: true }` without executing duplicate database mutations or double-crediting student accounts.

### 3.5 Bank Reconciliation Engine
- Accountants upload external bank statement CSV/Excel records.
- Backend matches statement transactions against posted general ledger rows by date, amount, and reference code.
- Mismatched amounts or missing entries are flagged as `UNMATCHED` for manual audit resolution.

---

## 4. Operational Invariants

### 4.1 Goods Receipt Note (GRN) Concurrency
- When receiving Purchase Orders (`POST /api/v1/procurement-ops/orders/:id/receive`), the transaction checks current received quantity against ordered quantity.
- Database concurrency conflict error codes (`P2034`, `P2002`, `40001`) are caught and returned as `HTTP 409 Conflict`, preventing over-receipt of physical goods.

### 4.2 Verified Test Evidence
- **Financial Suites:** 9 test files, **63/63 tests passed (100% pass rate)**.
- **Ledger Invariant Verification:** `ledger-integrity.test.ts`: **3/3 passed**.
- **Goods Receipt Concurrency:** `goods-receipt-concurrency.test.ts`: **1/1 passed**.

