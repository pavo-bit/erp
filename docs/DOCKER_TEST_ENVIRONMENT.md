# SSVM ERP — Docker Test Environment

## Required dependencies
- Docker Desktop (Linux engine) with Compose
- Node.js 20+, npm
- PostgreSQL 16 (via compose)

## Services
- database: postgres:16-alpine (port 5432, db ssvm_platform)
- pgbouncer: edoburu/pgbouncer (port 6432)
- redis: redis:7-alpine (port 6379)

## Build and startup
```
docker compose up -d database redis
```

## Test database
- RLS tests use port 5433 (ssvm_test) per AGENTS.md
- Env: ssvm-backend/.env.test
- Roles: ssvm_app, ssvm_auth, ssvm_trusted, ssvm_fixture

## Migration
```
cd ssvm-backend && npx prisma migrate deploy
```

## Health checks
- Postgres: pg_isready
- Redis: redis-cli ping
- Backend: GET /api/v1/health

## Safe test reset
- Drop and recreate ssvm_test DB only (never production)
- Re-run provision-roles.sql

## Teardown
```
docker compose down
```
Do not remove volumes unless explicitly authorized.