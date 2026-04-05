-- Leaderboard ranking: rank_history table
-- Tracks per-student rank snapshots so the UI can display rank changes
-- (⬆️ +2, ➡️ 0, ⬇️ -1).
--
-- One row per (student, institute) — upserted every time a student completes
-- a test (NOT on every page load).

CREATE TABLE IF NOT EXISTS rank_history (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institute_id    UUID        REFERENCES institute_config(id) ON DELETE SET NULL,

    rank            INTEGER     NOT NULL,
    previous_rank   INTEGER,                -- NULL on first calculation
    rank_change     INTEGER,                -- previousRank - newRank: +N = moved up N places, -N = moved down N places, 0 = same
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One record per student per institute; upserted on each recalculation
    CONSTRAINT rank_history_student_institute_unique UNIQUE (student_id, institute_id)
);

CREATE INDEX IF NOT EXISTS idx_rank_history_institute_id
    ON rank_history (institute_id);

CREATE INDEX IF NOT EXISTS idx_rank_history_student_id
    ON rank_history (student_id);

COMMENT ON TABLE rank_history IS
    'Stores the most recent rank for each student per institute. '
    'previous_rank and rank_change reflect the change since the prior test submission.';
