# Lane C request to Lane E — token test fixtures and isolated test services

**Requested owner:** Lane E (CI/test infrastructure)  
**Requested by:** Lane C (authz/ops)  
**Status:** OPEN

Lane C will remove the HS256 verification fallback from access, refresh, and
2FA-pending tokens. The pre-existing backend integration tests at
`ssvm-backend/tests/architecture.test.ts` and `ssvm-backend/tests/messaging.test.ts`
currently construct HS256 tokens using `JWT_SECRET || "supersecret"`; after fallback
removal, those fixtures are invalid. Please update these test-only fixtures to use
the configured RS256 `generateAccessToken` helper (not weaken production verification)
and update those files on the test-infra branch or reply with an alternate owner.

Lane C also needs CI-provisioned resources for its tests: isolated database
`ssvm_test_lane_c`, dedicated PostgreSQL and Redis ports, Redis DB index, an app role
with `NOSUPERUSER NOBYPASSRLS` plus assertion, and a distinct explicitly named
trusted role/URL if the test exercises audited super-admin paths. Do not include the
RLS migration in the main test job before the authenticated API gate passes. No
credentials should be printed or committed.

**Gate:** full backend suite and C token/security tests run in CI; RLS-specific tests
assert both role flags. Keep any shared setup/workflow changes on Lane E's branch.
