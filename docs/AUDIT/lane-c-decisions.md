# Lane C security decisions

## Token algorithm cutover

Access, refresh, legacy-cookie access, and pending-2FA token verification accepts
RS256 only. The prior HS256 fallback is removed from all verification entry points.
Tokens issued with the legacy HS256 secrets are invalid after this change; affected
users must authenticate again and receive RS256 tokens. The old fallback rollout
checklist was removed because its multi-day metrics wait conflicts with the audited
security requirement to reject HS256.

## Pre-authentication database access

Unauthenticated login, student login, refresh, logout, alumni registration, and
authentication identity lookups use Lane A's explicit audited trusted transaction
with purpose `authentication`. Once identity is validated, `authenticate` delegates
the request exactly once to Lane A's tenant/super-admin request transaction wrapper.
These paths remain UNVERIFIED until authenticated API tests pass on real PostgreSQL
with the lane app role asserted as non-superuser and non-BYPASSRLS.

## Super-admin IP allowlist

In production, an empty `SUPER_ADMIN_ALLOWED_IPS` denies routes guarded by
`requireAllowedIp`. Development and test retain their current unconfigured behavior
so local work remains possible; deployments must provide explicit addresses.
