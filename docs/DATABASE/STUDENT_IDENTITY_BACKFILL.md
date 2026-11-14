# Student identity backfill plan

## Current schema and route state

- `Student.userId` is nullable and unique; it references `User.id`.
- `User.email` is required and globally unique, `User.passwordHash` is required,
  `User.schoolId` is nullable, and `User.role` can be `STUDENT`.
- `Student` has no email column; its legacy `password` column is nullable.
- The current student login handler creates and links a `User` on first login when
  `Student.userId` is absent. The student registration branch creates a `Student`
  without a linked `User`. These paths do not meet the requested lifecycle.

## Owner decisions required before backfill

The migration must not invent a login identifier or credential policy. The owner
must select:

1. Which address populates `User.email`: student-owned email, guardian email, or a
   school-issued address. If an address is generated, approve its reserved domain,
   collision behavior, and how it is replaced with a real address.
2. Whether an existing `Student.password` hash may be copied into
   `User.passwordHash` after the supported hash formats are verified, or whether
   all linked users must receive a reset/first-login flow. Rows with no password
   cannot receive a usable password hash without a separate credential process.
3. Whether backfilled users are initially active and whether the first login must
   force a password reset or verify a guardian/student contact channel.
4. Which existing admission-number-only logins remain supported during rollout
   and the cutoff for removing them.

## Required inventory before approval

Run read-only reports against an owner-approved production snapshot or an
authoritative replica for:

- total students, unlinked students, linked students with missing/mismatched users;
- duplicate/blank admission numbers and school assignments;
- students with no password, and password-hash format counts (never print hashes);
- candidate email collisions under the owner-approved address rule;
- students linked to users with a non-STUDENT role, wrong school, or inactive state.

Do not run credential backfill from a test template or infer production counts from
the local test databases.

## Migration sequence after owner approval

1. Add a check-only migration/report that classifies every student as eligible or
   requiring manual resolution. Fail before writes if the chosen identifier rule
   produces collisions or any `User` violates existing school/role invariants.
2. Use an idempotent transactional Prisma backfill (not SQL-only password creation)
   keyed by `Student.id`. Create a school-scoped `STUDENT` `User`, then set
   `Student.userId`; on rerun, validate and reuse the existing link. Never overwrite
   an unrelated user or credential. Keep a report of unresolved IDs without
   personal data or secrets.
3. Verify `Student.userId IS NOT NULL` for every eligible student, each linked
   user's role/school, uniqueness, and the unresolved exception count. Require
   owner sign-off for exceptions.
4. Only after the backfill and route behavior are verified, change student
   creation to create `User` and `Student` in one tenant transaction, and make
   student login read the existing linked identity without creating/updating users.
5. Retain rollback/recovery instructions that preserve existing student rows and
   record created User IDs before any route rollout.

No migration has been authored because the identifier and first-login/reset rules
are owner decisions, not schema facts.

