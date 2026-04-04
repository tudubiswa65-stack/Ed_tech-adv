import { Response } from 'express';
import { supabaseAdmin } from '../db/supabaseAdmin';
import { toSignedAvatarUrl } from '../utils/avatarUrl';
import { AuthRequest } from '../types';

// Signed URL lifetime for leaderboard avatars — matches the client-side cache TTL
const LEADERBOARD_AVATAR_EXPIRY_SECONDS = 300; // 5 minutes

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const { branch_id, limit = 10 } = req.query;

    if (!instituteId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Fetch all results for this institute so we can aggregate per student
    let query = supabaseAdmin
      .from('results')
      .select('student_id, score, students(name, branch_id, avatar_url, branches(name))')
      .eq('institute_id', instituteId);

    const { data, error } = await query;

    if (error) throw error;

    // Aggregate total_score per student
    const studentScores: Record<string, any> = {};

    (data ?? []).forEach((result: any) => {
      const studentId = result.student_id;

      // Apply optional branch filter after fetching
      if (branch_id && result.students?.branch_id !== branch_id) return;

      if (!studentScores[studentId]) {
        studentScores[studentId] = {
          student_id: studentId,
          student_name: result.students?.name,
          branch_id: result.students?.branch_id,
          branch_name: result.students?.branches?.name,
          avatar_url: result.students?.avatar_url ?? null,
          total_score: 0,
        };
      }
      studentScores[studentId].total_score += result.score ?? 0;
    });

    const topN = Number(limit);

    const leaderboard = await Promise.all(
      Object.values(studentScores)
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, topN)
        .map(async (entry, index) => ({
          ...entry,
          avatar_url: await toSignedAvatarUrl(entry.avatar_url, LEADERBOARD_AVATAR_EXPIRY_SECONDS),
          rank: index + 1,
        }))
    );

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
