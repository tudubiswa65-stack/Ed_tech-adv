-- ============================================================
-- Super Admin Control Panel - Database Schema Updates
-- ============================================================
-- This migration adds support for Super Admin functionality
-- including global settings, audit logging, and enhanced notifications
-- ============================================================

-- ──────────────────────────────────────────────
-- NEW ENUM TYPES
-- ──────────────────────────────────────────────

-- Notification priority
DO $$ BEGIN
  CREATE TYPE notif_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────
-- NEW TABLES
-- ──────────────────────────────────────────────

-- Super Admin Settings Table
CREATE TABLE IF NOT EXISTS super_admin_settings (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    key               VARCHAR(255) NOT NULL,
    value             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    description       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT super_admin_settings_key_unique UNIQUE (key)
);

-- Add indexes for super_admin_settings
CREATE INDEX IF NOT EXISTS idx_super_admin_settings_key ON super_admin_settings(key);
CREATE INDEX IF NOT EXISTS idx_super_admin_settings_updated_at ON super_admin_settings(updated_at DESC);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id          UUID        REFERENCES users(id) ON DELETE SET NULL,
    action            VARCHAR(100) NOT NULL,
    entity_type       VARCHAR(100),
    entity_id         UUID,
    old_value         JSONB,
    new_value         JSONB,
    ip_address        INET,
    user_agent        TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ──────────────────────────────────────────────
-- EXTEND EXISTING TABLES
-- ──────────────────────────────────────────────

-- Extend notifications table for Super Admin features
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN scheduled_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority notif_priority DEFAULT 'medium';
  END IF;
END $$;

-- Add index for branch_id in notifications
CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- ──────────────────────────────────────────────
-- DEFAULT SETTINGS
-- ──────────────────────────────────────────────

-- Insert default super admin settings
INSERT INTO super_admin_settings (key, value, description) VALUES
  ('platform_name', '"EdTech Platform"', 'Platform name for branding'),
  ('platform_tagline', '"Empowering Education"', 'Platform tagline'),
  ('default_currency', '"USD"', 'Default currency for payments'),
  ('timezone', '"UTC"', 'Platform timezone'),
  ('maintenance_mode', 'false', 'Maintenance mode flag'),
  ('registration_enabled', 'true', 'Enable new user registration'),
  ('max_upload_size', '50', 'Maximum upload size in MB'),
  ('session_timeout', '604800', 'Session timeout in seconds (7 days)')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ──────────────────────────────────────────────

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, new_value)
    VALUES (
      COALESCE(NEW.created_by, NEW.recorded_by, NEW.updated_by),
      'CREATE',
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      COALESCE(NEW.updated_by, NEW.recorded_by),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value)
    VALUES (
      COALESCE(OLD.created_by, OLD.recorded_by),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────
-- VIEWS FOR COMMON QUERIES
-- ──────────────────────────────────────────────

-- Branch statistics view
CREATE OR REPLACE VIEW branch_statistics AS
SELECT
  b.id,
  b.name,
  b.location,
  b.contact_number,
  b.is_active,
  COUNT(DISTINCT CASE WHEN u.role = 'student' AND u.is_active = true THEN u.id END) as active_students,
  COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
  COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN u.id END) as total_admins,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) as total_revenue,
  COUNT(DISTINCT c.id) as total_courses,
  b.created_at
FROM branches b
LEFT JOIN users u ON u.branch_id = b.id
LEFT JOIN payments p ON p.branch_id = b.id
LEFT JOIN courses c ON c.branch_id = b.id
GROUP BY b.id, b.name, b.location, b.contact_number, b.is_active, b.created_at;

-- ──────────────────────────────────────────────
-- SECURITY POLICIES (RLS)
-- ──────────────────────────────────────────────

-- Enable RLS on super_admin_settings
ALTER TABLE super_admin_settings ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all settings" ON super_admin_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

-- Branch admins can only read settings
CREATE POLICY "Branch admins can read settings" ON super_admin_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'branch_admin'
    )
  );

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

-- Branch admins can only view their own audit logs
CREATE POLICY "Branch admins can view their own audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'branch_admin'
      AND audit_logs.admin_id = u.id
    )
  );

-- Only system can insert audit logs (no explicit INSERT policy needed)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ──────────────────────────────────────────────
-- COMPLETED
-- ──────────────────────────────────────────────
