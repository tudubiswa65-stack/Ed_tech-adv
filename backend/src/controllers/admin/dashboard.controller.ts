import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import { getUserBranchId } from '../../utils/branchFilter';

// Get dashboard statistics
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branchId = getUserBranchId(req.user);

    // Get total students count (scoped to branch for branch_admin)
    let totalStudentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (branchId) totalStudentsQuery = totalStudentsQuery.eq('branch_id', branchId);
    const { count: totalStudents } = await totalStudentsQuery;

    // Get active students (logged in today, scoped to branch)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeStudentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_login', today.toISOString());
    if (branchId) activeStudentsQuery = activeStudentsQuery.eq('branch_id', branchId);
    const { count: activeStudents } = await activeStudentsQuery;

    // Get tests conducted this week (scoped to branch via students)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // When branch-scoped, retrieve student IDs for the branch first so we can
    // filter results without a cross-table JOIN that Supabase doesn't support
    // directly on aggregate queries.
    let branchStudentIds: string[] | null = null;
    if (branchId) {
      const { data: branchStudents } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('branch_id', branchId);
      branchStudentIds = (branchStudents || []).map((s: { id: string }) => s.id);
    }

    let testsThisWeekQuery = supabaseAdmin
      .from('results')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', weekAgo.toISOString());
    if (branchStudentIds !== null) {
      if (branchStudentIds.length === 0) {
        // Branch has no students → no results
        res.json({
          success: true,
          data: {
            totalStudents: totalStudents || 0,
            activeStudents: activeStudents || 0,
            testsThisWeek: 0,
            avgScore: 0,
            recentActivity: [],
          },
        });
        return;
      }
      testsThisWeekQuery = testsThisWeekQuery.in('student_id', branchStudentIds);
    }
    const { count: testsThisWeek } = await testsThisWeekQuery;

    // Get average score this week (scoped to branch)
    let avgScoreQuery = supabaseAdmin
      .from('results')
      .select('percentage')
      .gte('submitted_at', weekAgo.toISOString());
    if (branchStudentIds !== null && branchStudentIds.length > 0) {
      avgScoreQuery = avgScoreQuery.in('student_id', branchStudentIds);
    }
    const { data: avgScoreData } = await avgScoreQuery;

    const avgScore = avgScoreData && avgScoreData.length > 0
      ? avgScoreData.reduce((sum: number, r: { percentage: number }) => sum + (r.percentage || 0), 0) / avgScoreData.length
      : 0;

    // Get recent activity — the activity_log schema may not have a branch_id column,
    // so branch filtering is not applied here. The student/result counts above already
    // give branch-scoped numbers to the branch_admin.
    const { data: recentActivity } = await supabaseAdmin
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      success: true,
      data: {
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        testsThisWeek: testsThisWeek || 0,
        avgScore: Math.round(avgScore * 10) / 10,
        recentActivity: recentActivity || [],
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default {
  getDashboardStats,
};