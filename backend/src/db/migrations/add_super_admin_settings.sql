-- Migration: create super_admin_settings table and seed defaults
-- Safe to run multiple times (idempotent).

CREATE TABLE IF NOT EXISTS super_admin_settings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(255) NOT NULL UNIQUE,
    value       TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default values
INSERT INTO super_admin_settings (key, value, description) VALUES
    ('platform_name',       'EdTech Platform',           'Name of the platform'),
    ('tagline',             'Empowering Education',      'Platform tagline'),
    ('primary_color',       '#6366f1',                   'Primary brand color (hex)'),
    ('logo_url',            '',                          'Platform logo URL'),
    ('currency',            'INR',                       'Default currency code'),
    ('timezone',            'UTC',                       'Default timezone'),
    ('session_timeout',     '60',                        'Session timeout in minutes'),
    ('payment_threshold',   '0',                         'Minimum payment threshold amount'),
    ('late_fee_percentage', '0',                         'Late fee as a percentage'),
    ('grace_period_days',   '0',                         'Grace period before late fee applies (days)'),
    ('max_upload_size_mb',  '10',                        'Maximum file upload size in MB'),
    ('allowed_file_types',  '["pdf","jpg","jpeg","png","docx"]', 'Allowed upload file types (JSON array)'),
    ('maintenance_mode',    'false',                     'Put the platform in maintenance mode'),
    ('user_registration',   'true',                      'Allow new user self-registration'),
    ('email_notifications', 'true',                      'Enable email notifications'),
    ('sms_notifications',   'false',                     'Enable SMS notifications')
ON CONFLICT (key) DO NOTHING;
