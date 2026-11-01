# Lane D request to Lane B — safely test invoice generation

The current admin UI calls `POST /api/v1/finance/generate-monthly-fees`, which
generates invoices for every active student in a school. The former placeholder
E2E test called it and asserted only a success alert; it did not prove an invoice
was created and could affect unrelated students.

Please provide or identify an authorized, idempotent way for the E2E test to
generate and verify an invoice for its unique student fixture only. The test can
then extend admissions-to-invoicing on the isolated Lane D database. A school-wide
generation route must not be used as a per-student test helper.

Until a scoped operation and a real PostgreSQL-backed test fixture are available,
Lane D covers the authenticated admissions-to-student-create portion and marks
invoice workflow E2E UNVERIFIED.
