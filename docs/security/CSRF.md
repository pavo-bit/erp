# CSRF Refresh and Logout Token Exclusion Rationale
1. Refresh and logout endpoints are excluded from CSRF tokens because they use SameSite=Strict and HttpOnly cookies.
2. Browsers do not attach SameSite=Strict cookies to cross-site requests, preventing cross-site request forgery.
3. Strict Origin header validation explicitly rejects requests from unapproved origins before cookie inspection.
4. Refresh tokens rotate upon invocation, preventing ambient session hijacking or replay attacks.
5. Clients can safely recover or terminate sessions without holding existing CSRF tokens in browser memory.
