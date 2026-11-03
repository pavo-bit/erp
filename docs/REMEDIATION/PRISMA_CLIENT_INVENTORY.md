# Prisma Client Construction Inventory

Updated: 2026-11-01

Before the cleanup batch (commit `c5b877e`), direct construction appeared in the following 36 files outside the approved singleton module:

- `ssvm-backend/check-user.js`
- `ssvm-backend/check.ts`
- `ssvm-backend/create-demo-student.ts`
- `ssvm-backend/prisma/add-gallery.ts`
- `ssvm-backend/prisma/seed.ts`
- `ssvm-backend/prisma/seedLedger.ts`
- `ssvm-backend/scripts/create-demo-student.ts`
- `ssvm-backend/scripts/generate-invoices.ts`
- `ssvm-backend/scripts/test-query-performance.ts`
- `ssvm-backend/seed-gallery-addons.js`
- `ssvm-backend/src/jobs/maintenanceWorker.ts`
- `ssvm-backend/src/jobs/outboxRelay.ts`
- `ssvm-backend/src/jobs/webhookWorker.ts`
- `ssvm-backend/src/middleware/tenant.ts`
- `ssvm-backend/src/routes/payments.ts`
- `ssvm-backend/src/routes/saas.ts`
- `ssvm-backend/src/services/audit-hash-chain.service.ts`
- `ssvm-backend/src/services/auth.service.ts`
- `ssvm-backend/src/services/eventStore.service.ts`
- `ssvm-backend/src/services/identity.service.ts`
- `ssvm-backend/src/services/integration.service.ts`
- `ssvm-backend/src/services/intercompany.service.ts`
- `ssvm-backend/src/services/ledger.service.ts`
- `ssvm-backend/src/services/mdm.service.ts`
- `ssvm-backend/src/services/policy.service.ts`
- `ssvm-backend/src/services/projection.service.ts`
- `ssvm-backend/src/services/revenue.service.ts`
- `ssvm-backend/src/services/tenant.service.ts`
- `ssvm-backend/src/services/workflow.service.ts`
- `ssvm-backend/src/tests/db/setup.ts`
- `ssvm-backend/test-create.js`
- `ssvm-backend/test-trigger.js`
- `ssvm-backend/tests/auth.test.ts`
- `ssvm-backend/tests/security/helpers/seed-helper.ts`
- `ssvm-backend/tests/tenant.test.ts`
- `ssvm-backend/verify.ts`

After the cleanup and fresh repository-wide `rg` scan, the only remaining construction is:

- `ssvm-backend/src/lib/prisma.ts`

The `.js` helper scripts now load the shared TypeScript module through the installed `tsx/cjs` hook. Verification is static inventory plus type-check/security-suite evidence; this does not prove that every script has been executed against its intended environment.
