'use client';
import { useState, useEffect } from 'react';
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

export function usePermissions(): PermissionsState {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // super_admin and admin have all permissions — no need to fetch
    if (user.role === 'super_admin' || user.role === 'admin') {
      setPermissions(
        Object.fromEntries(Object.keys(DEFAULT).map((k) => [k, true])) as Record<
          PermissionKey,
          boolean
        >
      );
      setLoading(false);
      return;
    }

    if (user.role !== 'branch_admin') {
      setLoading(false);
      return;
    }

    apiClient
      .get('/admin/my-permissions')
      .then((res) => {
        if (res.data?.success) {
          setPermissions({ ...DEFAULT, ...res.data.data.permissions });
        }
      })
      .catch(() => {
        // Fall back to defaults (all false) on error
      })
      .finally(() => setLoading(false));
  }, [user]);

  return {
    permissions,
    loading,
    hasPermission: (key: PermissionKey) => permissions[key] ?? false,
  };
}
