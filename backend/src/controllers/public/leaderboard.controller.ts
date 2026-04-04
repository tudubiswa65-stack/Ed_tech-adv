import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

// Top-N students shown on the public leaderboard
const PUBLIC_LEADERBOARD_LIMIT = 10;

/** Returns true only for well-formed HTTPS URLs to avoid mixed-content issues. */
function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

interface PublicStudent {
  id: string;
  name: string;
  public_avatar_url: string | null;
}

interface ResultRow {
  student_id: string;
  score: number | null;
}

/**
 * GET /api/public/leaderboard
 *
 * Returns the top-10 opted-in students by total score.
 * No authentication required.
 * Sensitive fields (email, userId, phone, internal avatar path) are NEVER
 * included — only the fields explicitly listed in the select below.
 */
export const getPublicLeaderboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch students who have opted in to public visibility
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('users')
      .select('id, name, public_avatar_url')
      .eq('show_on_public_leaderboard', true)
      .eq('role', 'student');

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const typedStudents = students as PublicStudent[];
    const studentIds = typedStudents.map((s) => s.id);

    // 2. Fetch all result scores for opted-in students
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select('student_id, score')
      .in('student_id', studentIds);

    if (resultsError) throw resultsError;

    // 3. Aggregate total_score per student
    const scoreMap: Record<string, number> = {};
    ((results ?? []) as ResultRow[]).forEach((r) => {
      scoreMap[r.student_id] = (scoreMap[r.student_id] ?? 0) + (r.score ?? 0);
    });

    // 4. Build leaderboard entries — only public-safe fields.
    // public_avatar_url must use HTTPS to prevent mixed-content warnings;
    // non-HTTPS or invalid URLs are dropped and fall back to initials.
    const leaderboard = typedStudents
      .map((s) => ({
        name: s.name,
        public_avatar_url: isHttpsUrl(s.public_avatar_url) ? s.public_avatar_url : null,
        total_score: scoreMap[s.id] ?? 0,
      }))
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, PUBLIC_LEADERBOARD_LIMIT)
      .map((entry, index) => ({
        rank: index + 1,
        name: entry.name,
        public_avatar_url: entry.public_avatar_url,
        total_score: entry.total_score,
      }));

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('[PublicLeaderboard] Error fetching leaderboard:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to load leaderboard' });
  }
};
