# Lane C request to Lane E — token test fixtures and isolated test services

**Requested owner:** Lane E (CI/test infrastructure)  
**Requested by:** Lane C (authz/ops)  
**Status:** PARTIALLY COMPLETE — token fixtures updated on Lane C; service CI request open.

Lane C removed the HS256 verification fallback from access, refresh, legacy-cookie,
and 2FA-pending tokens. The integration fixtures in
`ssvm-backend/tests/architecture.test.ts` and `ssvm-backend/tests/messaging.test.ts`
now use the configured RS256 `generateAccessToken` helper.

Lane C also needs CI-provisioned resources for its tests: isolated database
`ssvm_test_lane_c`, dedicated PostgreSQL and Redis ports, Redis DB index, an app role
with `NOSUPERUSER NOBYPASSRLS` plus assertion, and a distinct explicitly named
trusted role/URL if the test exercises audited super-admin paths. Do not include the
RLS migration in the main test job before the authenticated API gate passes. No
credentials should be printed or committed.

**Gate:** full backend suite and C token/security tests run in CI; RLS-specific tests
assert both role flags. Keep any shared setup/workflow changes on Lane E's branch.
