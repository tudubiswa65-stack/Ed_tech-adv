import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import bcrypt from 'bcryptjs';

export const getAllBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;

    let query = supabaseAdmin
      .from('branches')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branches' });
      return;
    }

    const branches = data || [];

    if (branches.length === 0) {
      res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      });
      return;
    }

    const branchIds = branches.map((b: any) => b.id);

    // Fetch student counts and completed payments per branch in parallel
    const [studentsResult, paymentsResult] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('branch_id, status')
        .eq('role', 'student')
        .in('branch_id', branchIds),
      supabaseAdmin
        .from('payments')
        .select('branch_id, amount')
        .eq('status', 'completed')
        .in('branch_id', branchIds),
    ]);

    if (studentsResult.error) {
      console.error('Error fetching student stats for branches:', studentsResult.error);
    }
    if (paymentsResult.error) {
      console.error('Error fetching payment stats for branches:', paymentsResult.error);
    }

    // Build lookup maps — count total and active students in a single pass
    const totalStudentsMap: Record<string, number> = {};
    const activeStudentsMap: Record<string, number> = {};
    const revenueMap: Record<string, number> = {};

    for (const s of studentsResult.data || []) {
      totalStudentsMap[s.branch_id] = (totalStudentsMap[s.branch_id] || 0) + 1;
      if (s.status === 'ACTIVE') {
        activeStudentsMap[s.branch_id] = (activeStudentsMap[s.branch_id] || 0) + 1;
      }
    }
    for (const p of paymentsResult.data || []) {
      revenueMap[p.branch_id] = (revenueMap[p.branch_id] || 0) + (p.amount || 0);
    }

    const enrichedBranches = branches.map((b: any) => ({
      ...b,
      total_students: totalStudentsMap[b.id] || 0,
      active_students: activeStudentsMap[b.id] || 0,
      total_revenue: revenueMap[b.id] || 0,
    }));

    res.json({
      success: true,
      data: enrichedBranches,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
};

export const getBranchById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: branch, error } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !branch) {
      res.status(404).json({ success: false, error: 'Branch not found' });
      return;
    }

    // Get branch statistics
    const { data: stats } = await supabaseAdmin
      .from('branch_statistics')
      .select('*')
      .eq('id', id)
      .single();

    res.json({
      success: true,
      data: { ...branch, stats }
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch' });
  }
};

export const createBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, location, contact_number, admin_email, admin_password, admin_name } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Branch name is required' });
      return;
    }

    // Create branch
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .insert({
        name,
        location,
        contact_number,
        is_active: true
      })
      .select()
      .single();

    if (branchError) {
      console.error('Error creating branch:', branchError);
      res.status(500).json({ success: false, error: 'Failed to create branch' });
      return;
    }

    // Create branch admin if credentials provided
    if (admin_email && admin_password && admin_name) {
      const password_hash = await bcrypt.hash(admin_password, 12);

      await supabaseAdmin
        .from('users')
        .insert({
          name: admin_name,
          email: admin_email,
          password_hash,
          role: 'branch_admin',
          status: 'ACTIVE',
          is_active: true,
          branch_id: branch.id
        });
    }

    res.json({
      success: true,
      data: branch
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, error: 'Failed to create branch' });
  }
};

export const updateBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, location, contact_number, is_active } = req.body;

    const { data: branch, error } = await supabaseAdmin
      .from('branches')
      .update({
        name,
        location,
        contact_number,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating branch:', error);
      res.status(500).json({ success: false, error: 'Failed to update branch' });
      return;
    }

    res.json({
      success: true,
      data: branch
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, error: 'Failed to update branch' });
  }
};

export const deleteBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({ success: false, error: 'Failed to delete branch' });
      return;
    }

    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, error: 'Failed to delete branch' });
  }
};

export const toggleBranchStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('is_active')
      .eq('id', id)
      .single();

    if (!branch) {
      res.status(404).json({ success: false, error: 'Branch not found' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('branches')
      .update({ is_active: !branch.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling branch status:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle branch status' });
      return;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error toggling branch status:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle branch status' });
  }
};

export const getBranchDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get branch info
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    if (branchError || !branch) {
      res.status(404).json({ success: false, error: 'Branch not found' });
      return;
    }

    // Get students count
    const { count: studentCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('branch_id', id);

    // Get courses count
    const { count: courseCount } = await supabaseAdmin
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', id);

    // Get payments total
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, status')
      .eq('branch_id', id);

    const totalRevenue = payments?.reduce((sum, p) => {
      return p.status === 'completed' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    // Get recent activities
    const { data: activities } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'branch')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      data: {
        ...branch,
        stats: {
          studentCount: studentCount || 0,
          courseCount: courseCount || 0,
          totalRevenue,
          recentActivities: activities || []
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branch details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch details' });
  }
};

export const assignBranchAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ branch_id: id })
      .eq('id', admin_id)
      .eq('role', 'branch_admin')
      .select()
      .single();

    if (error) {
      console.error('Error assigning branch admin:', error);
      res.status(500).json({ success: false, error: 'Failed to assign branch admin' });
      return;
    }

    res.json({
      success: true,
      data,
      message: 'Branch admin assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning branch admin:', error);
    res.status(500).json({ success: false, error: 'Failed to assign branch admin' });
  }
};
