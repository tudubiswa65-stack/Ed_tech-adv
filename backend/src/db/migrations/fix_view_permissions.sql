-- ============================================================
-- FIX: Permission denied for view "students" / "admins"
-- ============================================================
-- Run this migration in your Supabase SQL Editor (or via psql)
-- to grant the necessary permissions on the backward-compatible
-- views and the underlying users table.
--
-- Root cause: the "students" and "admins" objects are VIEWs over
-- the unified "users" table.  PostgreSQL requires explicit GRANT
-- statements on views (and their underlying tables) even when the
-- connecting role is "service_role" and RLS is disabled.
--
-- Security model:
--   • service_role / postgres: full access (used by backend only)
--   • authenticated / anon:    read-only SELECT, guarded by RLS
--     (direct client access should always go through the backend,
--      so these grants exist only as a safety net)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. GRANT permissions on the underlying users table
-- ──────────────────────────────────────────────────────────────
-- Backend (service_role / postgres) gets full access.
GRANT ALL ON TABLE users TO service_role;
GRANT ALL ON TABLE users TO postgres;

-- Authenticated and anonymous roles get read-only access.
-- Write operations must go through the backend API, never
-- directly from the client, so no INSERT/UPDATE/DELETE here.
GRANT SELECT ON TABLE users TO authenticated;
-- anon (unauthenticated) gets no access to user records.
REVOKE ALL ON TABLE users FROM anon;

-- ──────────────────────────────────────────────────────────────
-- 2. GRANT permissions on the students VIEW
-- ──────────────────────────────────────────────────────────────
GRANT ALL ON students TO service_role;
GRANT ALL ON students TO postgres;
GRANT SELECT ON students TO authenticated;
REVOKE ALL ON students FROM anon;

-- ──────────────────────────────────────────────────────────────
-- 3. GRANT permissions on the admins VIEW
-- ──────────────────────────────────────────────────────────────
GRANT ALL ON admins TO service_role;
GRANT ALL ON admins TO postgres;
-- Only service_role should read admin records; restrict
-- authenticated users to prevent information disclosure.
REVOKE ALL ON admins FROM authenticated;
REVOKE ALL ON admins FROM anon;

-- ──────────────────────────────────────────────────────────────
-- 4. GRANT permissions on the created_by_admin VIEW
-- ──────────────────────────────────────────────────────────────
GRANT ALL ON created_by_admin TO service_role;
GRANT ALL ON created_by_admin TO postgres;
GRANT SELECT ON created_by_admin TO authenticated;
REVOKE ALL ON created_by_admin FROM anon;

-- ──────────────────────────────────────────────────────────────
-- 5. RLS on the users table
--    service_role bypasses RLS automatically in Supabase, so the
--    backend is always unaffected.  These policies protect
--    direct authenticated/anon client access.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop pre-existing policies to avoid conflicts on re-run.
DROP POLICY IF EXISTS "service_role_full_access" ON users;
DROP POLICY IF EXISTS "authenticated_read_own" ON users;

-- service_role (backend): unrestricted — this is the Supabase
-- service_role bypass, but an explicit policy is harmless and
-- makes the intent clear.
CREATE POLICY "service_role_full_access" ON users
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users may only read their own row.
-- All mutations must go through the backend API.
CREATE POLICY "authenticated_read_own" ON users
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 6. GRANT USAGE on sequences (needed for auto-generated UUIDs
--    if using serial/sequence types)
-- ──────────────────────────────────────────────────────────────
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

