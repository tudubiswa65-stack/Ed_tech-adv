# Database Migrations

This directory contains SQL migration files for the EdTech Platform database.

## Super Admin Tables Migration

### File: `super_admin_tables.sql`

This migration adds support for the Super Admin Control Panel functionality.

### What it adds:

1. **New Tables:**
   - `super_admin_settings` - Global platform settings with JSON values
   - `audit_logs` - Track all administrative actions

2. **Extended Tables:**
   - `notifications` - Added `branch_id`, `scheduled_at`, and `priority` columns

3. **Views:**
   - `branch_statistics` - Aggregated branch metrics

4. **Helper Functions:**
   - `create_audit_log()` - Automatic audit logging trigger

5. **Default Data:**
   - Pre-populated platform settings

### How to apply:

```bash
# Using psql
psql $DATABASE_URL -f super_admin_tables.sql

# Using Supabase SQL Editor
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Paste the contents of super_admin_tables.sql
# 4. Click Run
```

### Rolling back:

If you need to revert this migration:

```sql
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS super_admin_settings CASCADE;
DROP VIEW IF EXISTS branch_statistics CASCADE;
DROP FUNCTION IF EXISTS create_audit_log() CASCADE;

-- Remove columns from notifications
ALTER TABLE notifications DROP COLUMN IF EXISTS branch_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS scheduled_at;
ALTER TABLE notifications DROP COLUMN IF EXISTS priority;
```

### Notes:

- The migration uses `IF NOT EXISTS` guards, making it safe to run multiple times
- All new tables have proper indexes for performance
- Row Level Security (RLS) policies are applied to protect data
- Default settings are seeded automatically

### Post-migration steps:

After running the migration, you should:

1. Create a super admin user:
```sql
INSERT INTO users (name, email, password_hash, role, status, is_active)
VALUES (
  'Super Admin',
  'superadmin@yourdomain.com',
  '<bcrypt hash of your password>',
  'super_admin',
  'ACTIVE',
  true
);
```

2. Test the new endpoints
3. Verify the super admin role has access to `/api/super-admin/*`

### Verification:

Run this query to verify the migration succeeded:

```sql
SELECT
  (SELECT COUNT(*) FROM super_admin_settings) as settings_count,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_logs') as audit_logs_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'branch_id') as notifications_has_branch_id;
```

Expected result:
- settings_count: 8
- audit_logs_exists: 1
- notifications_has_branch_id: 1
