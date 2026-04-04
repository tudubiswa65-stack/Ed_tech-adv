-- Gallery label table (admin editable title/subtitle/badge)
CREATE TABLE IF NOT EXISTS gallery_label (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Hall of Fame',
  subtitle TEXT NOT NULL DEFAULT 'Celebrating our brightest students',
  season_tag TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO gallery_label (id, title, subtitle, season_tag)
VALUES (gen_random_uuid(), 'Hall of Fame', 'Celebrating our brightest students', 'April 2026 Edition')
ON CONFLICT DO NOTHING;

-- Gallery submissions table
CREATE TABLE IF NOT EXISTS gallery_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  thumbnail_url TEXT NOT NULL,   -- 300x300 WebP in public Supabase bucket
  medium_url TEXT NOT NULL,      -- 800x600 WebP in public Supabase bucket
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  slot_order INT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_submissions_status ON gallery_submissions(status);
CREATE INDEX IF NOT EXISTS idx_gallery_submissions_pinned ON gallery_submissions(is_pinned);
