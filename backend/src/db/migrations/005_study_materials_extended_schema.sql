-- Migration 005: Extend study_materials table to match backend/frontend expectations
--
-- The backend controllers and admin UI use columns and type values that were not
-- present in the original schema (001_initial_schema.sql). This migration adds
-- the missing columns and relaxes the overly strict type CHECK constraint.

-- 1. Add missing columns (idempotent with IF NOT EXISTS)
ALTER TABLE study_materials
  ADD COLUMN IF NOT EXISTS institute_id   UUID,
  ADD COLUMN IF NOT EXISTS is_published   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content        TEXT,
  ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES admins(id) ON DELETE SET NULL;

-- 2. Expand the type CHECK constraint to cover all types the admin UI produces.
--    The original constraint only allowed 'pdf' and 'video'.
ALTER TABLE study_materials
  DROP CONSTRAINT IF EXISTS study_materials_type_check;
ALTER TABLE study_materials
  ADD CONSTRAINT study_materials_type_check
  CHECK (type IN ('pdf', 'video', 'document', 'link', 'text'));

-- 3. Performance indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_study_materials_institute_id  ON study_materials(institute_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_is_published  ON study_materials(is_published);
CREATE INDEX IF NOT EXISTS idx_study_materials_created_by    ON study_materials(created_by);
CREATE INDEX IF NOT EXISTS idx_study_materials_subject_id    ON study_materials(subject_id);
