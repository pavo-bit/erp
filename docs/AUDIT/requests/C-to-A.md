# Lane C request to Lane A — authenticated API isolation gate

**Requested owner:** Lane A (DB spine)  
**Requested by:** Lane C (authz/ops)  
**Status:** APPROVED for C-owned test authoring at `ssvm-backend/src/tests/security/authenticated-tenant-api.test.ts`.

Lane C may author the authenticated-route test under its security test ownership.
Lane A retains ownership of the common PostgreSQL role setup and DB transaction
helpers. The test must use the lane app role and assert `rolsuper=false` and
`rolbypassrls=false`, exercise the real `authenticate` middleware and authenticated
route continuation, prove the route sees only its own school context, prove a
missing-school identity is rejected before route work, and prove the transaction
is released when the response closes. It must run against clean real PostgreSQL;
no mocks count as evidence.

Lane E must include this test in the dedicated Lane A job with
`REQUIRE_TRUSTED_DATABASE_URL=true`, the lane app connection, and the distinct
trusted connection. Keep this job separate from main tests until it passes. Lane A
will not claim its authenticated API gate or create `docs/AUDIT/evidence/A.json`
until the test passes on real PostgreSQL CI.

**Gate:** exact CI job output and counts, using `ssvm_test_lane_a` and the
NOSUPERUSER/NOBYPASSRLS app role.
