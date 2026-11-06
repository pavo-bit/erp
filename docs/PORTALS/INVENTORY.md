# Portal Inventory (D1)

Branch: lane/d-portals (base: origin/remediation/80pct @ 37db7b8, PR #4/#5 not yet merged).

## erp-admin (42 pages)
- REAL: 31
- PARTIAL: 2 (documents, fees/defaulters)
- STATIC-OK: 9
- MOCK: 0
- BROKEN: 0 (build not yet run)

Full per-page classification: docs/PORTALS/inventory.json

## Other portals (summary)
- super-admin: 8 pages
- student-portal: 11 pages (uses student-api-hooks.ts)
- teacher-portal: 11 pages
- parent-portal: 14 pages
- payment-portal: 3 pages
- saas-frontend: 1 page

Detailed per-page audits for other portals pending.

## localStorage / hard-coded URLs
- erp-admin/src/lib/api-hooks.ts: sessionStorage csrfToken; fetchWithCsrf reads X-CSRF-Token header.
- No localStorage bearer tokens found in erp-admin (cookie-based auth).

D2: shared client created at erp-admin/src/lib/api-client.ts (cookie-based, CSRF header, 401→refresh→retry).