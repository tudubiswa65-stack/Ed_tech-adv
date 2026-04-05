import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import {
  aggregateStudentStats,
  buildLeaderboard,
  ResultRow,
} from '../../utils/rankingUtils';

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

interface PublicResultRow {
  student_id: string;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  status: string | null;
  time_taken_seconds: number | null;
  submitted_at: string | null;
}

/**
 * GET /api/public/leaderboard
 *
 * Returns the top-10 opted-in students ranked by the multi-factor algorithm.
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

    // 2. Fetch all result data for opted-in students
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select('student_id, score, total_marks, percentage, status, time_taken_seconds, submitted_at')
      .in('student_id', studentIds);

    if (resultsError) throw resultsError;

    // 3. Build stats and rank using the multi-factor algorithm
    const rows: ResultRow[] = ((results ?? []) as PublicResultRow[]).map((r) => ({
      student_id:         r.student_id,
      score:              r.score ?? 0,
      total_marks:        r.total_marks ?? 0,
      percentage:         Number(r.percentage ?? 0),
      status:             r.status ?? 'pending',
      time_taken_seconds: r.time_taken_seconds ?? 0,
      submitted_at:       r.submitted_at ?? '',
    }));

    const metaMap: Record<string, { student_name: string; branch_id: null; branch_name: null; avatar_url: null }> = {};
    typedStudents.forEach((s) => {
      metaMap[s.id] = { student_name: s.name, branch_id: null, branch_name: null, avatar_url: null };
    });

    const statsMap = aggregateStudentStats(rows);
    const ranked   = buildLeaderboard(statsMap, metaMap);

    // 4. Build response — only public-safe fields.
    // public_avatar_url must use HTTPS to prevent mixed-content warnings.
    const publicAvatarMap: Record<string, string | null> = {};
    typedStudents.forEach((s) => {
      publicAvatarMap[s.id] = isHttpsUrl(s.public_avatar_url) ? s.public_avatar_url : null;
    });

    const leaderboard = ranked.slice(0, PUBLIC_LEADERBOARD_LIMIT).map((entry) => ({
      rank:             entry.rank,
      name:             entry.student_name,
      public_avatar_url: publicAvatarMap[entry.student_id] ?? null,
      total_score:      entry.total_score,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('[PublicLeaderboard] Error fetching leaderboard:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to load leaderboard' });
  }
};
