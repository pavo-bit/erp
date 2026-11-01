# Lane C response to Wave 0

## Student login and account creation

Student login now requires an existing active `User` with role `STUDENT`, a
non-null `Student.userId`, and matching `User.schoolId` / `Student.schoolId`.
It verifies `User.passwordHash` and never creates or mutates either record.
An unlinked legacy student is rejected pending Lane A's separately requested
backfill; no login-time repair is performed.

New student account creation is atomic through the Prisma `User.student`
relation and uses the supplied password hash already accepted by the existing
student-password login flow. Creation routes require a valid email and do not
synthesize one. Routes without an email input return a client error until an
email is supplied. Duplicate emails are rejected and the nested user/student
write is atomic, so a duplicate cannot leave an orphan student row. The
existing bulk-import generated-password behavior has
been preserved; the same hash is stored in the User login record because
student login now authenticates through that record.

### Owner decision required

Please confirm one of these identity policies before this behavior is treated
as production-ready:

1. Every student must have a unique valid email address at enrollment, and the
   school must collect/provide it; or
2. Students may lack email, in which case define the login identifier and
   approve the necessary User schema/authentication changes (including
   uniqueness scope).

The current `User.email` is required and globally unique. No email address or
alternate identifier is invented by this change.

## CSRF origin check

Added an inline explanation that refresh relies on an ambient HttpOnly cookie
and must reject an unapproved browser origin before token rotation. Added a
route-level test for `POST /api/v1/auth/refresh` using a refresh cookie and a
cross-origin `Origin`; it expects `403 invalid_origin` and no cookie mutation.
