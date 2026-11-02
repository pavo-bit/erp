# Wave 0 request to Lane C

**Status:** OPEN — auth route and CSRF middleware ownership.

Please review the Wave 0 requests below and either allocate these edits to Lane C or explicitly authorize Wave 0 to implement them in its isolated branch:

- Student login must not create a User, synthesize an email, or mutate `Student.userId`. Student account creation should create a User scoped to the same school and link the student; the two-school regression must prove credentials and lookup do not cross school boundaries. Lane A has a separate request for the existing-data migration/backfill and policy questions in `W0-to-A.md`.
- Add a comment explaining the CSRF origin-check behavior for cookie refresh, and add a cross-origin refresh test proving the intended rejection. The test must exercise the actual refresh endpoint and cookie flow.

No changes to auth routes or CSRF middleware have been made in this W0 branch pending the ownership response.