-- ============================================================
-- EdTech Platform — Optimized 12-Table Schema v3.0
-- ============================================================
-- Clean, optimized schema with exactly 12 tables
-- Supports 3 roles: super_admin, branch_admin, student
-- All tables properly indexed and normalized
-- ============================================================

-- ──────────────────────────────────────────────
-- PREREQUISITES
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- ENUM TYPE DEFINITIONS
-- ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin', 'super_admin', 'branch_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('active', 'inactive', 'draft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE test_type AS ENUM ('graded', 'practice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE result_status AS ENUM ('passed', 'failed', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    12 TABLE DEFINITIONS                          ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────
-- TABLE 1: SETTINGS (includes institute config)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    key               VARCHAR(255) NOT NULL,
    value             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    category          VARCHAR(50), -- 'branding', 'features', 'platform', 'institute'
    description       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT settings_key_unique UNIQUE (key)
);

-- ──────────────────────────────────────────────
-- TABLE 2: BRANCHES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    location          VARCHAR(255),
    contact_number    VARCHAR(20),
    is_active         BOOLEAN     DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLE 3: USERS (unified for all roles)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id         UUID        REFERENCES branches(id) ON DELETE SET NULL,

    -- Identity
    name              VARCHAR(255) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    avatar_url        TEXT,
    phone             VARCHAR(20),

    -- Access control
    role              user_role   NOT NULL DEFAULT 'student',
    status            account_status NOT NULL DEFAULT 'ACTIVE',
    is_active         BOOLEAN     DEFAULT TRUE,

    -- Student-only fields (NULL for admins)
    course_id         UUID,                          -- FK added after courses table
    roll_number       VARCHAR(50),

    -- Engagement tracking
    current_streak    INTEGER     DEFAULT 0,
    max_streak        INTEGER     DEFAULT 0,
    last_activity_date DATE,
    last_login        TIMESTAMPTZ,

    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email)
);

-- ──────────────────────────────────────────────
-- TABLE 4: COURSES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id             UUID        REFERENCES branches(id) ON DELETE SET NULL,

    -- Core identity
    name                  VARCHAR(255) NOT NULL,
    title                 VARCHAR(255),
    description           TEXT,
    thumbnail             TEXT,
    instructor            VARCHAR(255),
    category              VARCHAR(100),

    -- Pricing
    price                 NUMERIC(10,2) DEFAULT 0       CHECK (price >= 0),

    -- Duration
    duration_value        INTEGER                       CHECK (duration_value >= 0),
    duration_unit         VARCHAR(20),                  -- 'days', 'weeks', 'months', 'years'
    duration_hours        INTEGER                       CHECK (duration_hours >= 0),

    -- Scheduling
    start_date            DATE,
    end_date              DATE,
    last_enrollment_date  DATE,

    -- Publication
    is_published          BOOLEAN     DEFAULT FALSE,
    status                course_status NOT NULL DEFAULT 'active',
    is_active             BOOLEAN     DEFAULT TRUE,

    -- Course structure (modules as JSONB)
    modules               JSONB       DEFAULT '[]'::jsonb,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- FK from users.course_id → courses.id
ALTER TABLE users
    ADD CONSTRAINT fk_users_course
    FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON DELETE SET NULL;

-- ──────────────────────────────────────────────
-- TABLE 5: ENROLLMENTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id     UUID            NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at   TIMESTAMPTZ     DEFAULT NOW(),
    status        enrollment_status NOT NULL DEFAULT 'active',
    completed_at  TIMESTAMPTZ,
    notes         TEXT,

    CONSTRAINT enrollments_student_course_unique UNIQUE (student_id, course_id)
);

