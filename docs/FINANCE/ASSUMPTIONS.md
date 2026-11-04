# Finance Architecture & Accounting Assumptions

This document records the foundational financial domain rules and architectural assumptions implemented across the SSVM finance engine for owner and audit review.

---

## 1. Monetary Representation & Rounding Rules
- **Paise Precision**: All monetary values are calculated in integer paise ($1\text{ INR} = 100\text{ paise}$) internally using `toPaise()` and `fromPaise()` to eliminate IEEE 754 floating-point inaccuracies.
- **Database Decimal Storage**: Persisted monetary fields are stored strictly as PostgreSQL `DECIMAL(14, 2)`.
- **Prohibition of Floating Point Math**: Direct JavaScript arithmetic via `parseFloat()`, `parseInt()`, or `Number()` on monetary values is prohibited across financial routes and services (`payments.ts`, `invoices.ts`, `ledger.service.ts`, `BankReconciliationService.ts`).
- **Rounding Strategy**: Conversions between Decimal and minor units round half-up at the paise boundary.

---

## 2. Invoicing, Overdue Statuses & Late Fine Engine
- **Eligible Overdue Statuses**: Late fines evaluate invoices with status `PENDING`, `PARTIAL`, or `OVERDUE`. Settled (`PAID`) or voided (`CANCELLED`, `VOID`) invoices are strictly excluded.
- **Grace Period**: Fines are assessed only if $\text{current\_time} > \text{dueDate} + (\text{graceDays} \times 86400000\text{ ms})$. Invoices within the grace period incur 0 fine.
- **Rule Prerequisite (No Hardcoded Fallbacks)**: If a school has no active `FineRule` configured, the engine performs no mutations and safely reports `{ success: true, count: 0, message: "No active fine rule configured for school" }`.
- **Calculation Modes**:
  - **Fixed Amount**: Defined by `fineRule.fineAmount` per evaluation period.
  - **Percentage**: Calculated as `(invoice.amount * fineRule.fineAmount) / 100` rounded to 2 decimal places.
- **Frequency Modifiers**:
  - `ONCE`: Assessed exactly once past the grace period.
  - `DAILY`: Scaled linearly by the number of overdue days beyond the grace period.
  - `MONTHLY`: Scaled by the number of 30-day overdue intervals beyond the grace period.
- **Cap Invariant**: The cumulative fine amount on any invoice cannot exceed the original invoice base amount ($\text{fineAmount} \le \text{amount}$).
- **Idempotency**: Repeated executions within the same overdue period do not duplicate or incrementally inflate fines; only changes in overdue intervals or unapplied amounts produce deltas.

---

## 3. Sequential Receipt & Goods Receipt Numbering
- **Payment Receipts**:
  - Format: `REC-{YYYY}-{SEQ:6}` (e.g. `REC-2026-000042`), where `YYYY` is the current financial calendar year.
  - Sequence counters are tracked per-school and financial year using `SequenceCounter` (`schoolId`, key `RECEIPT_{YYYY}`).
  - Generation occurs atomically within the payment transaction under serializable isolation, preventing collision or gaps.
  - Unique constraint `(schoolId, receiptNo)` is enforced on both `invoices` and `payment_transactions`.
- **Goods Receipts (GRN)**:
  - Format: `GR-{YYYY}-{SEQ:6}`.
  - Generated inside the same transaction as PO line updates, inventory stock adjustments, and stock ledger entries.
  - Unique constraint `(schoolId, grNumber)` is enforced on `GoodsReceipt`.

---

## 4. Payment Integrity & Webhook Error Classification
- **Error Classification**:
  - **Permanent Errors** (Unknown order, missing invoice, currency mismatch, amount mismatch, already settled, overpayment attempt):
    - Acknowledged with HTTP 200 so the gateway does not retry indefinitely.
    - Logged with `logger.error` and persisted to `system_logs` (`PAYMENTS_WEBHOOK_PERMANENT_ERROR`) for operations inspection.
    - Zero mutations made to invoices or ledgers.
  - **Transient Errors** (Database connectivity, Redis timeout, serialization deadlock):
    - Return HTTP 500 so gateway webhooks are retried with exponential backoff.
- **Scoped Idempotency**:
  - Webhooks first resolve `schoolId` via `resolve_payment_school(orderId)`.
  - Redis distributed locking is strictly scoped per school: `IdempotencyService.acquireLock(schoolId, idempotencyKey)`.
  - Global `"system"` scope is eliminated to prevent cross-tenant lock serialization.
- **Constraint Matching**:
  - Prisma error `P2002` is treated as duplicate idempotent submission only when targeting `idempotencyKey` or `gatewayPaymentId`. Unrelated schema constraint violations fail loudly as 500.
- **Out-of-Order Delivery**:
  - If `payment.failed` arrives after `payment.captured` has succeeded, the terminal `SUCCESS` state, receipt, and ledger postings are preserved; the late failure event is safely ignored.

---

## 5. Double-Entry General Ledger & Invariant Guarantees
- **Self-Balancing Invariant**: Every ledger transaction requires $\sum \text{Debits} = \sum \text{Credits}$ in exact paise integer terms ($\text{totalDebitsPaise} = \text{totalCreditsPaise}$). Imbalanced transactions throw an invariant error before database submission.
- **Chart of Accounts Validation**: If required payment accounts (`1010-BANK`, `4000-TUIT` / `1200-AR`) are not configured and cannot be established, requests fail with HTTP 422 and machine-readable error code `CHART_OF_ACCOUNTS_NOT_CONFIGURED`.
- **Hash-Chaining**: Ledger transactions link to the immediate predecessor via cryptographic SHA-256 hash chaining to detect tampering or out-of-order manipulation.

---

## 6. Bank Reconciliation Settlement Tolerance
- **Matching Tolerance**: Automated bank reconciliation requires matching settlement amounts with a tolerance of 0.00 minor units. Partial or mismatched amounts are flagged for manual review with status `FAILED`.
- **Status Isolation**: Only transactions with status `SUCCESS` are eligible for matching against bank statement credit lines.

