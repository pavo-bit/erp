# Phase 2: Payment Webhooks & Sequential Receipts

**Document Version:** 1.0.0  
**Phase:** 2 (P0 Finance, Payments, and Accounting)  
**Status:** IMPLEMENTED & STRESS-TESTED  
**Key Invariants:** Atomic Receipt Generation, Webhook Idempotency, Error Classification  

---

## 1. Sequential Receipt Numbering Architecture

Receipt numbers must never be generated non-deterministically (e.g. using `REC-${Date.now()}`), which risks duplicates under high concurrency and fails institutional audit standards.

### 1.1. Atomic Sequence Generation
Receipt numbers are generated atomically per school and financial year using `SequenceCounter`:
```typescript
const currentYear = new Date().getFullYear();
const counterKey = `RECEIPT_${currentYear}`;
const counter = await tx.sequenceCounter.upsert({
  where: { schoolId_key: { schoolId, key: counterKey } },
  update: { currentValue: { increment: 1 } },
  create: { schoolId, key: counterKey, currentValue: 1 },
});
const receiptNo = `REC-${currentYear}-${String(counter.currentValue).padStart(6, "0")}`;
```
- **Format:** `REC-YYYY-XXXXXX` (e.g. `REC-2026-000001`, `REC-2026-000002`).
- **Database Unique Constraint:** Migration `20261104020000_receipt_unique_indexes` enforces `CREATE UNIQUE INDEX "invoices_schoolId_receiptNo_key" ON invoices("schoolId", "receiptNo")`.
- **Concurrency Test:** Verified under 50 concurrent payments across 2 schools (`src/tests/api/payments-receipts-concurrency.test.ts`):
  - Exactly 50 unique receipts generated.
  - Zero duplicate receipt numbers.
  - Receipt sequences are monotonically increasing per school.

---

## 2. Unified Webhook Processing & Error Classification

Payment webhooks from Razorpay arrive asynchronously. Webhook semantics are classified strictly into Permanent vs. Transient categories:

```
                          ┌────────────────────────┐
                          │ Incoming Razorpay Post │
                          └───────────┬────────────┘
                                      │
                                      ▼
                        [ Verify HMAC-SHA256 Sig ]
                          Invalid -> HTTP 400 + Security Event Alert
                                      │
                                      ▼
                      [ Check Redis Idempotency Lock ]
                        Duplicate -> HTTP 200 "Already processed"
                                      │
                                      ▼
                     [ resolve_payment_school(orderId) ]
                                      │
                                      ▼
                   [ runWithTenantDatabaseTransaction(school) ]
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
      [ Permanent Errors ]                          [ Transient Errors ]
- Unknown Order                               - DB Connection Timeout
- Unknown Invoice                             - Redis Unavailable
- Amount Mismatch                             - Network Partition
- Currency Mismatch                           
- Already Settled                             
               │                                             │
               ▼                                             ▼
    HTTP 200 (Stop Gateway Retry)              HTTP 500 (Trigger Gateway Retry)
    + Error Log + Audit Alert                  + Ops Telemetry
```

### 2.1. Why Return 200 on Permanent Errors?
If a permanent error (e.g., mismatched payment amount or unknown order ID) returns `HTTP 400` or `500`, payment providers retry the webhook for up to 24 hours, polluting logs, starving connection pools, and triggering spurious alerts. Returning `HTTP 200` stops gateway retries while logging a `PAYMENTS_WEBHOOK_PERMANENT_ERROR` security alert for operational intervention.

### 2.2. Webhook Event Coverage:
- `payment.captured` / `order.paid`: Captures payment, sets invoice status (`PAID` or `PARTIAL`), generates sequential receipt, posts to General Ledger.
- `payment.failed`: Records failed status without overwriting terminal `SUCCESS` states (handles out-of-order delivery).
- `refund.processed` / `payment.refunded`: Adjusts invoice balance and posts double-entry reversing transaction to General Ledger.

---

## 3. Verified Test Evidence

| Test Suite | Assertions Verified | Status |
|---|---|---|
| `payments-receipts-concurrency.test.ts` | 50 concurrent payments across 2 schools -> 0 duplicates, monotonically increasing per school. | **PASS** |
| `payments-webhook-semantics.test.ts` | 1. Duplicate webhook -> 200 + no duplicate ledger entry.<br>2. Out-of-order failure -> preserves captured status.<br>3. Amount mismatch -> 200 permanent error.<br>4. Unknown order -> 200 permanent error.<br>5. Tampered signature -> 400 + CRITICAL alert. | **PASS (5/5)** |
| `payments-ownership.test.ts` | Student/parent can pay only own invoices; cross-tenant invoice payments rejected with 404. | **PASS (12/12)** |
| `payments-late-fines.test.ts` | Late fee calculation rules applied without hardcoded defaults; idempotent re-runs. | **PASS (4/4)** |

