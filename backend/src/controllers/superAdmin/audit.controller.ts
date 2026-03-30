import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      admin_id,
      action,
      entity_type,
      start_date,
      end_date
    } = req.query;

    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        admins (
          id,
          name,
          email,
          role
        )
      `, { count: 'exact' });

    // Apply filters
    if (admin_id) {
      query = query.eq('admin_id', admin_id);
    }

    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%,entity_id.ilike.%${search}%`);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
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
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};

export const getAuditStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('action, entity_type, created_at, admin_id');

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: logs } = await query;

    const total = logs?.length || 0;

    // Action breakdown
    const actionBreakdown = logs?.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Entity type breakdown
    const entityBreakdown = logs?.reduce((acc, log) => {
      const entity = log.entity_type || 'unknown';
      acc[entity] = (acc[entity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Top active admins
    const adminActivity = logs?.reduce((acc, log) => {
      if (log.admin_id) {
        acc[log.admin_id] = (acc[log.admin_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const topAdmins = Object.entries(adminActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Daily activity (last 7 days)
    const dailyActivity = logs?.reduce((acc, log) => {
      const date = new Date(log.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    res.json({
      success: true,
      data: {
        total,
        actionBreakdown,
        entityBreakdown,
        topAdmins: topAdmins.map(([adminId, count]) => ({ adminId, count })),
        dailyActivity
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit stats' });
  }
};

export const exportAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        admins (
          id,
          name,
          email
        )
      `);

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: logs } = await query;

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['ID', 'Admin Name', 'Admin Email', 'Action', 'Entity Type', 'Entity ID', 'Created At', 'IP Address'];
      const rows = logs?.map(log => [
        log.id,
        log.admins?.name || 'N/A',
        log.admins?.email || 'N/A',
        log.action,
        log.entity_type || 'N/A',
        log.entity_id || 'N/A',
        log.created_at,
        log.ip_address || 'N/A'
      ]) || [];

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: logs || []
      });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to export audit logs' });
  }
};
