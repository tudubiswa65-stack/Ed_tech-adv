-- Branch Admin Permissions
-- One row per branch_admin user. permissions is a JSONB map of permission_key -> boolean.
CREATE TABLE IF NOT EXISTS branch_admin_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}',
  updated_by  UUID REFERENCES users(id),
  updated_by_name VARCHAR(255),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_branch_admin_permissions_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_bap_user_id ON branch_admin_permissions(user_id);
