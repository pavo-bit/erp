# Existing database adoption after the full baseline

The active migration history now starts with `20261101130000_full_schema_baseline`.
An existing installation must not run `prisma migrate deploy` against this baseline
until its schema and data have been reviewed. The baseline is for a new database;
`migrate resolve --applied` records migration history and does not create missing
objects or reconcile drift.

## Controlled adoption procedure

1. Schedule a maintenance window and take a verified, restorable PostgreSQL backup.
   Record the PostgreSQL version, extensions, schemas, role grants, and current
   `_prisma_migrations` rows. Keep the backup outside the application deployment.
2. Restore that backup into an isolated staging database. Never experiment against
   production. Compare the live schema with the checked-in Prisma schema using a
   shadow database and inspect the generated SQL; separately compare every baseline
   object, index, constraint, and enum with the restored database.
3. Resolve all drift before adoption. If the database is not structurally equivalent
   to the baseline, write and review a forward-only reconciliation migration. Do not
   mark the baseline applied merely to make deploy green.
4. Only after an independent DBA review confirms exact baseline equivalence, record
   the baseline as applied on the target database:

   ```sh
   npx prisma migrate resolve --applied 20261101130000_full_schema_baseline
   ```

   This command inserts migration bookkeeping; it does not validate or repair the
   database. Save its output and the schema comparison as deployment evidence.
5. Apply subsequent migrations in order with `prisma migrate deploy` on staging.
   Validate full-text search, RLS as the production application role, ledger
   invariants, and the API smoke suite before the production maintenance window.
6. Repeat the exact reviewed procedure in production. Stop and restore from backup
   if the live schema differs from the reviewed staging snapshot.

## Migration history cautions

The previous migration folders were replaced by the full baseline. Existing
`_prisma_migrations` rows may therefore reference migration names that are no longer
present, or have checksums that differ from this branch. Do not delete migration
rows, rewrite checksums, or mark old migrations rolled back as a routine fix. Prisma
may require a separately reviewed history reconciliation; retain a copy of the old
migration ledger and obtain explicit DBA approval before changing it. If equivalence
or history cannot be proven, use a separately planned data migration into a clean
database instead of adopting in place.

This document is an operational plan, not evidence that an existing database has
been adopted. No production database was modified by writing this plan.