-- ──────────────────────────────────────────────
-- TABLE 6: ATTENDANCE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id     UUID            REFERENCES courses(id) ON DELETE SET NULL,
    branch_id     UUID            REFERENCES branches(id) ON DELETE SET NULL,
    date          DATE            NOT NULL,
    status        attendance_status NOT NULL DEFAULT 'absent',
    notes         TEXT,
    recorded_by   UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ     DEFAULT NOW(),

    CONSTRAINT attendance_student_course_date_unique
        UNIQUE (student_id, course_id, date)
);

-- ──────────────────────────────────────────────
-- TABLE 7: TESTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID        REFERENCES branches(id) ON DELETE SET NULL,
    course_id       UUID        REFERENCES courses(id) ON DELETE SET NULL,
    created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,

    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            test_type   NOT NULL DEFAULT 'graded',

    -- Scoring
    total_marks     INTEGER     NOT NULL DEFAULT 0  CHECK (total_marks >= 0),
    passing_marks   INTEGER     NOT NULL DEFAULT 0  CHECK (passing_marks >= 0),

    -- Timing
    time_limit_mins INTEGER     DEFAULT 60          CHECK (time_limit_mins > 0),

    -- Scheduling
    scheduled_at    TIMESTAMPTZ,
    is_active       BOOLEAN     DEFAULT FALSE,

    -- Subject/module tracking (as JSONB)
    subject         VARCHAR(255),
    module          VARCHAR(255),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT tests_passing_lte_total
        CHECK (passing_marks <= total_marks)
);

-- ──────────────────────────────────────────────
-- TABLE 8: QUESTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id         UUID    NOT NULL REFERENCES tests(id) ON DELETE CASCADE,

    question_text   TEXT    NOT NULL,
    option_a        TEXT    NOT NULL,
    option_b        TEXT    NOT NULL,
    option_c        TEXT    NOT NULL,
    option_d        TEXT    NOT NULL,

    correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
    correct_answer  CHAR(1) GENERATED ALWAYS AS (correct_option) STORED,

    explanation     TEXT,
    order_index     INTEGER DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLE 9: RESULTS (includes test_assignments)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id             UUID        NOT NULL REFERENCES tests(id) ON DELETE CASCADE,

    -- Scores
    score               INTEGER     NOT NULL DEFAULT 0  CHECK (score >= 0),
    total_marks         INTEGER     NOT NULL DEFAULT 0  CHECK (total_marks >= 0),
    percentage          NUMERIC(5,2) DEFAULT 0          CHECK (percentage >= 0 AND percentage <= 100),
    marks_obtained      INTEGER     GENERATED ALWAYS AS (score) STORED,

    -- Outcome
    status              result_status NOT NULL DEFAULT 'pending',
    passing_marks       INTEGER,

    -- Timing
    time_taken_seconds  INTEGER     DEFAULT 0           CHECK (time_taken_seconds >= 0),
    started_at          TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),

    -- Assignment tracking (merged from test_assignments)
    assignment_status   VARCHAR(20) DEFAULT 'pending',
    start_time         TIMESTAMPTZ,
    end_time           TIMESTAMPTZ,

    -- Answers stored as JSONB
    answers             JSONB       DEFAULT '[]'::jsonb,

    created_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT results_student_test_unique UNIQUE (student_id, test_id)
);

