import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest, JWTPayload } from '../../types';
import { ALL_PERMISSIONS, DEFAULT_PERMISSIONS, PermissionKey } from '../../utils/permissions';

/** JWTPayload may include a `name` field that is not in the base type. */
type JWTPayloadWithName = JWTPayload & { name?: string };

/** Derive the Super Admin's display name from the request's JWT payload. */
function getUpdaterName(req: AuthRequest): string {
  const payload = req.user as JWTPayloadWithName | undefined;
  return payload?.name || payload?.email || 'Super Admin';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Verify target user exists and is a branch_admin. Returns user or sends error. */
async function resolveBranchAdmin(
  userId: string,
  res: Response
): Promise<{ id: string; name: string; email: string } | null> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role')
    .eq('id', userId)
    .single();

  if (error || !user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return null;
  }

  if (user.role !== 'branch_admin') {
    res.status(400).json({ success: false, error: 'Target user is not a branch_admin' });
    return null;
  }

  return user;
}

/** Fetch permissions row, merging with defaults so every key is present. */
async function fetchMergedPermissions(
  userId: string
): Promise<Record<PermissionKey, boolean>> {
  const { data } = await supabaseAdmin
    .from('branch_admin_permissions')
    .select('permissions')
    .eq('user_id', userId)
    .single();

  return { ...DEFAULT_PERMISSIONS, ...(data?.permissions ?? {}) } as Record<PermissionKey, boolean>;
}

// ---------------------------------------------------------------------------
// GET /super-admin/branch-admins/:userId/permissions
// ---------------------------------------------------------------------------
export const getBranchAdminPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await resolveBranchAdmin(userId, res);
    if (!user) return;

    const { data: row } = await supabaseAdmin
      .from('branch_admin_permissions')
      .select('permissions, updated_at, updated_by_name')
      .eq('user_id', userId)
      .single();

    const permissions = await fetchMergedPermissions(userId);

    res.json({
      success: true,
      data: {
        user_id: userId,
        user_name: user.name,
        user_email: user.email,
        permissions,
        updated_at: row?.updated_at ?? null,
        updated_by_name: row?.updated_by_name ?? null,
      },
    });
  } catch (err) {
    console.error('[getBranchAdminPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
};

// ---------------------------------------------------------------------------
// PUT /super-admin/branch-admins/:userId/permissions
// ---------------------------------------------------------------------------
export const updateBranchAdminPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body as { permissions: Record<string, boolean> };

    if (!permissions || typeof permissions !== 'object') {
      res.status(400).json({ success: false, error: 'permissions object is required' });
      return;
    }

    const user = await resolveBranchAdmin(userId, res);
    if (!user) return;

    // Only keep keys that are valid permission names
    const sanitized: Record<string, boolean> = {};
    for (const key of ALL_PERMISSIONS) {
      if (key in permissions) {
        sanitized[key] = Boolean(permissions[key]);
      }
    }

    const now = new Date().toISOString();
    const updaterName = getUpdaterName(req);

    const { data, error } = await supabaseAdmin
      .from('branch_admin_permissions')
      .upsert(
        {
          user_id: userId,
          permissions: sanitized,
          updated_by: req.user!.id,
          updated_by_name: updaterName,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[updateBranchAdminPermissions]', error);
      res.status(500).json({ success: false, error: 'Failed to update permissions' });
      return;
    }

    const mergedPermissions = await fetchMergedPermissions(userId);

    res.json({
      success: true,
      data: {
        user_id: userId,
        permissions: mergedPermissions,
        updated_at: data.updated_at,
        updated_by_name: data.updated_by_name,
      },
    });
  } catch (err) {
    console.error('[updateBranchAdminPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
};

// ---------------------------------------------------------------------------
// POST /super-admin/branch-admins/:userId/permissions/enable-all
// ---------------------------------------------------------------------------
export const enableAllPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await resolveBranchAdmin(userId, res);
    if (!user) return;

    const allTrue = Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true]));
    const now = new Date().toISOString();
    const updaterName = getUpdaterName(req);

    const { data, error } = await supabaseAdmin
      .from('branch_admin_permissions')
      .upsert(
        {
          user_id: userId,
          permissions: allTrue,
          updated_by: req.user!.id,
          updated_by_name: updaterName,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[enableAllPermissions]', error);
      res.status(500).json({ success: false, error: 'Failed to enable all permissions' });
      return;
    }

    res.json({
      success: true,
      data: {
        user_id: userId,
        permissions: allTrue,
        updated_at: data.updated_at,
        updated_by_name: data.updated_by_name,
      },
    });
  } catch (err) {
    console.error('[enableAllPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to enable all permissions' });
  }
};

