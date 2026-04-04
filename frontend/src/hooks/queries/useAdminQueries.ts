import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { permissionsQueryKeys, fetchMyPermissions, PermissionKey } from '@/hooks/usePermissions';

// ── Query key factory ─────────────────────────────────────────────────────────

export const adminQueryKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminQueryKeys.all, 'dashboard'] as const,
  branches: () => [...adminQueryKeys.all, 'branches'] as const,
  courses: () => [...adminQueryKeys.all, 'courses'] as const,
  attendance: (branch: string, course: string, date: string) =>
    [...adminQueryKeys.all, 'attendance', { branch, course, date }] as const,
  students: (params: Record<string, string | number>) =>
    [...adminQueryKeys.all, 'students', params] as const,
};

// ── Admin Dashboard ───────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalStudents: number;
  activeStudents: number;
  testsThisWeek: number;
  avgScore: number;
  recentActivity: unknown[];
}

export function useAdminDashboard() {
  return useQuery<AdminDashboardStats>({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/dashboard');
      return response.data.data ?? response.data;
    },
  });
}

// ── Branches (shared reference data — long cache) ────────────────────────────

interface Branch {
  id: string;
  name: string;
}

export function useAdminBranches() {
  return useQuery<Branch[]>({
    queryKey: adminQueryKeys.branches(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/branches');
      return response.data.data ?? [];
    },
    // Branches rarely change; extend staleTime to 30 minutes for reference data
    staleTime: 30 * 60 * 1000,
  });
}

// ── Courses (shared reference data — long cache) ─────────────────────────────

interface Course {
  id: string;
  name: string;
}

export function useAdminCourses() {
  return useQuery<Course[]>({
    queryKey: adminQueryKeys.courses(),
    queryFn: async () => {
      const response = await apiClient.get<{ courses: Course[] }>('/admin/courses');
      return response.data.courses ?? [];
    },
    // Courses rarely change; extend staleTime to 30 minutes for reference data
    staleTime: 30 * 60 * 1000,
  });
}

// ── Attendance (parameterised by branch / course / date) ─────────────────────

export function useAdminAttendance(branch: string, course: string, date: string) {
  return useQuery({
    queryKey: adminQueryKeys.attendance(branch, course, date),
    queryFn: async () => {
      const params = new URLSearchParams({ date });
      if (branch) params.set('branch_id', branch);
      if (course) params.set('course_id', course);
      const response = await apiClient.get(`/admin/attendance?${params}`);
      return response.data.data ?? [];
    },
    // Keep attendance results for 5 minutes; re-fetch only when the key changes
    staleTime: 5 * 60 * 1000,
  });
}

// ── Consolidated Admin Dashboard Hook ─────────────────────────────────────────

export interface AdminDashboardWithPermissions {
  dashboard: AdminDashboardStats | undefined;
  permissions: Record<PermissionKey, boolean> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

interface UseAdminDashboardWithPermissionsOptions {
  // Set to true for super_admin/admin who have all permissions (skips fetch)
  skipPermissionsFetch?: boolean;
}

/**
 * Fetches admin dashboard stats and permissions in parallel with a single loading state.
 * For super_admin and admin roles, set skipPermissionsFetch=true to avoid unnecessary API call.
 */
export function useAdminDashboardWithPermissions(
  options: UseAdminDashboardWithPermissionsOptions = {}
): AdminDashboardWithPermissions {
  const { skipPermissionsFetch = false } = options;

  const results = useQueries({
    queries: [
      {
        queryKey: adminQueryKeys.dashboard(),
        queryFn: async () => {
          const response = await apiClient.get('/admin/dashboard');
          return response.data.data ?? response.data;
        },
      },
      {
        queryKey: permissionsQueryKeys.my(),
        queryFn: fetchMyPermissions,
        // 5 minute stale time for permissions
        staleTime: 5 * 60 * 1000,
        // Skip permissions fetch for roles that have all permissions
        enabled: !skipPermissionsFetch,
      },
    ],
  });

  const [dashboardResult, permissionsResult] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const error = results.find((r) => r.error)?.error;

  return {
    dashboard: dashboardResult.data,
    permissions: permissionsResult.data as Record<PermissionKey, boolean> | undefined,
    isLoading,
    isError,
    error,
  };
}
