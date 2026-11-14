# Route authorization matrix

This matrix describes the intended boundaries enforced by the route guards. School-scoped access always uses the authenticated tenant context; platform SUPER_ADMIN access to school data requires an impersonation session.

| Route group | Allowed access | Delegation | Tenant boundary |
| --- | --- | --- | --- |
| User list/create/update/status/reset/setup links (`/api/v1/users`) | ERP_ADMIN; SUPER_ADMIN only while impersonating the target school | Never grants user-management access | Reads and writes must include `schoolId`; primary administrators, platform users, and the actor are protected |
| School business routes | Explicit role list on each route | Only routes using `requireDelegatedAction(action, ...)`, and only for the named action | `req.user.schoolId` from the active school session |
| Platform administration, audit, backups, support diagnostics | Platform SUPER_ADMIN with no tenant context | Never | Platform-only; does not provide cross-school search |
| Cross-school search | Not available through a school route | Never | SUPER_ADMIN must enter one audited impersonation session; search is limited to that school |
| Finance reversal/payment | Explicit finance roles on the route | A role delegation alone is insufficient | School scoped; a delegated ERP_ADMIN role is not a direct role |
| Password setup token lookup | `ssvm_auth` database role via `auth_find_password_setup_token` | Never | Function returns only id, schoolId, userId, expiresAt, usedAt, revokedAt; app role remains subject to tenant RLS |

## Role assignment

The shared assignable-role list is declared once in `ssvm-backend/src/routes/users.ts`. ERP_ADMIN may assign school roles from that list. SUPER_ADMIN is not an assignable role and is never accepted by create/update schemas. SUPER_ADMIN may manage school users only from an impersonated school session; the route derives the same school-role list for that session. Platform roles and users with no school tenant are not editable through school user management.

## Delegation

`UserDelegation.role` is descriptive and does not satisfy `requireRole`. Delegation has an expiry and an `allowedActions` list, defaulting to empty. A route must name a specific action with `requireDelegatedAction` to use a grant. Create/revoke operations are audited with the real actor ID.

## Password setup

Create, reset, and resend operations issue one-time, hashed, expiring setup tokens by email. Raw passwords and token hashes are not returned by API responses. Password reset sets `mustChangePassword` and revokes refresh tokens and active sessions.

## Evidence status

The route matrix is a contract, not proof that every route has been audited. Remaining route-specific review and test gaps are listed in `docs/AUDIT/evidence/laneC.json`.

