import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import { getUserBranchId } from '../../utils/branchFilter';
import { cacheGet, cacheSet, makeCacheKey, CACHE_TTL } from '../../utils/cache';

/**
 * GET /admin/aggregated/dashboard
 * 
 * Returns combined dashboard data: stats + permissions + recent activity
 * Uses caching for performance
 */
export const getAggregatedDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const branchId = getUserBranchId(req.user);
    const cacheKey = makeCacheKey(['admin', 'dashboard', 'agg', userId]);

    // Try cache first
    const cached = cacheGet<any>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true });
      return;
    }

    // Get total students count
    let totalStudentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (branchId) totalStudentsQuery = totalStudentsQuery.eq('branch_id', branchId);
    const { count: totalStudents } = await totalStudentsQuery;

    // Get active students
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let activeStudentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_login', today.toISOString());
    if (branchId) activeStudentsQuery = activeStudentsQuery.eq('branch_id', branchId);
    const { count: activeStudents } = await activeStudentsQuery;

    // Get tests this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

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
        const result = {
          stats: { totalStudents: 0, activeStudents: 0, testsThisWeek: 0, avgScore: 0 },
          permissions: req.user?.role === 'super_admin' || req.user?.role === 'admin' ? null : undefined,
          recentActivity: [],
        };
        cacheSet(cacheKey, result, CACHE_TTL.SHORT);
        res.json({ success: true, data: result });
        return;
      }
      testsThisWeekQuery = testsThisWeekQuery.in('student_id', branchStudentIds);
    }
    const { count: testsThisWeek } = await testsThisWeekQuery;

    // Get average score
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

    // Get recent activity
    const { data: recentActivity } = await supabaseAdmin
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const result = {
      stats: {
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        testsThisWeek: testsThisWeek || 0,
        avgScore: Math.round(avgScore * 10) / 10,
      },
      permissions: req.user?.role === 'super_admin' || req.user?.role === 'admin' ? null : 'fetched', // Null = all permissions
      recentActivity: recentActivity || [],
    };

    // Cache for 60 seconds
    cacheSet(cacheKey, result, CACHE_TTL.SHORT);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get aggregated dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
};

/**
 * GET /admin/aggregated/branch-overview
 * 
 * Returns combined branch data: branches + courses + student counts
 */
export const getAggregatedBranchOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const branchId = getUserBranchId(req.user);
    const cacheKey = makeCacheKey(['admin', 'branch-overview', 'agg', userId]);

    const cached = cacheGet<any>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true });
      return;
    }

    // Get branches
    let branchesQuery = supabaseAdmin.from('branches').select('*');
    if (branchId) branchesQuery = branchesQuery.eq('id', branchId);
    const { data: branches } = await branchesQuery;

    // Get courses with student counts
    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('*, branches(name)')
      .order('name');

    // Get student counts per branch
    const { data: studentCounts } = await supabaseAdmin
      .from('students')
      .select('branch_id, count')
      .eq('is_active', true);

    // Aggregate student counts by branch
    const branchStudentCounts: Record<string, number> = {};
    studentCounts?.forEach((s: any) => {
      if (s.branch_id) {
        branchStudentCounts[s.branch_id] = (branchStudentCounts[s.branch_id] || 0) + s.count;
      }
    });

    // Add student counts to branches
    const branchesWithCounts = (branches || []).map((b: any) => ({
      ...b,
      studentCount: branchStudentCounts[b.id] || 0,
    }));

    const result = {
      branches: branchesWithCounts,
      courses: courses || [],
      summary: {
        totalBranches: branches?.length || 0,
        totalCourses: courses?.length || 0,
        totalStudents: Object.values(branchStudentCounts).reduce((a, b) => a + b, 0),
      },
    };

    cacheSet(cacheKey, result, CACHE_TTL.MEDIUM);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get aggregated branch overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch overview' });
  }
};

/**
 * GET /admin/aggregated/students-overview
 * 
 * Returns combined student data: students + recent results + attendance summary
 */
