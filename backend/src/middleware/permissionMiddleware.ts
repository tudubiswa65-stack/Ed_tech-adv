import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { supabaseAdmin } from '../db/supabaseAdmin';
import { PermissionKey } from '../utils/permissions';

/**
 * Middleware factory that enforces a specific permission for branch_admin users.
 * super_admin and admin roles bypass all permission checks entirely.
 */
export const requirePermission = (permission: PermissionKey) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // super_admin and admin bypass permission checks entirely
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
      next();
      return;
    }

    if (req.user?.role !== 'branch_admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('branch_admin_permissions')
        .select('permissions')
        .eq('user_id', req.user.id)
        .single();

      if (error || !data?.permissions?.[permission]) {
        res.status(403).json({
          error: 'Access Denied. Contact your Super Admin to enable this feature.',
          permission_required: permission,
        });
        return;
      }

      next();
    } catch {
      res.status(403).json({
        error: 'Access Denied. Contact your Super Admin to enable this feature.',
        permission_required: permission,
      });
    }
  };
};
