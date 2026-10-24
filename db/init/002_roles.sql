-- ==============================================================================
-- 002_roles.sql: Cấp quyền tối thiểu cho tài khoản ứng dụng task_app
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'task_app') THEN
    CREATE ROLE task_app LOGIN PASSWORD 'TaskAppSecret2026!';
  END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE task_tracker TO task_app;
GRANT USAGE ON SCHEMA public TO task_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO task_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO task_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO task_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO task_app;
