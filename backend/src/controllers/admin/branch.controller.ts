import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';
import { getUserBranchId } from '../../utils/branchFilter';

export const getBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branchId = getUserBranchId(req.user);

    let query = supabaseAdmin
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    // branch_admin may only see their own branch
    if (branchId) {
      query = query.eq('id', branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only super_admin may create branches
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'Only super admins can create branches' });
      return;
    }

    const { name, location, contact_number } = req.body;

    const { data, error } = await supabaseAdmin
      .from('branches')
      .insert({
        name,
        location,
        contact_number,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const branchId = getUserBranchId(req.user);

    // branch_admin can only update their own branch
    if (branchId && branchId !== id) {
      res.status(403).json({ success: false, error: 'You can only update your own branch' });
      return;
    }

    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('branches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only super_admin may delete branches
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'Only super admins can delete branches' });
      return;
    }

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
