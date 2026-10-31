# SSVM ERP Regression Test Register

Updated: 2026-11-01

| ID | Behavior to verify | Test status | Current evidence |
|---|---|---|---|
| SEC-CSRF-01 | Cookie-authenticated unsafe request without token returns 403 | TESTED | Isolated CSRF suite passed. |
| SEC-CSRF-02 | Invalid token returns 403 and issued token works | TESTED | Isolated CSRF suite passed. |
| SEC-CSRF-03 | Login, webhook and bearer-only requests retain intended behavior | NOT_STARTED | Exclusions/exemption are code-reviewed only. |
| SEC-CSRF-04 | Unsafe cookie-authenticated request from an invalid Origin returns 403 | TESTED | Isolated CSRF suite passed. |
| SEC-RET-01 | Dry-run counts eligible data without deleting and writes an audit | TESTED | Isolated retention service suite passed. |
| SEC-RET-02 | Retention deletes school-scoped data in batches capped at 250 | TESTED | Isolated retention service suite passed. |
| SEC-RET-03 | Unsupported retention entity is rejected without deletion | TESTED | Isolated retention service suite passed. |
| SEC-DOC-01 | Unauthenticated static document URL returns 404 | IMPLEMENTED, NOT TESTED | `/uploads/documents` static mount now denies requests; no HTTP test run. |
| SEC-DOC-02 | Authorized same-school document download succeeds | NOT_STARTED | Authenticated route added; no database-backed test run. |
| SEC-DOC-03 | Cross-school, other-student and traversal download denied | NOT_STARTED | Scope/path checks added; no test run. |
| SEC-GOV-01 | Anonymous retention configuration/execution rejected | NOT_STARTED | Authentication middleware added; no test run. |
| SEC-GOV-02 | Invalid retention period/action/entity input rejected | NOT_STARTED | Period/action/basic entity input validation added; no test run. |
| SEC-GOV-03 | Only super-admin can execute global retention | NOT_STARTED | Role gate added; no test run. |
| FIN-FINE-01 | Anonymous late-fine execution rejected | NOT_STARTED | Authentication middleware added; no test run. |
| FIN-FINE-02 | Fine trigger cannot update another school | NOT_STARTED | School-scoped selection and guarded update added; no test run. |
| SEC-SEED-01 | Production or implicit demo seed invocation fails closed | NOT_STARTED | Seed now requires non-production, `ALLOW_DEMO_SEED=true`, supplied email and a 16-character password; no execution test. |
| SEC-PAY-01 | Missing Razorpay config fails closed and invalid signatures reject | NOT_STARTED | Placeholder fallbacks removed and comparison hardened; no mocked provider test run. |
| TEST-DB-01 | Test setup refuses an implicit or non-test database before truncation | NOT_STARTED | Explicit URL guard added; no test run. |

No checks are marked PASS until executed.
