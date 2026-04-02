-- Migration: add resolution and override tracking fields to complaints
-- These columns are used by the super-admin complaints controller to record
-- who resolved / overrode a complaint and any associated notes.

ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS resolved_at       TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS resolved_by       UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS override_notes    TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS override_by       UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS override_at       TIMESTAMPTZ DEFAULT NULL;

-- Also expand the complaint_status enum to include 'overridden' which the
-- super-admin override endpoint can set.
ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'overridden';
