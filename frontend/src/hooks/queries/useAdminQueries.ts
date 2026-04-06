import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { permissionsQueryKeys, fetchMyPermissions, PermissionKey } from '@/hooks/usePermissions';

// ── Query key factory ─────────────────────────────────────────────────────────

export const adminQueryKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminQueryKeys.all, 'dashboard'] as const,
  aggregatedDashboard: () => [...adminQueryKeys.all, 'aggregated', 'dashboard'] as const,
  aggregatedBranchOverview: () => [...adminQueryKeys.all, 'aggregated', 'branch-overview'] as const,
  aggregatedStudentsOverview: (page?: number, limit?: number) =>
    [...adminQueryKeys.all, 'aggregated', 'students-overview', { page, limit }] as const,
  aggregatedPaymentsOverview: () => [...adminQueryKeys.all, 'aggregated', 'payments-overview'] as const,
  aggregatedTestsOverview: () => [...adminQueryKeys.all, 'aggregated', 'tests-overview'] as const,
  aggregatedNotificationsOverview: () => [...adminQueryKeys.all, 'aggregated', 'notifications-overview'] as const,
  branches: () => [...adminQueryKeys.all, 'branches'] as const,
  courses: () => [...adminQueryKeys.all, 'courses'] as const,
  attendance: (branch: string, course: string, date: string) =>
    [...adminQueryKeys.all, 'attendance', { branch, course, date }] as const,
  students: (params: Record<string, string | number>) =>
    [...adminQueryKeys.all, 'students', params] as const,
  payments: () => [...adminQueryKeys.all, 'payments'] as const,
  notifications: (page: number, filters: Record<string, string>) =>
    [...adminQueryKeys.all, 'notifications', { page, ...filters }] as const,
  results: (page: number, filters: Record<string, string>) =>
    [...adminQueryKeys.all, 'results', { page, ...filters }] as const,
  testsList: (filters: Record<string, string>) =>
    [...adminQueryKeys.all, 'tests-list', filters] as const,
  galleryLabel: () => [...adminQueryKeys.all, 'gallery', 'label'] as const,
  gallerySubmissions: (status: string) =>
    [...adminQueryKeys.all, 'gallery', 'submissions', status] as const,
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

// ── Aggregated Endpoints ───────────────────────────────────────────────────────

export interface AggregatedDashboardResponse {
  stats: AdminDashboardStats;
  permissions?: Record<string, boolean>;
  recentActivity?: unknown[];
}

// Aggregated Dashboard: combines stats + permissions + recent activity
export function useAggregatedDashboard() {
  return useQuery<AggregatedDashboardResponse>({
    queryKey: adminQueryKeys.aggregatedDashboard(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/aggregated/dashboard');
      return response.data.data ?? response.data;
    },
    // 60 second stale time for aggregated data
    staleTime: 60 * 1000,
  });
}

// Aggregated Branch Overview: branches + courses + student counts
export function useAggregatedBranchOverview() {
  return useQuery({
    queryKey: adminQueryKeys.aggregatedBranchOverview(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/aggregated/branch-overview');
      return response.data.data ?? response.data;
    },
    staleTime: 120 * 1000, // 2 minutes for reference data
  });
}

// Aggregated Students Overview: students + recent results + attendance
export function useAggregatedStudentsOverview(page = 1, limit = 20) {
  return useQuery({
    queryKey: adminQueryKeys.aggregatedStudentsOverview(page, limit),
    queryFn: async () => {
      const response = await apiClient.get(`/admin/aggregated/students-overview?page=${page}&limit=${limit}`);
      return response.data.data ?? response.data;
    },
    staleTime: 60 * 1000,
  });
}

// Aggregated Payments Overview: payments + receipts + defaulters
export function useAggregatedPaymentsOverview() {
  return useQuery({
    queryKey: adminQueryKeys.aggregatedPaymentsOverview(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/aggregated/payments-overview');
      return response.data.data ?? response.data;
    },
    staleTime: 120 * 1000,
  });
}

// Aggregated Tests Overview: tests + results + analytics
export function useAggregatedTestsOverview() {
  return useQuery({
    queryKey: adminQueryKeys.aggregatedTestsOverview(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/aggregated/tests-overview');
      return response.data.data ?? response.data;
    },
    staleTime: 60 * 1000,
  });
}

// Aggregated Notifications Overview: notifications + read status + stats
export function useAggregatedNotificationsOverview() {
  return useQuery({
    queryKey: adminQueryKeys.aggregatedNotificationsOverview(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/aggregated/notifications-overview');
      return response.data.data ?? response.data;
    },
    staleTime: 60 * 1000,
  });
}

// ── Individual resource hooks ─────────────────────────────────────────────────

