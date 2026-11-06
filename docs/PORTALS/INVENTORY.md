# Portal Inventory (D1)

Branch: lane/d-portals (base: origin/remediation/80pct @ 37db7b8, PR #4/#5 not yet merged).

| Portal | Pages | Files | fetch/api files | mock files | Status |
|---|---|---|---|---|---|
| erp-admin | 41 | 68 | 8 | 1 | Partial real API; most pages mock/static |
| super-admin | 8 | 12 | 2 | 0 | Mostly static |
| student-portal | 11 | 1 | 1 (hooks) | 0 | Uses shared hooks (student-api-hooks.ts) |
| teacher-portal | 11 | 15 | 2 | 0 | Partial |
| parent-portal | 14 | 19 | 1 | 2 | Partial; mock data present |
| payment-portal | 3 | 6 | 1 | 0 | Minimal |
| saas-frontend | 1 | 3 | 1 | 1 | Minimal |

D2 (shared typed API client) and D3 (mock replacement) in progress. Missing APIs will be listed in docs/AUDIT/evidence/laneD-api-needs.md.