# Phase 2: Double-Entry Accounting & General Ledger Integrity

**Document Version:** 1.0.0  
**Phase:** 2 (P0 Finance, Payments, and Accounting)  
**Status:** IMPLEMENTED & TEST-VERIFIED  
**Database Invariant:** `SUM(debitAmount) === SUM(creditAmount)` & Posted Record Immutability  

---

## 1. Accounting Architecture & Chart of Accounts

Every school onboarded to SSVM ERP is provisioned with a standardized Chart of Accounts (`DEFAULT_CHART_OF_ACCOUNTS`) spanning the five fundamental account categories:

| Code Range | Account Category | Account Type | Standard Accounts |
|---|---|---|---|
| **1000–1999** | **ASSET** | `CASH`, `BANK`, `RECEIVABLE` | `1000-CASH` (Cash in Hand)<br>`1010-BANK` (Operating Bank Account)<br>`1200-AR` (Accounts Receivable / Tuition) |
| **2000–2999** | **LIABILITY** | `PAYABLE`, `CURRENT_LIABILITY` | `2000-AP` (Accounts Payable / Vendors)<br>`2100-ADV` (Student Advance Fee Deposits) |
| **3000–3999** | **EQUITY** | `EQUITY` | `3000-RE` (Retained Earnings / Corpus Fund) |
| **4000–4999** | **REVENUE** | `REVENUE` | `4000-TUIT` (Tuition Fee Revenue)<br>`4010-TERM` (Term Fee Revenue)<br>`4020-FINE` (Late Fee Penalty Revenue) |
| **5000–5999** | **EXPENSE** | `EXPENSE` | `5000-PROC` (General Procurement Expense)<br>`5010-SAL` (Salaries & Staff Payroll)<br>`5090-MISC` (Bank Fees & Miscellaneous) |

---

## 2. Invariants Enforced at the PostgreSQL Database Layer

### 2.1. Balanced Entry Constraint (`trg_ledger_transactions_balance`)
Migration `20261101145000_ledger_integrity` establishes a database trigger on `ledger_transactions`:
```sql
CREATE OR REPLACE FUNCTION check_ledger_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_debit_total numeric(18,2);
  v_credit_total numeric(18,2);
BEGIN
  IF NEW.status = 'POSTED' THEN
    SELECT COALESCE(SUM("debitAmount"), 0), COALESCE(SUM("creditAmount"), 0)
    INTO v_debit_total, v_credit_total
    FROM ledger_entries
    WHERE "transactionId" = NEW.id;

    IF v_debit_total <> v_credit_total THEN
      RAISE EXCEPTION 'Ledger transaction % is unbalanced: debits (%) <> credits (%)',
        NEW.id, v_debit_total, v_credit_total;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
**Database Enforcement:** Any attempt to commit an unbalanced transaction (`debits <> credits`) causes the database to abort with an exception.

### 2.2. Posted Immutability Constraint (`trg_ledger_transactions_immutable`)
- Any `UPDATE` or `DELETE` executed against posted rows in `ledger_transactions` or `ledger_entries` is rejected at the engine level with:
  `"Posted ledger records are immutable; create a reversal transaction."`
- Corrections are made exclusively via reversing entries (Audit trail preserved).

---

## 3. Transaction Posting Lifecycle

```
[ Financial Event: Payment / Refund / Goods Receipt ]
                        │
                        ▼
[ LedgerService.postTransaction ]
  1. Validates double-entry balance in integer paise:
     totalDebitsPaise === totalCreditsPaise
  2. Acquires latest transaction hash (SHA-256 hash chaining)
  3. Increments per-school sequence counter: LED-YYYY-XXXXXX
  4. Creates LedgerTransaction + LedgerEntries atomically within tenant transaction
  5. Creates FinancialAudit log record
                        │
                        ▼
[ PostgreSQL Commit ] -> Evaluates trg_ledger_transactions_balance -> Commits
```

---

## 4. Verified Test Evidence

| Test Suite | File | Assertions Verified | Status |
|---|---|---|---|
| **Ledger Invariants** | `src/tests/db/ledger-integrity.test.ts` | 1. Accepts posted transaction only when entries balance.<br>2. Rejects unbalanced transaction at commit.<br>3. Rejects UPDATE and DELETE on posted records. | **PASS (3/3)** |
| **Money Invariants** | `src/tests/unit/money-invariants.test.ts` | 1. Zero floating point roundoff on fractional paise.<br>2. Exact Decimal representation. | **PASS (4/4)** |
| **Refund Reversals** | `src/tests/api/payments-refund.test.ts` | Reversing journal entries balance (`debits == credits == refundAmount`). | **PASS (7/7)** |