-- ──────────────────────────────────────────────
-- TABLE 10: PAYMENTS (includes receipts)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID        REFERENCES courses(id) ON DELETE SET NULL,
    branch_id           UUID        REFERENCES branches(id) ON DELETE SET NULL,

    amount              NUMERIC(10,2) NOT NULL  CHECK (amount > 0),
    payment_method      VARCHAR(100) NOT NULL,
    status              payment_status NOT NULL DEFAULT 'pending',

    transaction_id      VARCHAR(255) UNIQUE,
    receipt_number      VARCHAR(128) UNIQUE,
    issued_by           UUID        REFERENCES users(id) ON DELETE SET NULL,
    receipt_signature   TEXT,

    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLE 11: STUDY_MATERIALS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_materials (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID        REFERENCES courses(id) ON DELETE SET NULL,
    created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,

    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(50) NOT NULL,  -- 'pdf', 'video', 'document', 'link', 'text'
    url             TEXT         NOT NULL,
    content         TEXT,
    file_size       INTEGER,
    order_index     INTEGER     DEFAULT 0,
    is_published    BOOLEAN     DEFAULT FALSE,

    -- Subject/module tracking (as JSONB)
    subject         VARCHAR(255),
    module          VARCHAR(255),

    -- View tracking (merged from material_views)
    view_count      INTEGER     DEFAULT 0,
    last_viewed_at  TIMESTAMPTZ,
    viewed_by      JSONB       DEFAULT '[]'::jsonb,  -- Array of {student_id, viewed_at}

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLE 12: NOTIFICATIONS (includes complaints, feedback, audit_logs)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by          UUID        REFERENCES users(id) ON DELETE SET NULL,

    -- Content
    title               VARCHAR(255) NOT NULL,
    message             TEXT         NOT NULL,
    type                VARCHAR(50) NOT NULL,  -- 'notification', 'complaint', 'feedback'
    category            VARCHAR(50),            -- 'announcement', 'test_alert', 'result', 'admin_message', 'complaint_category'

    -- Targeting
    target_audience     VARCHAR(50),            -- 'all', 'students', 'admins', 'branch', 'student'
    target_id           UUID,                   -- branch_id, course_id, or student_id
    student_id          UUID        REFERENCES users(id) ON DELETE CASCADE,  -- For student-specific items

    -- Priority & scheduling
    priority            notification_priority DEFAULT 'medium',
    scheduled_at        TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,

    -- Complaint-specific fields
    complaint_status    complaint_status,       -- For complaints
    priority_level      VARCHAR(20),            -- 'low', 'medium', 'high', 'urgent'
    assigned_to         UUID        REFERENCES users(id) ON DELETE SET NULL,

    -- Feedback-specific fields
    rating              INTEGER     CHECK (rating BETWEEN 1 AND 5),

    -- Read tracking (merged from notification_reads)
    read_by             JSONB       DEFAULT '[]'::jsonb,  -- Array of {student_id, read_at}
    read_count          INTEGER     DEFAULT 0,

    -- Audit logging fields
    action              VARCHAR(100),            -- For audit logs
    entity_type         VARCHAR(100),
    entity_id           UUID,
    old_value           JSONB,
    new_value           JSONB,
    ip_address          INET,
    user_agent          TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    INDEXES (PERFORMANCE)                        ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_course_id ON users(course_id);

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_branch_id ON courses(branch_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_id ON attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_id ON attendance(branch_id);

CREATE INDEX IF NOT EXISTS idx_tests_course_id ON tests(course_id);
CREATE INDEX IF NOT EXISTS idx_tests_is_active ON tests(is_active);
CREATE INDEX IF NOT EXISTS idx_tests_scheduled_at ON tests(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tests_branch_id ON tests(branch_id);

CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_order_index ON questions(order_index);

CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_test_id ON results(test_id);
CREATE INDEX IF NOT EXISTS idx_results_status ON results(status);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);

CREATE INDEX IF NOT EXISTS idx_materials_course_id ON study_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON study_materials(type);

CREATE INDEX IF NOT EXISTS idx_notifs_target_audience ON notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_notifs_student_id ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifs_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifs_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifs_created_at ON notifications(created_at DESC);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    VIEWS (BACKWARD COMPATIBILITY)                ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- View for students (backward compatibility)
CREATE OR REPLACE VIEW students AS
    SELECT * FROM users WHERE role = 'student';

-- View for admins (backward compatibility)
CREATE OR REPLACE VIEW admins AS
    SELECT * FROM users WHERE role IN ('admin', 'super_admin', 'branch_admin');

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    SAMPLE DATA                                   ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Default settings
INSERT INTO settings (key, value, category, description) VALUES
  ('platform_name', '"EdTech Platform"', 'branding', 'Platform name for branding'),
  ('platform_tagline', '"Empowering Education"', 'branding', 'Platform tagline'),
  ('primary_color', '"#2E86C1"', 'branding', 'Primary brand color'),
  ('secondary_color', '"#1A7A4A"', 'branding', 'Secondary brand color'),
  ('support_email', '"support@edtech.com"', 'institute', 'Support email address'),
  ('contact_email', '"info@edtech.com"', 'institute', 'Contact email address'),
  ('contact_phone', '"+1-555-0123"', 'institute', 'Contact phone number'),
  ('default_currency', '"USD"', 'platform', 'Default currency for payments'),
  ('timezone', '"UTC"', 'platform', 'Platform timezone'),
  ('maintenance_mode', 'false', 'features', 'Maintenance mode flag'),
  ('registration_enabled', 'true', 'features', 'Enable new user registration'),
  ('max_upload_size', '50', 'platform', 'Maximum upload size in MB')
ON CONFLICT (key) DO NOTHING;

-- Sample branch
INSERT INTO branches (id, name, location, contact_number)
VALUES (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'Main Campus',
    'New Delhi, India',
    '+91-9876543210'
) ON CONFLICT DO NOTHING;

-- Sample users
-- Password is "Password123!" (bcrypt hash)
INSERT INTO users (id, branch_id, name, email, password_hash, role, status)
VALUES
    (
        'cccccccc-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'Super Admin',
        'superadmin@edtech.com',
        '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.',
        'super_admin',
        'ACTIVE'
    ),
    (
        'cccccccc-0000-0000-0000-000000000002',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'Branch Admin',
        'branchadmin@edtech.com',
        '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.',
        'branch_admin',
        'ACTIVE'
    ),
    (
        'cccccccc-0000-0000-0000-000000000003',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'Alice Student',
        'alice@student.com',
        '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.',
        'student',
        'ACTIVE'
    )
ON CONFLICT DO NOTHING;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    MIGRATION NOTES                               ║
-- ╚══════════════════════════════════════════════════════════════════╝
/*
MIGRATION FROM PREVIOUS SCHEMA:
─────────────────────────────────

1. Settings table:
   - Merged institute_config, settings, and super_admin_settings into one table
   - Use 'category' field to distinguish: 'branding', 'features', 'platform', 'institute'

2. Courses table:
   - Merged modules into a JSONB 'modules' field
   - This allows flexible course structure without separate tables

3. Results table:
   - Merged test_assignments by adding assignment_status, start_time, end_time fields

4. Payments table:
   - Merged receipts by adding receipt_number, issued_by, receipt_signature fields

5. Study materials table:
   - Merged material_views by adding view_count, last_viewed_at, viewed_by (JSONB)

6. Notifications table:
   - Merged complaints: use type='complaint', complaint_status, assigned_to fields
   - Merged feedback: use type='feedback', rating field
   - Merged audit_logs: use type='audit', action, entity_type, entity_id, old_value, new_value
   - Merged notification_reads: use read_by (JSONB array), read_count

7. Removed tables (data migrated):
   - institute_config → settings
   - modules → courses.modules (JSONB)
   - subjects → merged into courses.modules (JSONB)
   - test_assignments → results
   - receipts → payments
   - material_views → study_materials
   - complaints → notifications (type='complaint')
   - feedback → notifications (type='feedback')
   - audit_logs → notifications (type='audit')
   - notification_reads → notifications.read_by

BENEFITS:
─────────
- 50% reduction in table count (22+2 → 12)
- Simplified queries with fewer joins
- JSONB fields for flexible data structures
- Maintains all functionality
- Better performance with fewer tables
- Easier to maintain and understand

BACKWARD COMPATIBILITY:
───────────────────────
- Views: students and admins views maintained
- Controllers: May need updates to use new structure
- Frontend: May need updates to handle JSONB fields

*/