// ---------------------------------------------------------------------------
// POST /super-admin/branch-admins/:userId/permissions/disable-all
// ---------------------------------------------------------------------------
export const disableAllPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await resolveBranchAdmin(userId, res);
    if (!user) return;

    const allFalse = Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, false]));
    const now = new Date().toISOString();
    const updaterName = getUpdaterName(req);

    const { data, error } = await supabaseAdmin
      .from('branch_admin_permissions')
      .upsert(
        {
          user_id: userId,
          permissions: allFalse,
          updated_by: req.user!.id,
          updated_by_name: updaterName,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[disableAllPermissions]', error);
      res.status(500).json({ success: false, error: 'Failed to disable all permissions' });
      return;
    }

    res.json({
      success: true,
      data: {
        user_id: userId,
        permissions: allFalse,
        updated_at: data.updated_at,
        updated_by_name: data.updated_by_name,
      },
    });
  } catch (err) {
    console.error('[disableAllPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to disable all permissions' });
  }
};

// ---------------------------------------------------------------------------
// Branch-scoped convenience endpoints
// These look up the branch_admin user for a branch, then delegate.
// ---------------------------------------------------------------------------

/** Resolve the branch_admin user for a given branchId. */
async function resolveBranchAdminForBranch(
  branchId: string,
  res: Response
): Promise<{ id: string; name: string; email: string } | null> {
  const { data: adminUser, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role')
    .eq('branch_id', branchId)
    .eq('role', 'branch_admin')
    .limit(1)
    .single();

  if (error || !adminUser) {
    res.status(404).json({
      success: false,
      error: 'No branch admin found for this branch',
    });
    return null;
  }

  return adminUser;
}

// GET /super-admin/branches/:branchId/admin-permissions
export const getBranchPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const adminUser = await resolveBranchAdminForBranch(branchId, res);
    if (!adminUser) return;

    const { data: row } = await supabaseAdmin
      .from('branch_admin_permissions')
      .select('permissions, updated_at, updated_by_name')
      .eq('user_id', adminUser.id)
      .single();

    const permissions = await fetchMergedPermissions(adminUser.id);

    res.json({
      success: true,
      data: {
        user_id: adminUser.id,
        user_name: adminUser.name,
        user_email: adminUser.email,
        permissions,
        updated_at: row?.updated_at ?? null,
        updated_by_name: row?.updated_by_name ?? null,
      },
    });
  } catch (err) {
    console.error('[getBranchPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
};

// PUT /super-admin/branches/:branchId/admin-permissions
export const updateBranchPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const adminUser = await resolveBranchAdminForBranch(branchId, res);
    if (!adminUser) return;

    // Delegate by injecting userId into params, then call the shared logic
    req.params.userId = adminUser.id;
    return updateBranchAdminPermissions(req, res);
  } catch (err) {
    console.error('[updateBranchPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
};

// POST /super-admin/branches/:branchId/admin-permissions/enable-all
export const enableBranchPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const adminUser = await resolveBranchAdminForBranch(branchId, res);
    if (!adminUser) return;

    req.params.userId = adminUser.id;
    return enableAllPermissions(req, res);
  } catch (err) {
    console.error('[enableBranchPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to enable permissions' });
  }
};

// POST /super-admin/branches/:branchId/admin-permissions/disable-all
export const disableBranchPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const adminUser = await resolveBranchAdminForBranch(branchId, res);
    if (!adminUser) return;

    req.params.userId = adminUser.id;
    return disableAllPermissions(req, res);
  } catch (err) {
    console.error('[disableBranchPermissions]', err);
    res.status(500).json({ success: false, error: 'Failed to disable permissions' });
  }
};
