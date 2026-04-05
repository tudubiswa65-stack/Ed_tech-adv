import { Response } from 'express';
import { supabaseAdmin } from '../db/supabaseAdmin';
import { toSignedAvatarUrl } from '../utils/avatarUrl';
import { AuthRequest } from '../types';
import {
  aggregateStudentStats,
  buildLeaderboard,
  ResultRow,
} from '../utils/rankingUtils';

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

    // Fetch all results with the extra fields needed for multi-factor ranking
    const { data, error } = await supabaseAdmin
      .from('results')
      .select(
        'student_id, score, total_marks, percentage, status, time_taken_seconds, submitted_at, students(name, branch_id, avatar_url, branches(name))'
      )
      .eq('institute_id', instituteId);

    if (error) throw error;

    // Build per-student metadata map; apply optional branch filter
    const metaMap: Record<string, { student_name: string; branch_id: string | null; branch_name: string | null; avatar_url: string | null }> = {};
    const filteredRows: ResultRow[] = [];

    (data ?? []).forEach((result: any) => {
      const studentId = result.student_id;
      const studentBranchId = result.students?.branch_id ?? null;

      if (branch_id && studentBranchId !== branch_id) return;

      filteredRows.push({
        student_id:          studentId,
        score:               result.score ?? 0,
        total_marks:         result.total_marks ?? 0,
        percentage:          Number(result.percentage ?? 0),
        status:              result.status ?? 'pending',
        time_taken_seconds:  result.time_taken_seconds ?? 0,
        submitted_at:        result.submitted_at ?? '',
      });

      if (!metaMap[studentId]) {
        metaMap[studentId] = {
          student_name: result.students?.name ?? 'Unknown',
          branch_id:    studentBranchId,
          branch_name:  result.students?.branches?.name ?? null,
          avatar_url:   result.students?.avatar_url ?? null,
        };
      }
    });

    // Fetch saved rank_change values from rank_history
    const { data: historyRows } = await supabaseAdmin
      .from('rank_history')
      .select('student_id, rank_change')
      .eq('institute_id', instituteId);

    const rankChangeMap: Record<string, number | null> = {};
    (historyRows ?? []).forEach((h: any) => {
      rankChangeMap[h.student_id] = h.rank_change ?? null;
    });

    // Compute multi-factor ranking
    const statsMap   = aggregateStudentStats(filteredRows);
    const ranked     = buildLeaderboard(statsMap, metaMap, rankChangeMap);
    const topN       = Number(limit);

    const topEntries = ranked.slice(0, topN);

    // Identify the fastest student among the displayed top-N entries
    let fastestStudentId: string | null = null;
    let bestAvgTime = Infinity;
    for (const entry of topEntries) {
      if (entry.avgTimePerQuestion < bestAvgTime) {
        bestAvgTime      = entry.avgTimePerQuestion;
        fastestStudentId = entry.student_id;
      }
    }

    const leaderboard = await Promise.all(
      topEntries.map(async (entry) => ({
        student_id:            entry.student_id,
        student_name:          entry.student_name,
        branch_id:             entry.branch_id,
        branch_name:           entry.branch_name,
        avatar_url:            await toSignedAvatarUrl(entry.avatar_url, LEADERBOARD_AVATAR_EXPIRY_SECONDS),
        total_score:           entry.total_score,
        final_rank_score:      entry.finalRankScore,
        rank:                  entry.rank,
        rank_change:           entry.rank_change,
        trend_score:           entry.trendScore,
        avg_time_per_question: entry.avgTimePerQuestion,
        is_fastest:            entry.student_id === fastestStudentId,
      }))
    );

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
