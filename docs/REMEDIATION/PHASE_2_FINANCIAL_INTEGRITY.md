# Phase 2 — Financial Integrity

## Status: IN PROGRESS / NOT VERIFIED

- Finance-governance period close now requires finance-admin authorization, derives ordinary school and actor identity from authenticated server state, and returns 409 when close validation fails. Isolated route tests cover spoofed request identity and failed close results.
- The previous bank reconciliation handler wrote a zero ledger balance and marked placeholder matches. It now requires finance-admin authorization and returns 501 without creating a record.
- A real reconciliation workflow remains unimplemented: `BankReconciliation` stores only a header; no statement-line or match relation exists. Matching tolerances and correction rules need finance-owner approval.
- Financial close still requires DB tests for concurrent close, transaction rollback, balanced journals and actor audit. Broader monetary precision review remains open; multiple schema fields use `Float`, and service calculations use JavaScript numbers.
- Payment provider binding, webhook replay, partial payment, atomic ledger posting and refunds have not been verified.

No financial production-readiness claim is made. See `../PHASE_3_FINANCIAL_INTEGRITY.md` and `VERIFIED_ISSUE_REGISTER.md`.
