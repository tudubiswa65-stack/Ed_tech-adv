-- ══════════════════════════════════════════════
-- Migration: Create audit_logs table
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(255) NOT NULL,
    entity_type  VARCHAR(100),
    entity_id    VARCHAR(255),
    description  TEXT,
    ip_address   VARCHAR(45),
    metadata     JSONB,
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id    ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON audit_logs(created_at DESC);
