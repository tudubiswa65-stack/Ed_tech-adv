import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// ── Query key factory ─────────────────────────────────────────────────────────

export const superAdminQueryKeys = {
  all: ['super-admin'] as const,
  stats: () => [...superAdminQueryKeys.all, 'stats'] as const,
  studentGrowth: () => [...superAdminQueryKeys.all, 'student-growth'] as const,
  revenue: () => [...superAdminQueryKeys.all, 'revenue'] as const,
  attendance: () => [...superAdminQueryKeys.all, 'attendance'] as const,
  topBranches: () => [...superAdminQueryKeys.all, 'top-branches'] as const,
  notifications: (page: number, filters: Record<string, string>) =>
    [...superAdminQueryKeys.all, 'notifications', { page, ...filters }] as const,
  branches: () => [...superAdminQueryKeys.all, 'branches'] as const,
};

// ── Super Admin Notification Count ───────────────────────────────────────────

// localStorage key for tracking when super-admin last viewed notifications
export const SUPER_ADMIN_NOTIF_VIEWED_AT_KEY = 'super_admin_notif_viewed_at';

// Count of new notifications since the super-admin last viewed the notifications page
export function useSuperAdminNotificationsCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...superAdminQueryKeys.all, 'notifications-count'],
    queryFn: async () => {
      if (typeof window === 'undefined') return 0;
      const since = localStorage.getItem(SUPER_ADMIN_NOTIF_VIEWED_AT_KEY);
      if (!since) {
        // First time: mark now as viewed so pre-existing notifications don't appear as new
        localStorage.setItem(SUPER_ADMIN_NOTIF_VIEWED_AT_KEY, new Date().toISOString());
        return 0;
      }
      const response = await apiClient.get(
        `/super-admin/notifications/count?since=${encodeURIComponent(since)}`
      );
      const data = (response.data as any)?.success ? (response.data as any).data : response.data;
      return (data?.count ?? 0) as number;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    refetchInterval: 10 * 1000,
  });
}

// ── Super Admin Dashboard Stats ───────────────────────────────────────────────

export interface SuperAdminStats {
  totalBranches: number;
  totalStudents: number;
  totalRevenue: number;
  activeCourses: number;
  totalCourses: number;
  totalTests: number;
}

export function useSuperAdminStats() {
  return useQuery<SuperAdminStats>({
    queryKey: superAdminQueryKeys.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/dashboard/stats');
      return response.data.data ?? response.data;
    },
  });
}

// ── Student Growth ────────────────────────────────────────────────────────────

export interface StudentGrowthPoint {
  month: string;
  count: number;
  [key: string]: number | string;
}

export function useSuperAdminStudentGrowth() {
  return useQuery<StudentGrowthPoint[]>({
    queryKey: superAdminQueryKeys.studentGrowth(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/dashboard/student-growth');
      return response.data.data ?? [];
    },
  });
}

// ── Revenue Analytics ─────────────────────────────────────────────────────────

export interface RevenuePoint {
  month: string;
  revenue: number;
  [key: string]: number | string;
}

export function useSuperAdminRevenue() {
  return useQuery<RevenuePoint[]>({
    queryKey: superAdminQueryKeys.revenue(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/dashboard/revenue');
      return response.data.data ?? [];
    },
  });
}

// ── Attendance Overview ───────────────────────────────────────────────────────

export interface AttendanceOverviewPoint {
  label: string;
  value: number;
}

export function useSuperAdminAttendance() {
  return useQuery<AttendanceOverviewPoint[]>({
    queryKey: superAdminQueryKeys.attendance(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/dashboard/attendance');
      return response.data.data ?? [];
    },
  });
}

// ── Top Performing Branches ───────────────────────────────────────────────────

export interface TopBranch {
  id: string;
  name: string;
  location: string;
  active_students: number;
}

