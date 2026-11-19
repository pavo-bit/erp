-- Alter ssvm_grafana_ro to a password taken from env at deploy time (Block M Task 3)
-- In production/deployment, pass the password via:
--   psql -d ssvm_platform -c "SET app.grafana_db_password = '...';" -f migration.sql
-- or directly via ALTER ROLE ssvm_grafana_ro WITH LOGIN PASSWORD '...';

DO $$
DECLARE
  v_new_password text := current_setting('app.grafana_db_password', true);
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ssvm_grafana_ro') THEN
    IF v_new_password IS NOT NULL AND length(trim(v_new_password)) > 0 THEN
      EXECUTE format('ALTER ROLE ssvm_grafana_ro WITH LOGIN PASSWORD %L', v_new_password);
    END IF;
  END IF;
END
$$;
