# Lane D request to Lane E — hosted portal E2E gate

Lane D's Playwright suite needs a hosted authenticated browser run against the
ERP Admin portal and backend. Please add an E2E job to the CI workflow using the
Lane D isolated service allocation (`ssvm_test_lane_d`, PostgreSQL port 5544,
Redis port 6394 / DB index 4) and provide run-scoped secrets through the CI secret
store:

- `E2E_BASE_URL`: URL for the ERP Admin portal under test.
- `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`: a seeded ERP Admin account scoped
  to the isolated lane's school, with 2FA disabled only for this test identity.

The job should run `npm ci` in `e2e-tests/`, install the Playwright Chromium
browser, and run `npm test`. It must not use shared or developer databases, print
credentials, or point at production. Provision the lane-D database from clean
migrations and seed exactly one test school plus the school-scoped ERP_ADMIN
identity; do not seed unrelated students or fee data. Disable 2FA only for this
test identity. The test signs in, creates one uniquely named student through the
admissions UI, verifies the student appears after the API-backed create, and
checks the HttpOnly `access_token` cookie is present with no token in localStorage.
Student creation also creates the required test class/section/session within that
school. Discard the entire lane-D database after the job to clean up the fixture;
the test does not call the school-wide invoice generator.

This is a written cross-lane request. Until Lane E provisions this job and its
hosted run passes on Lane D's commit, portal E2E remains UNVERIFIED.