// Students list with filters and pagination
export function useAdminStudents(params: {
  page?: number;
  search?: string;
  courseId?: string;
  branchId?: string;
  limit?: number;
} = {}) {
  const { page = 1, search = '', courseId = '', branchId = '', limit = 20 } = params;
  return useQuery({
    queryKey: adminQueryKeys.students({ page, search, courseId, branchId, limit }),
    queryFn: async () => {
      const urlParams = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) urlParams.set('search', search);
      if (courseId) urlParams.set('course_id', courseId);
      if (branchId) urlParams.set('branch_id', branchId);
      const response = await apiClient.get(`/admin/students?${urlParams}`);
      const data = response.data?.success ? response.data.data : response.data;
      return { students: data?.students ?? [], total: data?.total ?? 0 };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Payments list
export function useAdminPayments() {
  return useQuery({
    queryKey: adminQueryKeys.payments(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/payments');
      return response.data.data ?? response.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

// Notifications list with pagination and filters
export function useAdminNotifications(
  page = 1,
  filters: { type?: string; targetAudience?: string } = {}
) {
  const filterKey = { type: filters.type ?? '', targetAudience: filters.targetAudience ?? '' };
  return useQuery({
    queryKey: adminQueryKeys.notifications(page, filterKey),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (filters.type) params.set('type', filters.type);
      if (filters.targetAudience) params.set('targetAudience', filters.targetAudience);
      const response = await apiClient.get(`/admin/notifications?${params}`);
      const data = (response.data as any)?.success ? (response.data as any).data : response.data;
      return {
        notifications: data?.notifications ?? [],
        totalPages: data?.pagination?.totalPages ?? 1,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// localStorage key for tracking when admin last viewed notifications
export const ADMIN_NOTIF_VIEWED_AT_KEY = 'admin_notif_viewed_at';

// Count of new notifications since the admin last viewed the notifications page
export function useAdminNotificationsCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'notifications-count'],
    queryFn: async () => {
      if (typeof window === 'undefined') return 0;
      const since = localStorage.getItem(ADMIN_NOTIF_VIEWED_AT_KEY);
      if (!since) {
        // First time: mark now as viewed so pre-existing notifications don't appear as new
        localStorage.setItem(ADMIN_NOTIF_VIEWED_AT_KEY, new Date().toISOString());
        return 0;
      }
      const response = await apiClient.get(
        `/admin/notifications/count?since=${encodeURIComponent(since)}`
      );
      const data = (response.data as any)?.success ? (response.data as any).data : response.data;
      return (data?.count ?? 0) as number;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    // Real-time updates are delivered via Supabase Realtime (useRealtimeNotifications).
    // Poll only as a fallback for environments where Realtime is unavailable.
    refetchInterval: 5 * 60 * 1000,
  });
}

// Results list with pagination and filters
export function useAdminResults(
  page = 1,
  filters: { testId?: string; status?: string; sortBy?: string; sortOrder?: string } = {}
) {
  const filterKey = {
    testId: filters.testId ?? '',
    status: filters.status ?? '',
    sortBy: filters.sortBy ?? 'submitted_at',
    sortOrder: filters.sortOrder ?? 'desc',
  };
  return useQuery({
    queryKey: adminQueryKeys.results(page, filterKey),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (filters.testId) params.set('testId', filters.testId);
      if (filters.status) params.set('status', filters.status);
      params.set('sortBy', filters.sortBy ?? 'submitted_at');
      params.set('sortOrder', filters.sortOrder ?? 'desc');
      const response = await apiClient.get(`/admin/results?${params}`);
      return {
        results: response.data.results ?? [],
        totalPages: response.data.pagination?.totalPages ?? 1,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Tests list with optional filters
export function useAdminTestsList(filters: { courseId?: string; type?: string } = {}) {
  const filterKey = { courseId: filters.courseId ?? '', type: filters.type ?? '' };
  return useQuery({
    queryKey: adminQueryKeys.testsList(filterKey),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.courseId) params.set('course_id', filters.courseId);
      if (filters.type) params.set('type', filters.type);
      const response = await apiClient.get(`/admin/tests?${params}`);
      return (Array.isArray(response.data) ? response.data : response.data?.tests ?? []) as any[];
    },
    staleTime: 60 * 1000,
  });
}

// ── Gallery ───────────────────────────────────────────────────────────────────

export interface GalleryLabelData {
  id?: string;
  title: string;
  subtitle: string;
  season_tag: string | null;
  updated_at?: string;
}

export interface GallerySubmission {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  status: 'pending' | 'approved' | 'rejected';
  is_pinned: boolean;
  slot_order: number | null;
  submitted_at: string;
  approved_at: string | null;
  student_first_name: string;
}

/** Fetch the current gallery label (title / subtitle / season_tag). */
export function useGalleryLabel() {
  return useQuery<GalleryLabelData | null>({
    queryKey: adminQueryKeys.galleryLabel(),
    queryFn: async () => {
      const response = await apiClient.get('/admin/gallery/label');
      return (response.data?.data as GalleryLabelData) ?? null;
    },
    staleTime: 60 * 1000,
  });
}

/** Fetch gallery submissions, optionally filtered by status. */
export function useGallerySubmissions(status: 'all' | 'pending' | 'approved' | 'rejected' = 'all') {
  return useQuery<GallerySubmission[]>({
    queryKey: adminQueryKeys.gallerySubmissions(status),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      const response = await apiClient.get(`/admin/gallery/submissions?${params}`);
      return (response.data?.data as GallerySubmission[]) ?? [];
    },
    staleTime: 60 * 1000,
  });
}
