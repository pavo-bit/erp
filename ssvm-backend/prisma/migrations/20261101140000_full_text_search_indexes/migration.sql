-- Preserve the hand-maintained PostgreSQL full-text indexes from the former partial history.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_students_name_fts ON students USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_users_name_fts ON users USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_notices_title_fts ON notices USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_events_title_fts ON events USING gin(to_tsvector('english', title));