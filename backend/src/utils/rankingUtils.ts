import { supabaseAdmin } from '../db/supabaseAdmin';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Time-bonus thresholds (seconds per question).
 * A student answering in ≤ MIN_TIME_FOR_FULL_BONUS s/question earns 100 pts.
 * A student answering in ≥ MAX_TIME_FOR_ZERO_BONUS s/question earns 0 pts.
 * Students with no valid time data receive this penalty default.
 */
const MIN_TIME_FOR_FULL_BONUS  = 5;   // seconds — fastest achievable pace
const MAX_TIME_FOR_ZERO_BONUS  = 60;  // seconds — slowest before bonus hits 0
const DEFAULT_AVG_TIME_SECONDS = 60;  // fallback for students with no timing data

export interface ResultRow {
  student_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: string;
  time_taken_seconds: number;
  submitted_at: string;
}

export interface StudentStats {
  student_id: string;
  avgScore: number;           // 0–100, average of per-test percentages
  accuracy: number;           // 0–100, overall correct / total questions
  avgTimePerQuestion: number; // seconds per question, averaged across tests
  passRate: number;           // 0–100, % of tests passed
  consistencyScore: number;   // 0–100, derived from score variance
  trendScore: number;         // 0 | 50 | 100 — declining / stable / improving
  totalTests: number;
  lastActive: string;         // ISO string of most recent submitted_at
  total_score: number;        // sum of raw correct answers (for display)
  scores: number[];           // percentages ordered by submitted_at
}

export interface RankedEntry extends StudentStats {
  student_name: string;
  branch_id: string | null;
  branch_name: string | null;
  avatar_url: string | null;
  finalRankScore: number;
  rank: number;
  rank_change: number | null; // null = first time tracked
}
// ── Types ─────────────────────────────────────────────────────────────────────


// ── Pure ranking functions ────────────────────────────────────────────────────

export function calculateConsistency(scores: number[]): number {
  if (scores.length <= 1) return scores.length === 0 ? 50 : 100;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  return Math.max(0, 100 - variance);
}

/** Compare last 3 tests vs previous 3 tests. Returns 100 / 50 / 0. */
export function calculateTrend(scores: number[]): number {
  const recent = scores.slice(-3);
  const previous = scores.slice(-6, -3);
  if (previous.length === 0) return 50;
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  if (recentAvg > prevAvg) return 100;
  if (recentAvg === prevAvg) return 50;
  return 0;
}

/**
 * Weighted composite rank score (0–100 range).
 * Faster students (lower avgTimePerQuestion) receive a higher time bonus.
 */
export function calculateRankScore(
  stats: Pick<StudentStats, 'avgScore' | 'accuracy' | 'avgTimePerQuestion' | 'passRate' | 'consistencyScore'>
): number {
  const weights = {
    avgScore: 0.35,
    accuracy: 0.25,
    avgTimeBonus: 0.20,
    passRate: 0.15,
    consistency: 0.05,
  };

  // Max 100 pts at MIN_TIME_FOR_FULL_BONUS s/question, 0 pts at ≥ MAX_TIME_FOR_ZERO_BONUS s/question
  const timeBonus = Math.max(
    0,
    100 - ((stats.avgTimePerQuestion - MIN_TIME_FOR_FULL_BONUS) /
           (MAX_TIME_FOR_ZERO_BONUS - MIN_TIME_FOR_FULL_BONUS)) * 100
  );

  const raw =
    stats.avgScore        * weights.avgScore +
    stats.accuracy        * weights.accuracy +
    timeBonus             * weights.avgTimeBonus +
    stats.passRate        * weights.passRate +
    stats.consistencyScore * weights.consistency;

  return Math.round(raw * 100) / 100;
}

/** Secondary sort when finalRankScore is identical. */
export function breakTie(a: StudentStats, b: StudentStats): number {
  if (a.accuracy !== b.accuracy)
    return b.accuracy - a.accuracy;

  if (a.avgTimePerQuestion !== b.avgTimePerQuestion)
    return a.avgTimePerQuestion - b.avgTimePerQuestion;

  if (a.totalTests !== b.totalTests)
    return b.totalTests - a.totalTests;

  return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
}

// ── Stats aggregation ────────────────────────────────────────────────────────

/**
 * Aggregate raw result rows into per-student stats objects.
 * Results must already be scoped to the desired institute / branch.
 */
