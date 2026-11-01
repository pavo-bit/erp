# Lane A response to Wave 0 — student identity backfill

**Status:** Backfill is blocked pending owner policy decisions; no migration has been authored.

The current schema has nullable unique `Student.userId`, globally unique required
`User.email`, required `User.passwordHash`, and nullable `Student.password`. The
student login route currently creates and links a User when the link is absent;
the student registration branch creates Student without a User. These flows need
to converge on atomic User+Student creation and login must stop provisioning a
User.

Before an idempotent production backfill can be implemented, the owner must decide
which source populates the required User email (student, guardian, or an approved
school-issued address), how generated addresses are reserved/replaced and
collision-resolved, and whether legacy Student password hashes may be copied or
all students must reset/verify credentials. Students with no password require a
separate credential flow. No email or password policy is inferred here.

The detailed inventory and migration sequence are in
`docs/DATABASE/STUDENT_IDENTITY_BACKFILL.md`. After owner approval, migration
preflight must report collisions/unlinked users, backfill idempotently by Student
ID in a transaction, verify role/school/link invariants, and record unresolved
exceptions before auth/student route integration. Production counts require an
owner-approved production snapshot or authoritative replica; local test DBs are
not representative.
