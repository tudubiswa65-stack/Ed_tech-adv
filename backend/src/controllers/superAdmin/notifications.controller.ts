import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getNotificationsCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { since } = req.query;

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    if (since && typeof since === 'string') {
      query = query.gt('created_at', since);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching notifications count:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notifications count' });
      return;
    }

    res.json({ success: true, data: { count: count ?? 0 } });
  } catch (error) {
    console.error('Error fetching notifications count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications count' });
  }
};

export const getAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      branch_id,
      type,
      targetAudience,
      category
    } = req.query;

    let query = supabaseAdmin
      .from('notifications')
      .select(`
        *,
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

    if (targetAudience) {
      query = query.eq('target_audience', targetAudience);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
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
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Maps targetAudience values to the legacy target_type column's allowed values.
const TARGET_TYPE_MAP: Record<string, string> = {
  all: 'all',
  students: 'all',
  admins: 'all',
  branches: 'all',
  course: 'course',
  student: 'student',
};

export const createNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      message,
      // Accept both the new field name (matching branch admin UI) and the legacy field name
      targetAudience,
      target,
      type = 'info',
      category,
      branch_id,
      scheduled_at,
      scheduledAt,
      action_url,
      actionUrl,
    } = req.body;

    // Prefer targetAudience (new), fall back to target (legacy)
    const resolvedAudience = (targetAudience || target || 'all') as string;

    if (!title || !message) {
      res.status(400).json({ success: false, error: 'Title and message are required' });
      return;
    }

    const VALID_TYPES = ['info', 'warning', 'success', 'error'] as const;
    const resolvedType = VALID_TYPES.includes(type as typeof VALID_TYPES[number]) ? type as typeof VALID_TYPES[number] : 'info';

    const resolvedTargetType = TARGET_TYPE_MAP[resolvedAudience] ?? 'all';
    const resolvedScheduledAt = scheduled_at || scheduledAt || null;
    const resolvedActionUrl = action_url || actionUrl || null;

    const adminId = req.user?.id;

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        title,
        message,
        type: resolvedType,
        target_audience: resolvedAudience,
        target_type: resolvedTargetType,
        category: category || null,
        branch_id: branch_id || null,
        scheduled_at: resolvedScheduledAt,
        action_url: resolvedActionUrl,
        // Mark as sent immediately (same behaviour as branch admin createNotification)
        sent_at: resolvedScheduledAt ? null : new Date().toISOString(),
        created_by: adminId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', JSON.stringify(error));
      res.status(500).json({ success: false, error: 'Failed to create notification' });
      return;
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
};

export const updateNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      message,
      targetAudience,
      target,
      type,
      category,
      branch_id,
      scheduled_at,
      scheduledAt,
      action_url,
      actionUrl,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (title) updateData.title = title;
    if (message) updateData.message = message;
    const resolvedAudience = targetAudience || target;
    if (resolvedAudience) {
      updateData.target_audience = resolvedAudience;
      updateData.target_type = TARGET_TYPE_MAP[resolvedAudience] ?? 'all';
    }
    if (type) updateData.type = type;
    if (category) updateData.category = category;
    if (branch_id !== undefined) updateData.branch_id = branch_id;
    const resolvedScheduledAt = scheduled_at !== undefined ? scheduled_at : scheduledAt;
    if (resolvedScheduledAt !== undefined) updateData.scheduled_at = resolvedScheduledAt;
    const resolvedActionUrl = action_url !== undefined ? action_url : actionUrl;
    if (resolvedActionUrl !== undefined) updateData.action_url = resolvedActionUrl;

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      res.status(500).json({ success: false, error: 'Failed to update notification' });
      return;
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ success: false, error: 'Failed to delete notification' });
      return;
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

export const getNotificationStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('priority, category, created_at, scheduled_at');

    const total = notifications?.length || 0;
    const highPriority = notifications?.filter(n => n.priority === 'high' || n.priority === 'urgent').length || 0;
    const scheduled = notifications?.filter(n => n.scheduled_at && new Date(n.scheduled_at) > new Date()).length || 0;

    // Category breakdown
    const categoryBreakdown = notifications?.reduce((acc, n) => {
      const cat = n.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    res.json({
      success: true,
      data: {
        total,
        highPriority,
        scheduled,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification stats' });
  }
};
