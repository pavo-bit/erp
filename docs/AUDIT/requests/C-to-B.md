# Lane C request to Lane B — scheduled reconciliation DB scope

**Requested owner:** Lane B (finance/payments)  
**Requested by:** Lane C (authz/ops)  
**Status:** OPEN

`ssvm-backend/src/jobs/reconciliationWorker.ts` schedules a cross-school
`ReconciliationService.runDailyReconciliation()` call. Please identify a way for
the B-owned service to run its database-only work through A's trusted worker
transaction while keeping external Razorpay calls outside database transactions.
Lane C will not edit B-owned finance service files.

Please also use A's trusted transaction with purpose `payment_webhook` for payment
webhook database work in B-owned payment routes, and confirm the signed raw-body
validation contract expected by those routes.

**Gate:** real PostgreSQL worker test, with audited worker purpose and restricted
role assertion where the operation is school-scoped.
