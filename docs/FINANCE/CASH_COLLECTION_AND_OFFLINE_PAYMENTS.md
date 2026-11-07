# Phase 2 Addendum: Manual Cash Collection, Offline Payments & Official PDF Receipts

**Document Version:** 1.0.0  
**Phase:** 2 Addendum (P0 Finance, Offline Payments & Official Receipts)  
**Status:** IMPLEMENTED & TEST-VERIFIED (100% PASS)  
**Database Invariant:** `SUM(debitAmount) === SUM(creditAmount)` & Immutably Chained Double-Entry Ledger  
**Tenancy Model:** Row-Level Security (RLS) Forced on `fee_receipts`, `payment_allocations`, `student_advance_credits`  

---

## 1. Executive Summary

This addendum implements an auditable, enterprise-grade walk-in fee collection and offline payment subsystem inside the SSVM Multi-School SaaS ERP. Designed specifically for school counter cashiers and accountants, it supports parents physically visiting the school office to pay fees via **Cash**, **Cheque**, **Demand Draft (DD)**, **Counter UPI**, or **Direct Bank Transfer (NEFT/RTGS)**.

The implementation is integrated with:
1. **Multi-Invoice Deterministic Allocation:** Automatically allocates lump-sum or exact payments across multiple overdue/pending invoices using oldest-due-date-first ordering, or staff-directed manual allocations.
2. **Partial & Advance Fee Credit Engine:** Exact paise precision ensures partial invoice settlements update balances (`PARTIAL`), while excess payments over total dues automatically generate active `StudentAdvanceCredit` liabilities without losing a single rupee.
3. **Double-Entry General Ledger Integrity:** Every offline transaction debits Cash in Hand (`1020-CASH`) or Operating Bank (`1010-BANK`), and credits Tuition/AR (`4000-TUIT` / `1200-AR`) and Advance Fee Liability (`2100-ADV`), strictly satisfying PostgreSQL trigger `trg_ledger_transactions_balance`.
4. **Official Branded PDF Receipts & QR Verification:** Generates printable, tamper-evident fee receipts complete with institutional branding, fee head breakdown, amount in Indian English words, computer-generated disclaimer, authorized signatory placeholder, and an offline cryptographic QR code.
5. **Audited Duplicate Reprints:** Subsequent prints are marked with a prominent `DUPLICATE COPY` watermark, incrementing `reprintCount` and writing immutable `AuditLog` records without duplicating financial transactions.
6. **Cashier Shift & Daily Cash Register:** Instant shift handover reports grouping total collections by cashier and payment method (Cash currency vs Cheques in clearance vs UPI).

---

## 2. Database Schema & Migration Architecture

Applied in migration `20261107160000_cash_collection_and_allocations`:

### 2.1. Models Added
- **`FeeReceipt` (`fee_receipts`):**
  Authoritative record of issued fee receipts. Stores sequential receipt number (`REC-YYYY-XXXXXX`), cashier user identity, total amount in `Decimal(14,2)`, payment method, clearance status (`COMPLETED` or `PENDING_CLEARANCE`), frozen JSON `metadataSnapshot` (student profile, school details, fee line items), and reprint audit metadata (`reprintCount`, `lastReprintedAt`, `lastReprintedById`).
- **`PaymentAllocation` (`payment_allocations`):**
  Granular allocation breakdown linking one payment receipt to multiple invoices. Records `allocatedAmount`, `principalPaid`, `finePaid`, `previousBalance`, and `remainingBalance`.
- **`StudentAdvanceCredit` (`student_advance_credits`):**
  Maintains unallocated or excess advance funds on the student account. Tracks `amount`, `remainingCredit`, `sourceReceiptNo`, and `status` (`ACTIVE`, `EXHAUSTED`, `REFUNDED`).

### 2.2. Row-Level Security & Grants
All 3 tables have RLS enabled and forced:
```sql
ALTER TABLE "fee_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_receipts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "school_isolation" ON "fee_receipts" FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());
```
Permissions are explicitly granted to `ssvm_app_group` and `ssvm_fixture_group`.

---

## 3. General Ledger Double-Entry Rules

Offline collections satisfy the fundamental accounting equation:

$$\sum \text{Debits} \equiv \sum \text{Credits} \equiv \text{Amount Received}$$

