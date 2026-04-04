'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

export type PermissionKey =
  | 'add_course'
  | 'edit_course'
  | 'delete_course'
  | 'add_student'
  | 'edit_student'
  | 'delete_student'
  | 'broadcast_message'
  | 'send_direct_message'
  | 'manage_notice_board'
  | 'manage_fees'
  | 'issue_receipts'
  | 'view_reports'
  | 'export_data';

export interface PermissionsState {
  permissions: Record<PermissionKey, boolean>;
  loading: boolean;
  hasPermission: (key: PermissionKey) => boolean;
}

const DEFAULT: Record<PermissionKey, boolean> = {
  add_course: false,
  edit_course: false,
  delete_course: false,
  add_student: false,
  edit_student: false,
  delete_student: false,
  broadcast_message: false,
  send_direct_message: false,
  manage_notice_board: false,
  manage_fees: false,
  issue_receipts: false,
  view_reports: false,
  export_data: false,
};

const ALL_TRUE = Object.fromEntries(
  Object.keys(DEFAULT).map((k) => [k, true])
) as Record<PermissionKey, boolean>;

// Query key factory for permissions
export const permissionsQueryKeys = {
  all: ['permissions'] as const,
  my: () => [...permissionsQueryKeys.all, 'my'] as const,
};

export async function fetchMyPermissions(): Promise<Record<PermissionKey, boolean>> {
  const response = await apiClient.get('/admin/my-permissions');
  if (response.data?.success) {
    return { ...DEFAULT, ...response.data.data.permissions };
  }
  return DEFAULT;
}

export function usePermissions(): PermissionsState {
  const { user } = useAuth();

  // super_admin and admin have all permissions — no need to fetch
  const hasAllPermissions = user?.role === 'super_admin' || user?.role === 'admin';
  const isBranchAdmin = user?.role === 'branch_admin';

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: permissionsQueryKeys.my(),
    queryFn: fetchMyPermissions,
    // 5 minute stale time for permissions - they rarely change during a session
    staleTime: 5 * 60 * 1000,
    // Only fetch for branch_admins who actually need permission checks
    enabled: !!user && isBranchAdmin && !hasAllPermissions,
    // Return defaults while loading
    placeholderData: DEFAULT,
  });

  const permissions = useMemo(() => {
    if (hasAllPermissions) {
      return ALL_TRUE;
    }
    return permissionsData ?? DEFAULT;
  }, [hasAllPermissions, permissionsData]);

  const hasPermission = (key: PermissionKey): boolean => {
    return permissions[key] ?? false;
  };

  return {
    permissions,
    loading: isBranchAdmin ? isLoading : false,
    hasPermission,
  };
}