export function useSuperAdminTopBranches() {
  return useQuery<TopBranch[]>({
    queryKey: superAdminQueryKeys.topBranches(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/dashboard/top-branches');
      return response.data.data ?? [];
    },
  });
}

// ── Consolidated Dashboard Hook ───────────────────────────────────────────────

export interface SuperAdminDashboardData {
  stats: SuperAdminStats | undefined;
  studentGrowth: StudentGrowthPoint[];
  revenue: RevenuePoint[];
  attendance: AttendanceOverviewPoint[];
  topBranches: TopBranch[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Fetches all super admin dashboard data in parallel with a single loading state.
 * Uses useQueries for parallel fetching while maintaining individual cache keys.
 */
export function useSuperAdminDashboard(): SuperAdminDashboardData {
  const results = useQueries({
    queries: [
      {
        queryKey: superAdminQueryKeys.stats(),
        queryFn: async () => {
          const response = await apiClient.get('/super-admin/dashboard/stats');
          return response.data.data ?? response.data;
        },
      },
      {
        queryKey: superAdminQueryKeys.studentGrowth(),
        queryFn: async () => {
          const response = await apiClient.get('/super-admin/dashboard/student-growth');
          return response.data.data ?? [];
        },
      },
      {
        queryKey: superAdminQueryKeys.revenue(),
        queryFn: async () => {
          const response = await apiClient.get('/super-admin/dashboard/revenue');
          return response.data.data ?? [];
        },
      },
      {
        queryKey: superAdminQueryKeys.attendance(),
        queryFn: async () => {
          const response = await apiClient.get('/super-admin/dashboard/attendance');
          return response.data.data ?? [];
        },
      },
      {
        queryKey: superAdminQueryKeys.topBranches(),
        queryFn: async () => {
          const response = await apiClient.get('/super-admin/dashboard/top-branches');
          return response.data.data ?? [];
        },
      },
    ],
  });

  const [statsResult, studentGrowthResult, revenueResult, attendanceResult, topBranchesResult] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const error = results.find((r) => r.error)?.error;

  return {
    stats: statsResult.data,
    studentGrowth: studentGrowthResult.data ?? [],
    revenue: revenueResult.data ?? [],
    attendance: attendanceResult.data ?? [],
    topBranches: topBranchesResult.data ?? [],
    isLoading,
    isError,
    error,
  };
}

// ── Super Admin Notifications List ────────────────────────────────────────────

export interface SuperAdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_audience?: string;
  target?: string;
  priority: string;
  branch_id?: string;
  action_url?: string;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  branches?: { id: string; name: string } | null;
}

export function useSuperAdminNotifications(
  page = 1,
  filters: { type?: string; targetAudience?: string; branch_id?: string } = {}
) {
  const filterKey = {
    type: filters.type ?? '',
    targetAudience: filters.targetAudience ?? '',
    branch_id: filters.branch_id ?? '',
  };
  return useQuery({
    queryKey: superAdminQueryKeys.notifications(page, filterKey),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (filters.type) params.set('type', filters.type);
      if (filters.targetAudience) params.set('targetAudience', filters.targetAudience);
      if (filters.branch_id) params.set('branch_id', filters.branch_id);
      const response = await apiClient.get(`/super-admin/notifications?${params}`);
      const data = (response.data as any)?.success ? (response.data as any) : response.data;
      return {
        notifications: (data?.data ?? []) as SuperAdminNotification[],
        totalPages: data?.pagination?.totalPages ?? 1,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

// ── Super Admin Branches (for notification branch targeting) ──────────────────

export interface SuperAdminBranch {
  id: string;
  name: string;
}

export function useSuperAdminBranches() {
  return useQuery<SuperAdminBranch[]>({
    queryKey: superAdminQueryKeys.branches(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/branches');
      const data = (response.data as any)?.success ? (response.data as any).data : response.data;
      return (Array.isArray(data) ? data : []) as SuperAdminBranch[];
    },
    staleTime: 30 * 60 * 1000,
  });
}
