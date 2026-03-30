import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAllComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      branch_id,
      status,
      priority
    } = req.query;

    let query = supabaseAdmin
      .from('complaints')
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
        ),
        complaint_replies (
          id,
          message,
          replied_by,
          created_at
        )
      `, { count: 'exact' });

    // Apply filters
    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
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
      console.error('Error fetching complaints:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
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
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
  }
};

export const getComplaintById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: complaint, error } = await supabaseAdmin
      .from('complaints')
      .select(`
        *,
        students!inner (
          id,
          name,
          email,
          phone,
          branch_id
        ),
        branches (
          id,
          name,
          location,
          contact_number
        ),
        complaint_replies (
          *,
          admins (
            id,
            name,
            role
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaint' });
  }
};

export const resolveComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    const adminId = req.user?.id;

    const { data: complaint, error } = await supabaseAdmin
      .from('complaints')
      .update({
        status: 'resolved',
        resolution_notes,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error resolving complaint:', error);
      res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
      return;
    }

    res.json({
      success: true,
      data: complaint,
      message: 'Complaint resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving complaint:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
  }
};

export const overrideBranchAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const adminId = req.user?.id;

    const { data: complaint, error } = await supabaseAdmin
      .from('complaints')
      .update({
        status,
        override_notes: notes,
        override_by: adminId,
        override_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error overriding branch admin:', error);
      res.status(500).json({ success: false, error: 'Failed to override branch admin' });
      return;
    }

    res.json({
      success: true,
      data: complaint,
      message: 'Complaint status overridden successfully'
    });
  } catch (error) {
    console.error('Error overriding branch admin:', error);
    res.status(500).json({ success: false, error: 'Failed to override branch admin' });
  }
};

export const getComplaintStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id } = req.query;

    let query = supabaseAdmin
      .from('complaints')
      .select('status, priority, branch_id, created_at');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data: complaints } = await query;

    const total = complaints?.length || 0;
    const open = complaints?.filter(c => c.status === 'open').length || 0;
    const inProgress = complaints?.filter(c => c.status === 'in_progress').length || 0;
    const resolved = complaints?.filter(c => c.status === 'resolved').length || 0;

    // Priority breakdown
    const highPriority = complaints?.filter(c => c.priority === 'high').length || 0;
    const mediumPriority = complaints?.filter(c => c.priority === 'medium').length || 0;
    const lowPriority = complaints?.filter(c => c.priority === 'low').length || 0;

    // Branch breakdown
    const branchBreakdown = complaints?.reduce((acc, c) => {
      const branchId = c.branch_id || 'unassigned';
      acc[branchId] = (acc[branchId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    res.json({
      success: true,
      data: {
        total,
        open,
        inProgress,
        resolved,
        highPriority,
        mediumPriority,
        lowPriority,
        branchBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching complaint stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaint stats' });
  }
};
