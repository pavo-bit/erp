-- Create schema platform_metrics
CREATE SCHEMA IF NOT EXISTS platform_metrics;

-- Create aggregate view: platform_overview_v
CREATE OR REPLACE VIEW platform_metrics.platform_overview_v AS
SELECT
  (SELECT COUNT(*) FROM schools WHERE status = 'ACTIVE' AND "deletedAt" IS NULL) AS active_schools,
  (SELECT COUNT(*) FROM students WHERE "deletedAt" IS NULL) AS total_students,
  (SELECT COUNT(*) FROM teachers WHERE "deletedAt" IS NULL) AS total_faculty,
  (SELECT COUNT(*) FROM users WHERE "isActive" = true AND "deletedAt" IS NULL) AS total_users;

-- Create aggregate view: school_aggregates_v
CREATE OR REPLACE VIEW platform_metrics.school_aggregates_v AS
SELECT
  s.id AS school_id,
  s.code AS school_code,
  s.status AS school_status,
  COUNT(DISTINCT st.id) AS total_students,
  COUNT(DISTINCT t.id) AS total_teachers,
  COALESCE(SUM(fr."totalAmount"), 0) AS total_fee_collected
FROM schools s
LEFT JOIN students st ON st."schoolId" = s.id AND st."deletedAt" IS NULL
LEFT JOIN teachers t ON t."schoolId" = s.id AND t."deletedAt" IS NULL
LEFT JOIN fee_receipts fr ON fr."schoolId" = s.id AND fr."isCancelled" IS FALSE
WHERE s."deletedAt" IS NULL
GROUP BY s.id, s.code, s.status;

-- Create aggregate view: fee_invoices_by_status_v
CREATE OR REPLACE VIEW platform_metrics.fee_invoices_by_status_v AS
SELECT
  status AS "Status",
  COUNT(id) AS "Invoices"
FROM invoices
GROUP BY status;

-- Create aggregate view: user_accounts_by_role_v
CREATE OR REPLACE VIEW platform_metrics.user_accounts_by_role_v AS
SELECT
  role AS "Role",
  COUNT(id) AS "Users"
FROM users
WHERE "deletedAt" IS NULL
GROUP BY role;

-- Create aggregate view: outbox_queue_stats_v
CREATE OR REPLACE VIEW platform_metrics.outbox_queue_stats_v AS
SELECT
  status,
  COUNT(*) AS event_count
FROM "OutboxMessage"
GROUP BY status;

-- Create role ssvm_grafana_ro if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ssvm_grafana_ro') THEN
    CREATE ROLE ssvm_grafana_ro WITH LOGIN PASSWORD 'grafana_ro_secure_pass_2026';
  END IF;
END
$$;

-- Grant permissions strictly to platform_metrics schema
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_grafana_ro;
REVOKE ALL ON SCHEMA public FROM ssvm_grafana_ro;
GRANT USAGE ON SCHEMA platform_metrics TO ssvm_grafana_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA platform_metrics TO ssvm_grafana_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_metrics GRANT SELECT ON TABLES TO ssvm_grafana_ro;
