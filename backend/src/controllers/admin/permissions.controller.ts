import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import { ALL_PERMISSIONS, DEFAULT_PERMISSIONS } from '../../utils/permissions';

/**
 * GET /admin/my-permissions
 *
 * Returns the current user's effective permissions.
 * - super_admin / admin  → all permissions are true
 * - branch_admin         → fetched from branch_admin_permissions table, merged with defaults
 */
export const getMyPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
      const allTrue = Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true]));
      res.json({ success: true, data: { permissions: allTrue } });
      return;
    }

    const { data } = await supabaseAdmin
      .from('branch_admin_permissions')
      .select('permissions')
      .eq('user_id', req.user!.id)
      .single();

    res.json({
      success: true,
      data: {
        permissions: { ...DEFAULT_PERMISSIONS, ...(data?.permissions || {}) },
      },
    });
  } catch {
    res.json({ success: true, data: { permissions: DEFAULT_PERMISSIONS } });
  }
};