export const getAggregatedStudentsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const branchId = getUserBranchId(req.user);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const cacheKey = makeCacheKey(['admin', 'students-overview', 'agg', userId, page, limit]);

    const cached = cacheGet<any>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Get students with basic info
    let studentsQuery = supabaseAdmin
      .from('students')
      .select('id, name, email, roll_number, phone, status, is_active, branch_id, created_at, last_login', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (branchId) studentsQuery = studentsQuery.eq('branch_id', branchId);
    const { data: students, count: total } = await studentsQuery;

    if (!students || students.length === 0) {
      const result = { students: [], pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } };
      res.json({ success: true, data: result });
      return;
    }

    const studentIds = students.map((s: any) => s.id);

    // Get recent results for these students
    const { data: recentResults } = await supabaseAdmin
      .from('results')
      .select('id, student_id, test_id, score, percentage, status, submitted_at, tests(title)')
      .in('student_id', studentIds)
      .order('submitted_at', { ascending: false })
      .limit(50);

    // Get attendance summary for these students
    const { data: attendanceSummary } = await supabaseAdmin
      .from('attendance')
      .select('student_id, status')
      .in('student_id', studentIds);

    // Group results by student
    const resultsByStudent: Record<string, any[]> = {};
    recentResults?.forEach((r: any) => {
      if (!resultsByStudent[r.student_id]) resultsByStudent[r.student_id] = [];
      resultsByStudent[r.student_id].push(r);
    });

    // Calculate attendance % by student
    const attendanceByStudent: Record<string, { present: number; total: number }> = {};
    attendanceSummary?.forEach((a: any) => {
      if (!attendanceByStudent[a.student_id]) {
        attendanceByStudent[a.student_id] = { present: 0, total: 0 };
      }
      attendanceByStudent[a.student_id].total++;
      if (a.status === 'present') attendanceByStudent[a.student_id].present++;
    });

    // Combine data
    const enrichedStudents = students.map((s: any) => ({
      ...s,
      recentResults: (resultsByStudent[s.id] || []).slice(0, 3),
      attendanceRate: attendanceByStudent[s.id]
        ? Math.round((attendanceByStudent[s.id].present / attendanceByStudent[s.id].total) * 100)
        : null,
    }));

    const result = {
      students: enrichedStudents,
      pagination: {
        total: total || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((total || 0) / Number(limit)),
      },
    };

    cacheSet(cacheKey, result, CACHE_TTL.SHORT);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get aggregated students overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch students overview' });
  }
};

/**
 * GET /admin/aggregated/payments-overview
 * 
 * Returns combined payment data: payments + receipts + defaulters summary
 */
export const getAggregatedPaymentsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const branchId = getUserBranchId(req.user);
    const cacheKey = makeCacheKey(['admin', 'payments-overview', 'agg', userId]);

    const cached = cacheGet<any>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true });
      return;
    }

    // Get recent payments
    let paymentsQuery = supabaseAdmin
      .from('payments')
      .select('*, students(name, email, roll_number), courses(name)')
      .order('payment_date', { ascending: false })
      .limit(50);

    if (branchId) {
      const { data: branchStudents } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('branch_id', branchId);
      const studentIds = (branchStudents || []).map((s: any) => s.id);
      if (studentIds.length > 0) {
        paymentsQuery = paymentsQuery.in('student_id', studentIds);
      }
    }
    const { data: recentPayments } = await paymentsQuery;

    // Get total collected
    const { data: totalCollected } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const collected = totalCollected?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

    // Get pending payments
    const { count: pendingCount } = await supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get defaulters (students with overdue payments)
    const now = new Date().toISOString();
    const { data: defaulters } = await supabaseAdmin
      .from('payments')
      .select('student_id, amount, due_date, students(name, email)')
      .eq('status', 'pending')
      .lt('due_date', now)
      .limit(20);

    const result = {
      recentPayments: recentPayments || [],
      summary: {
        totalCollected: collected,
        pendingCount: pendingCount || 0,
        defaultersCount: defaulters?.length || 0,
      },
      defaulters: defaulters || [],
    };

    cacheSet(cacheKey, result, CACHE_TTL.MEDIUM);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get aggregated payments overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments overview' });
  }
};

