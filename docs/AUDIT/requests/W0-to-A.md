# Wave 0 request to Lane A

**Status:** OPEN — test gate blocked pending owner review.

## RLS fail-closed probe result

In the test-only `ssvm-database` container on port 5433, I cloned `ssvm_test_template` into `ssvm_test_w0_probe_f4bc3a8e`. As `postgres`, I inserted one school and one fee_category (two `INSERT 0 1`, transaction committed). Using only the checked `ssvm_app` URL from the main worktree's test config, the no-tenant query returned:

```json
{"currentUser":"ssvm_app","databaseName":"ssvm_test_w0_probe_f4bc3a8e","tenantSetting":null,"isSuperuser":false,"bypassRls":false,"visibleFeeCategories":1,"policyCount":174}
```

Catalog check as postgres found `fee_categories.relrowsecurity=false`, `relforcerowsecurity=true`, with one policy in both `ssvm_test_template` and its scratch clone. This contradicts fail-closed behavior and the earlier pass claim. Please diagnose/fix the test template/migration application so the same probe returns zero visible rows as `ssvm_app`, with RLS enabled and forced. Keep the RLS migration out of the default chain until authenticated API coverage meets S2.

## Student identity backfill

Student login must not create or update User records. Student creation should create a school-scoped User and link `Student.userId`. Please review and allocate any required idempotent migration/backfill for existing students before the route change is integrated. Do not assume a student email/password policy without owner review; document required business input if needed. `Student.userId` is nullable unique today; `User.email` is required and unique.

## Prisma unique selector handling

`src/lib/prisma.ts::flattenWhere` currently flattens any underscore-containing object that lacks a short operator key. Please replace the heuristic with detection of actual compound-unique selectors for the given Prisma model, leaving relation filters and ordinary nested objects intact. Add tests for both a real compound unique key and underscore-containing relation filters. A owns this file; Wave 0 will not edit it pending your response.

**Evidence:** test-only endpoint/probe; no production DB or developer DB was used. Scratch database cleanup is pending recording this request, then will drop only the exact scratch DB created above.
The app-role query executed against the scratch clone (no tenant config) was:

```sql
SELECT current_user AS "currentUser",
       current_database() AS "databaseName",
       current_setting('app.current_school_id', true) AS "tenantSetting",
       role.rolsuper AS "isSuperuser",
       role.rolbypassrls AS "bypassRls",
       (SELECT count(*)::int FROM fee_categories) AS "visibleFeeCategories",
       (SELECT count(*)::int FROM pg_policy) AS "policyCount"
FROM pg_roles AS role
WHERE role.rolname = current_user;
```

The catalog check was:

```sql
SELECT c.relrowsecurity, c.relforcerowsecurity,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS fee_policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'fee_categories';
```

Scratch catalog output was `relrowsecurity=f`, `relforcerowsecurity=t`, `fee_policy_count=1`. The policy exists but is not enforced because row security is disabled.
