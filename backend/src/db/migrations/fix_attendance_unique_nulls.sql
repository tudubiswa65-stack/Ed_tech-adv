-- Migration: fix_attendance_unique_nulls
-- Purpose: Make the attendance unique constraint treat NULL course_id as equal
-- so that (student_id, NULL, date) conflicts with another (student_id, NULL, date).
-- PostgreSQL 15+ supports NULLS NOT DISTINCT in unique constraints.
-- Supabase runs PostgreSQL 15, so this is safe.

-- Drop the old constraint that allows NULL duplicates
ALTER TABLE attendance
    DROP CONSTRAINT IF EXISTS attendance_student_course_date_unique;

-- Re-add with NULLS NOT DISTINCT so that two rows with the same
-- student_id, NULL course_id, and same date will conflict.
ALTER TABLE attendance
    ADD CONSTRAINT attendance_student_course_date_unique
        UNIQUE NULLS NOT DISTINCT (student_id, course_id, date);