/**
 * GET /admin/aggregated/tests-overview
 * 
 * Returns combined test data: tests + results + analytics summary
 */
export const getAggregatedTestsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const branchId = getUserBranchId(req.user);
    const cacheKey = makeCacheKey(['admin', 'tests-overview', 'agg', userId]);

    const cached = cacheGet<any>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true });
      return;
    }

    // Get all tests
    const { data: tests } = await supabaseAdmin
      .from('tests')
      .select('*, courses(name), subjects(name)')
      .order('created_at', { ascending: false });

    if (!tests || tests.length === 0) {
      const result = { tests: [], summary: { totalTests: 0, totalAttempts: 0, avgPassRate: 0 } };
      res.json({ success: true, data: result });
      return;
    }

    const testIds = tests.map((t: any) => t.id);

    // Get results count per test
    const { data: resultsCount } = await supabaseAdmin
      .from('results')
      .select('test_id, status, percentage')
      .in('test_id', testIds);

    // Aggregate results by test
    const resultsByTest: Record<string, { total: number; passed: number; avgScore: number }> = {};
    resultsCount?.forEach((r: any) => {
      if (!resultsByTest[r.test_id]) {
        resultsByTest[r.test_id] = { total: 0, passed: 0, avgScore: 0 };
      }
      resultsByTest[r.test_id].total++;
      if (r.status === 'passed') resultsByTest[r.test_id].passed++;
      resultsByTest[r.test_id].avgScore += r.percentage || 0;
    });

    // Calculate averages
    Object.keys(resultsByTest).forEach((testId) => {
      if (resultsByTest[testId].total > 0) {
        resultsByTest[testId].avgScore = Math.round(resultsByTest[testId].avgScore / resultsByTest[testId].total);
      }
    });

    // Enrich tests with results
    const enrichedTests = tests.map((t: any) => ({
      ...t,
      resultStats: resultsByTest[t.id] || { total: 0, passed: 0, avgScore: 0 },
    }));

    // Calculate overall summary
    const totalAttempts = Object.values(resultsByTest).reduce((sum, r) => sum + r.total, 0);
    const totalPassed = Object.values(resultsByTest).reduce((sum, r) => sum + r.passed, 0);
    const avgPassRate = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0;

    const result = {
      tests: enrichedTests,
      summary: {
        totalTests: tests.length,
        totalAttempts,
        avgPassRate,
      },
    };

    cacheSet(cacheKey, result, CACHE_TTL.SHORT);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get aggregated tests overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tests overview' });
  }
};

/**
 * GET /admin/aggregated/notifications-overview
 * 
 * Returns combined notification data: notifications + read status + statistics
 */
export const getAggregatedNotificationsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const cacheKey = makeCacheKey(['admin', 'notifications-overview', 'agg', userId]);

    const cached = cacheGet<any>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true });
      return;
    }

    // Get recent notifications
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    // Get notification statistics
    const { data: allNotifications } = await supabaseAdmin
      .from('notifications')
      .select('is_read, type');

    const total = allNotifications?.length || 0;
    const unread = allNotifications?.filter((n: any) => !n.is_read).length || 0;
    
    // Count by type
    const typeCounts: Record<string, number> = {};
    allNotifications?.forEach((n: any) => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    const result = {
      notifications: notifications || [],
      stats: {
        total,
        unread,
        read: total - unread,
        types: typeCounts,
      },
    };

    cacheSet(cacheKey, result, CACHE_TTL.SHORT);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get aggregated notifications overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications overview' });
  }
};

export default {
  getAggregatedDashboard,
  getAggregatedBranchOverview,
  getAggregatedStudentsOverview,
  getAggregatedPaymentsOverview,
  getAggregatedTestsOverview,
  getAggregatedNotificationsOverview,
};