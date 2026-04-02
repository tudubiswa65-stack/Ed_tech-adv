import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

/** Escape PostgREST ilike wildcard characters in a user-supplied string. */
function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, c => `\\${c}`);
}

/** Safely serialize a value to a CSV cell string. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      admin_id,
      action,
      entity_type,
      // Accept both date_from/date_to (frontend) and start_date/end_date (legacy)
      date_from,
      date_to,
      start_date,
      end_date
    } = req.query;

    const from_date = (date_from || start_date) as string | undefined;
    const to_date = (date_to || end_date) as string | undefined;

    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        description,
        ip_address,
        created_at,
        admin_id,
        users!audit_logs_admin_id_fkey (
          id,
          name,
          email,
          role
        )
      `, { count: 'exact' });

    if (admin_id) {
      query = query.eq('admin_id', admin_id);
    }

    if (action) {
      query = query.ilike('action', `%${escapeIlike(action as string)}%`);
    }

    if (entity_type) {
      query = query.ilike('entity_type', `%${escapeIlike(entity_type as string)}%`);
    }

    if (from_date) {
      query = query.gte('created_at', from_date);
    }

    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    if (search) {
      const safe = escapeIlike(search as string);
      query = query.or(`action.ilike.%${safe}%,entity_type.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
      return;
    }

    // Flatten nested user relation to admin_name for frontend compatibility
    const rows = (data || []).map((log: Record<string, unknown>) => {
      const { users, ...rest } = log as Record<string, unknown> & { users?: { name?: string } | null };
      return {
        ...rest,
        admin_name: users?.name || 'N/A'
      };
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};

export const getAuditStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('admin_id, created_at');

    if (error) {
      console.error('Error fetching audit stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch audit stats' });
      return;
    }

    const total_logs = logs?.length || 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today_actions = logs?.filter(
      log => new Date(log.created_at) >= todayStart
    ).length || 0;

    const unique_admins = new Set(
      logs?.filter(l => l.admin_id).map(l => l.admin_id)
    ).size;

    res.json({
      success: true,
      data: { total_logs, today_actions, unique_admins }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit stats' });
  }
};

export const exportAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      date_from,
      date_to,
      start_date,
      end_date,
      format = 'csv'
    } = req.query;

    const from_date = (date_from || start_date) as string | undefined;
    const to_date = (date_to || end_date) as string | undefined;

    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        description,
        ip_address,
        created_at,
        users!audit_logs_admin_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (from_date) {
      query = query.gte('created_at', from_date);
    }

    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({ success: false, error: 'Failed to export audit logs' });
      return;
    }

    if (format === 'json') {
      res.json({ success: true, data: logs || [] });
      return;
    }

    // Default: CSV
    const headers = ['ID', 'Admin Name', 'Admin Email', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Created At', 'IP Address'];
    const rows = (logs || []).map((log: Record<string, unknown>) => {
      const user = log.users as { name?: string; email?: string } | null;
      return [
        csvCell(log.id),
        user?.name || 'N/A',
        user?.email || 'N/A',
        csvCell(log.action),
        csvCell(log.entity_type) || 'N/A',
        csvCell(log.entity_id) || 'N/A',
        csvCell(log.description) || 'N/A',
        csvCell(log.created_at),
        csvCell(log.ip_address) || 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to export audit logs' });
  }
};