export function aggregateStudentStats(rows: ResultRow[]): Record<string, StudentStats> {
  const grouped: Record<string, ResultRow[]> = {};
  for (const r of rows) {
    if (!grouped[r.student_id]) grouped[r.student_id] = [];
    grouped[r.student_id].push(r);
  }

  const statsMap: Record<string, StudentStats> = {};

  for (const [studentId, studentRows] of Object.entries(grouped)) {
    const sorted = [...studentRows].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
    const scores = sorted.map((r) => Number(r.percentage));

    const totalCorrect = studentRows.reduce((s, r) => s + (r.score ?? 0), 0);
    const totalMarks   = studentRows.reduce((s, r) => s + (r.total_marks ?? 0), 0);
    const accuracy     = totalMarks > 0 ? (totalCorrect / totalMarks) * 100 : 0;
    const avgScore     = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const timesPerQ = studentRows
      .filter((r) => (r.total_marks ?? 0) > 0)
      .map((r) => (r.time_taken_seconds ?? 0) / r.total_marks);
    const avgTimePerQuestion =
      timesPerQ.length > 0
        ? timesPerQ.reduce((a, b) => a + b, 0) / timesPerQ.length
        : DEFAULT_AVG_TIME_SECONDS;

    const passedCount = studentRows.filter((r) => r.status === 'passed').length;
    const passRate    = studentRows.length > 0 ? (passedCount / studentRows.length) * 100 : 0;

    const consistencyScore = calculateConsistency(scores);
    const trendScore       = calculateTrend(scores);

    const lastActive = studentRows.reduce(
      (latest, r) => (!latest || r.submitted_at > latest ? r.submitted_at : latest),
      ''
    );

    statsMap[studentId] = {
      student_id: studentId,
      avgScore,
      accuracy,
      avgTimePerQuestion,
      passRate,
      consistencyScore,
      trendScore,
      totalTests: studentRows.length,
      lastActive,
      total_score: totalCorrect,
      scores,
    };
  }

  return statsMap;
}

// ── Leaderboard builder ───────────────────────────────────────────────────────

type StudentMeta = {
  student_name: string;
  branch_id: string | null;
  branch_name: string | null;
  avatar_url: string | null;
};

/**
 * Build a sorted, ranked leaderboard array from stats + optional metadata.
 * rank_change values come from a pre-fetched rank_history map.
 */
export function buildLeaderboard(
  statsMap: Record<string, StudentStats>,
  metaMap: Record<string, StudentMeta>,
  rankChangeMap: Record<string, number | null> = {}
): RankedEntry[] {
  const withScores = Object.values(statsMap).map((stats) => ({
    ...stats,
    ...(metaMap[stats.student_id] ?? {
      student_name: 'Unknown',
      branch_id: null,
      branch_name: null,
      avatar_url: null,
    }),
    finalRankScore: calculateRankScore(stats),
    rank: 0, // placeholder
    rank_change: rankChangeMap[stats.student_id] ?? null,
  }));

  return withScores
    .sort((a, b) => {
      if (b.finalRankScore !== a.finalRankScore)
        return b.finalRankScore - a.finalRankScore;
      return breakTie(a, b);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// ── DB-level rank history recalculation ──────────────────────────────────────

/**
 * Recalculate rankings for every student in an institute and persist them to
 * the rank_history table.  Called after each test submission so that subsequent
 * leaderboard GETs can show accurate rank-change indicators.
 *
 * Runs a fire-and-forget upsert — failures are logged but never re-thrown so
 * they cannot affect the test-submission response.
 */
export async function recalculateRankHistory(instituteId: string): Promise<void> {
  try {
    // Fetch all results for the institute
    const { data: rows, error: rowsError } = await supabaseAdmin
      .from('results')
      .select('student_id, score, total_marks, percentage, status, time_taken_seconds, submitted_at')
      .eq('institute_id', instituteId);

    if (rowsError) throw rowsError;
    if (!rows || rows.length === 0) return;

    // Aggregate stats
    const statsMap = aggregateStudentStats(rows as ResultRow[]);

    // Compute new ranks
    const ranked = Object.values(statsMap)
      .map((s) => ({ ...s, finalRankScore: calculateRankScore(s) }))
      .sort((a, b) => {
        if (b.finalRankScore !== a.finalRankScore)
          return b.finalRankScore - a.finalRankScore;
        return breakTie(a, b);
      })
      .map((s, i) => ({ ...s, rank: i + 1 }));

    // Fetch existing rank records to determine previous_rank / rank_change
    const { data: existing } = await supabaseAdmin
      .from('rank_history')
      .select('student_id, rank')
      .eq('institute_id', instituteId);

    const prevRankMap: Record<string, number> = {};
    (existing ?? []).forEach((e: { student_id: string; rank: number }) => {
      prevRankMap[e.student_id] = e.rank;
    });

    const upsertRows = ranked.map((entry) => {
      const prevRank = prevRankMap[entry.student_id] ?? null;
      // rank_change = previousRank - newRank
      // e.g. was rank 5, now rank 3  →  5 - 3 = +2  (moved up 2 places, positive = improved)
      // e.g. was rank 2, now rank 4  →  2 - 4 = -2  (moved down 2 places, negative = declined)
      const rankChange = prevRank !== null ? prevRank - entry.rank : null;
      return {
        student_id:    entry.student_id,
        institute_id:  instituteId,
        rank:          entry.rank,
        previous_rank: prevRank,
        rank_change:   rankChange,
        calculated_at: new Date().toISOString(),
      };
    });

    if (upsertRows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('rank_history')
        .upsert(upsertRows, { onConflict: 'student_id,institute_id' });
      if (upsertError) throw upsertError;
    }
  } catch (err: any) {
    console.error('[RankHistory] Recalculation failed:', err?.message ?? err);
  }
}