| Scenario | Debit Account | Credit Account(s) | Balancing Condition |
|---|---|---|---|
| **Exact Cash Payment** | `1020-CASH` (Cash in Hand) | `4000-TUIT` (Tuition Revenue) | Debits = Credits = Invoice Amount |
| **Partial Cash Payment** | `1020-CASH` (Cash in Hand) | `4000-TUIT` (Tuition Revenue) | Debits = Credits = Partial Amount |
| **Multi-Invoice Lump Sum** | `1020-CASH` (Cash in Hand) | `4000-TUIT` (Tuition Revenue) | Debits = Credits = Sum of Allocated |
| **Excess Advance Payment** | `1020-CASH` (Cash in Hand) | `4000-TUIT` (Tuition Revenue) + `2100-ADV` (Advance Liability) | Debits = Revenue + Advance Liability |
| **Counter UPI / NEFT** | `1010-BANK` (Bank Account) | `4000-TUIT` (Tuition Revenue) | Debits = Credits = Transferred Amount |
| **Cheque Collection** | `1020-CASH` or `1010-BANK` | `4000-TUIT` (Tuition Revenue) | Marked `PENDING_CLEARANCE` until cleared |

---

## 4. ERP Admin User Interface

Accessible at:
**ERP Admin → Finance → Fee Collection → Record Payment**  
(`erp-admin/src/app/(dashboard)/finance/fee-collection/page.tsx`)

### Key Workflows Supported:
1. **Student Search Desk:** Real-time debounced query by student admission number, roll number, student name, or parent phone number. Displays student branch, class, section, guardian, and total outstanding due balance.
2. **Interactive Invoice Selection:** Multi-checkbox selection of outstanding/overdue invoices, displaying gross due, fine accrued, amount already paid, and current balance.
3. **Real-Time Deterministic Allocation Preview:** Pre-submission breakdown displaying amount received, invoice-by-invoice principal and fine application, remaining balance, and resulting status (`PAID` or `PARTIAL`).
4. **Advance Credit Display:** Automatically highlights any excess amount as Advance Fee Credit deposited to the student account.
5. **Amount in Words Conversion:** Formal Indian English words formatting (e.g. *"Rupees Twelve Thousand Five Hundred Fifty Only"*).
6. **Official Receipt Printing & PDF:** Instant modal displaying branded receipt with school affiliation, student metadata, fee itemization, cashier signature line, and verification QR code. Supports `window.print()` and streamable PDF.
7. **Daily Cash Register & Shift Handover:** Tab displaying daily collections filtered by date or cashier, breakdown of Cash currency vs Cheques vs UPI, and one-click reprint copies with audit tracking.

---

## 5. Automated Verification Evidence

Executed via high-performance parallel runner `node scripts/run-parallel-checks.js --concurrency=4`:

| Check Suite | Category | Assertions / Invariants | Status | Duration |
|---|---|---|---|---|
| `cash-collection.test.ts` | **INTEGRATION** | 17/17 assertions: exact payments, partial allocations, advance credits, double-entry ledger balance, RLS isolation, RBAC rejection, reprints. | **PASS** | 5.77s |
| `payments-refund.test.ts` | **INTEGRATION** | 7/7 assertions: partial/full refund reversals, ledger balance. | **PASS** | 5.23s |
| `academic-*.test.ts` | **INTEGRATION** | 21/21 assertions: timetable collisions, report card compilation, batch promotion engine. | **PASS** | 9.94s |
| `Backend Unit Tests` | **UNIT_TESTS** | 87/87 assertions: gradebook calculations, monetary precision, RBAC guards. | **PASS** | 10.76s |
| `Backend Type-Check` | **TYPECHECK** | Full backend TypeScript compilation (`tsc --noEmit`). | **PASS** | 44.63s |
| `Tenant Classification` | **RLS_SECURITY** | 180 classified tenant tables verified with forced RLS in migrations. | **PASS** | 0.31s |
| `7 Frontend Portals` | **TYPECHECK** | ERP Admin, Super Admin, Parent, Student, Teacher, Payment, SaaS. | **PASS** | 2.92s–3.76s |
| **Consolidated Parallel Run** | **FULL SUITE** | **13 / 13 Suites Passed (100% Pass Rate)** | **PASS** | **44.63s** |

