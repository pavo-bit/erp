# Portal E2E

The Playwright suite targets a running ERP Admin portal and backend. Provide
`E2E_BASE_URL`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD` in the environment,
then run `npm ci` followed by `npm test` from this directory. The credentials
must belong to an isolated test environment. The suite does not create student,
invoice, or other school records.

The authenticated test creates one unique student through the admissions UI,
checks it appears after the API-backed create, and verifies login established an
HttpOnly `access_token` cookie without storing token values in localStorage. It
requires a live backend and an isolated school-scoped ERP_ADMIN account in a clean
test database. Student creation may also create its class, section, and session;
discard the test database after each run. It is not a standalone UI mock test.
The suite avoids the school-wide invoice generation action because it cannot
safely target only its own fixture.
