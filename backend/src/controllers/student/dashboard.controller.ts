import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

// Get student dashboard data
export const getStudentDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    if (!studentId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Get today's assigned tests (scheduled for today, pending)
    let todayTestsQuery = supabaseAdmin
      .from('test_assignments')
      .select(`
        id,
        tests!inner (
          id,
          title,
          time_limit_mins,
          scheduled_at,
          courses (name)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .gte('tests.scheduled_at', today.toISOString())
      .lt('tests.scheduled_at', tomorrow.toISOString());

    if (instituteId) {
      todayTestsQuery = todayTestsQuery.eq('tests.institute_id', instituteId);
    }

    const { data: todayTests } = await todayTestsQuery;

    // Get upcoming tests (next 7 days, scheduled, pending)
    let upcomingTestsQuery = supabaseAdmin
      .from('test_assignments')
      .select(`
        id,
        tests!inner (
          id,
          title,
          time_limit_mins,
          scheduled_at,
          courses (name)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .gte('tests.scheduled_at', tomorrow.toISOString())
      .lte('tests.scheduled_at', weekFromNow.toISOString())
      .limit(5);

    if (instituteId) {
      upcomingTestsQuery = upcomingTestsQuery.eq('tests.institute_id', instituteId);
    }

    const { data: upcomingTests } = await upcomingTestsQuery;

    // Get last 3 results - use correct field names
    let recentResultsQuery = supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        submitted_at,
        tests (title)
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(3);

    if (instituteId) {
      recentResultsQuery = recentResultsQuery.eq('institute_id', instituteId);
    }

    const { data: recentResults } = await recentResultsQuery;

    // Get stats from students view for streak
    let studentStatsQuery = supabaseAdmin
      .from('students')
      .select('current_streak')
      .eq('id', studentId);

    if (instituteId) {
      studentStatsQuery = studentStatsQuery.eq('institute_id', instituteId);
    }

    const { data: studentStats } = await studentStatsQuery.single();

    // Get stats
    let totalTestsQuery = supabaseAdmin
      .from('results')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);

    if (instituteId) {
      totalTestsQuery = totalTestsQuery.eq('institute_id', instituteId);
    }

    const { count: totalTests } = await totalTestsQuery;

    let avgScoreQuery = supabaseAdmin
      .from('results')
      .select('percentage')
      .eq('student_id', studentId);

    if (instituteId) {
      avgScoreQuery = avgScoreQuery.eq('institute_id', instituteId);
    }

    const { data: avgScoreData } = await avgScoreQuery;

    const avgScore = avgScoreData && avgScoreData.length > 0
      ? avgScoreData.reduce((sum, r) => sum + (r.percentage || 0), 0) / avgScoreData.length
      : 0;

    let bestScoreQuery = supabaseAdmin
      .from('results')
      .select('percentage')
      .eq('student_id', studentId)
      .order('percentage', { ascending: false })
      .limit(1);

    if (instituteId) {
      bestScoreQuery = bestScoreQuery.eq('institute_id', instituteId);
    }

    const { data: bestScoreData } = await bestScoreQuery;

    res.json({
      success: true,
      data: {
        todayTests: todayTests || [],
        upcomingTests: upcomingTests || [],
        recentResults: recentResults || [],
        stats: {
          totalTests: totalTests || 0,
          avgScore: Math.round(avgScore * 10) / 10,
          bestScore: bestScoreData?.[0]?.percentage || 0,
          streak: studentStats?.current_streak || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default { getStudentDashboard };
