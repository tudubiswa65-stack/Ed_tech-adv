import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAllFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      branch_id,
      type,
      rating
    } = req.query;

    let query = supabaseAdmin
      .from('feedback')
      .select(`
        *,
        students!inner (
          id,
          name,
          email,
          branch_id
        ),
        branches (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply filters
    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (rating) {
      query = query.eq('rating', parseInt(rating as string));
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,message.ilike.%${search}%,students.name.ilike.%${search}%`);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
      return;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

export const getFeedbackAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id, start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('feedback')
      .select('type, rating, branch_id, subject, message, created_at');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: feedback } = await query;

    const total = feedback?.length || 0;

    // Rating distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
      const count = feedback?.filter(f => f.rating === rating).length || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return { rating, count, percentage: Math.round(percentage * 100) / 100 };
    });

    const averageRating = total > 0 && feedback
      ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / total
      : 0;

    // Type breakdown
    const typeBreakdown = feedback?.reduce((acc, f) => {
      const type = f.type || 'other';
      if (!acc[type]) {
        acc[type] = { count: 0, totalRating: 0 };
      }
      acc[type].count++;
      acc[type].totalRating += f.rating || 0;
      return acc;
    }, {} as Record<string, { count: number; totalRating: number }>) || {};

    const typeStats = Object.entries(typeBreakdown).map(([type, stats]) => ({
      type,
      count: stats.count,
      averageRating: stats.count > 0 ? Math.round((stats.totalRating / stats.count) * 100) / 100 : 0
    }));

    // Branch breakdown
    const branchBreakdown = feedback?.reduce((acc, f) => {
      const branchId = f.branch_id || 'unassigned';
      if (!acc[branchId]) {
        acc[branchId] = { count: 0, totalRating: 0 };
      }
      acc[branchId].count++;
      acc[branchId].totalRating += f.rating || 0;
      return acc;
    }, {} as Record<string, { count: number; totalRating: number }>) || {};

    // Monthly trend
    const monthlyTrend = feedback?.reduce((acc, f) => {
      const month = new Date(f.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!acc[month]) {
        acc[month] = { count: 0, totalRating: 0 };
      }
      acc[month].count++;
      acc[month].totalRating += f.rating || 0;
      return acc;
    }, {} as Record<string, { count: number; totalRating: number }>) || {};

    const trendData = Object.entries(monthlyTrend).map(([month, stats]) => ({
      month,
      count: stats.count,
      averageRating: stats.count > 0 ? Math.round((stats.totalRating / stats.count) * 100) / 100 : 0
    }));

    res.json({
      success: true,
      data: {
        total,
        ratingDistribution,
        averageRating: Math.round(averageRating * 100) / 100,
        typeStats,
        branchBreakdown: Object.entries(branchBreakdown).map(([branchId, stats]) => ({
          branchId,
          count: stats.count,
          averageRating: stats.count > 0 ? Math.round((stats.totalRating / stats.count) * 100) / 100 : 0
        })),
        monthlyTrend: trendData
      }
    });
  } catch (error) {
    console.error('Error fetching feedback analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback analytics' });
  }
};

export const getFeedbackByBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id } = req.params;

    const { data: feedback, error } = await supabaseAdmin
      .from('feedback')
      .select(`
        *,
        students!inner (
          id,
          name,
          email
        )
      `)
      .eq('branch_id', branch_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching branch feedback:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branch feedback' });
      return;
    }

    const total = feedback?.length || 0;
    const averageRating = total > 0 && feedback
      ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / total
      : 0;

    res.json({
      success: true,
      data: {
        feedback: feedback || [],
        stats: {
          total,
          averageRating: Math.round(averageRating * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branch feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch feedback' });
  }
};
