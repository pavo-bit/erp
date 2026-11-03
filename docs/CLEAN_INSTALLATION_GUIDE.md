# Clean Installation Guide (Current Status)

This guide is intentionally limited to verified prerequisites; it is not yet a complete reproducible bootstrap.

1. Install the Node.js version used by the repository's deployment configuration and Docker files; align the current version differences before relying on this guide.
2. Copy the root and backend sanitized `.env.example` files into local environment files and provide generated local keys and secrets. Never reuse production credentials.
3. Set backend `DATABASE_URL` and `DIRECT_URL` to an isolated local PostgreSQL database.
4. To run tests, set `DATABASE_URL_TEST` explicitly to a separate database whose name includes `test`. The test setup truncates its tables.
5. Demo seeding is disabled unless `ALLOW_DEMO_SEED=true`, `NODE_ENV` is non-production, and `SEED_SUPER_ADMIN_EMAIL` plus a unique password of at least 16 characters are set.
6. Install dependencies with `npm ci` in each application directory.

Complete schema migration coverage, service readiness, all portal startup commands, and health-check behavior still need validation. The RLS migration applies cleanly to an empty database and configures 23 tables; its remaining defects are incomplete tenant coverage and a fail-open NULL-tenant policy. Do not use shared or production databases for local/test workflows.
