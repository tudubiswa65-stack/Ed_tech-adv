-- Migration: add missing columns to study_materials
-- The original schema_complete.sql study_materials table was missing columns
-- required by the admin materials controller (branch_id, uploaded_by, file_name,
-- file_type, is_active) and had `type` as NOT NULL which caused INSERT failures
-- since the controller never supplies a type value.
--
-- Run this migration against an existing database once.

-- 1. Add branch_id (foreign key to branches)
ALTER TABLE study_materials
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- 2. Add uploaded_by (foreign key to users — used by admin controller)
ALTER TABLE study_materials
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Add file_name (original filename returned from B2 upload)
ALTER TABLE study_materials
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 4. Add file_type (MIME type returned from B2 upload)
ALTER TABLE study_materials
  ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 5. Add is_active (visibility flag; kept in sync with is_published by the controller)
ALTER TABLE study_materials
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 6. Make the `type` column nullable so that inserts that omit it succeed.
--    (The controller does not use the material_type enum.)
ALTER TABLE study_materials
  ALTER COLUMN type DROP NOT NULL;

-- 7. Index on branch_id for branch-scoped queries
CREATE INDEX IF NOT EXISTS idx_materials_branch_id ON study_materials(branch_id);
