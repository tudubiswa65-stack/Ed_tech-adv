-- Public leaderboard opt-in columns
-- Run this migration to enable the public leaderboard feature.
--
-- show_on_public_leaderboard: students opt in to appear on the public page
-- public_avatar_url: an optional publicly-shareable avatar URL provided by
--   the student (separate from the private storage avatar_url). May be any
--   publicly accessible image URL (e.g. a social-media profile picture).
--   Leave NULL to show initials only on the public leaderboard.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS show_on_public_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_avatar_url TEXT NULL;

-- Index speeds up the public leaderboard query which filters on this column
CREATE INDEX IF NOT EXISTS idx_users_show_on_public_leaderboard
  ON users (show_on_public_leaderboard)
  WHERE show_on_public_leaderboard = TRUE;

COMMENT ON COLUMN users.show_on_public_leaderboard IS
  'When TRUE the student consents to appear on the unauthenticated public leaderboard page.';

COMMENT ON COLUMN users.public_avatar_url IS
  'Optional publicly-shareable avatar URL for the public leaderboard. '
  'Must not reference private Supabase storage. NULL shows initials only.';
