# Lane C route security additions

Updated: 2026-11-05

This file records the Lane C ERP administrator security contract. The generated route inventory remains at [the existing authorization matrix](../security/ROUTE_AUTHORIZATION_MATRIX.md); it is not a substitute for these behavioral rules.

| Surface | Allowed actors | Scope and required behavior |
|---|---|---|
| `GET/POST /api/users` | School `ERP_ADMIN` | Current school only. Create roles are controlled by `ASSIGNABLE_ROLES` in `ssvm-backend/src/routes/users.ts`; platform roles and `ERP_ADMIN` are not assignable. |
| `PUT /api/users/:id` | School `ERP_ADMIN` | Lookup and update include the authenticated `schoolId`. Platform and ERP administrator accounts are protected. Role audit details record `before` and `after`. |
| `PUT /api/users/:id/status` | School `ERP_ADMIN` | Same-school target only; self, platform and ERP administrator accounts are protected. |
| `PUT /api/users/:id/reset-password` | School `ERP_ADMIN` | Same-school non-admin only; temporary random credential is never returned, `mustChangePassword` is set, refresh sessions are revoked, and the action is audited. |
| `PUT /api/invoices/:id/pay` | `ACCOUNTANT`, `ERP_ADMIN`, invoice owner roles | Invoice school must match the authenticated school. `SUPER_ADMIN` cannot pay as a platform role. |
| Cross-school search | None by default; `SUPER_ADMIN` in audited impersonation only | Tenant search is scoped to the authenticated impersonated school. |

## Guard and delegation rules

`requireRole` authorizes only the authenticated account's actual role. A `UserDelegation.role` does not satisfy a route guard. Shared school admin helpers list school roles without implicitly granting `SUPER_ADMIN`; routes that need platform administration must state that explicitly. A platform administrator may access school data only through the audited impersonation session.

Delegated privileges currently grant no route actions. The `UserDelegation` schema does not yet contain an `allowedActions` field, and no route must infer permissions from its delegated role. A future delegation feature must add an explicit action allowlist, expiry enforcement, and audit events before enabling any delegated action.

## Password invitation dependency

User create and reset generate a cryptographically random secret, store only its password hash, set `mustChangePassword`, and never return the secret. Reset revokes refresh tokens. The current schema and mail worker do not provide a persisted, hashed, single-use invitation/reset token or delivery flow. Until that flow is implemented, operators must provision a secure password setup process out of band; the API response does not claim an invitation was sent. The SaaS school setup path also uses a random secret and requires a password change, replacing the shared `Admin@123` default.

## Contract coverage

`ssvm-backend/src/tests/security/user-admin-contract.test.ts` covers every assigner/role cell, self-promotion/platform-role exclusion, response-secret absence, and the SaaS default-password regression. Add route-level database tests for protected-account mutation, school-scoped updates, last-admin demotion refusal, audit actor/before-after fields, and delegation denial when invitation/session fixtures are available.
