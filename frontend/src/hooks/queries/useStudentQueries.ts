import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// ── Query key factory ─────────────────────────────────────────────────────────

export const studentQueryKeys = {
  all: ['student'] as const,
  dashboard: () => [...studentQueryKeys.all, 'dashboard'] as const,
  attendance: () => [...studentQueryKeys.all, 'attendance'] as const,
  tests: () => [...studentQueryKeys.all, 'tests'] as const,
  results: () => [...studentQueryKeys.all, 'results'] as const,
  performance: () => [...studentQueryKeys.all, 'performance'] as const,
  notifications: (page: number, filter: string) =>
    [...studentQueryKeys.all, 'notifications', { page, filter }] as const,
  unreadCount: () => [...studentQueryKeys.all, 'unread-count'] as const,
  payments: () => [...studentQueryKeys.all, 'payments'] as const,
  materials: (filters: Record<string, string>) =>
    [...studentQueryKeys.all, 'materials', filters] as const,
  recentMaterials: () => [...studentQueryKeys.all, 'recent-materials'] as const,
  complaints: () => [...studentQueryKeys.all, 'complaints'] as const,
  feedback: () => [...studentQueryKeys.all, 'feedback'] as const,
  leaderboard: () => [...studentQueryKeys.all, 'leaderboard'] as const,
};

// ── Response normaliser ───────────────────────────────────────────────────────
// The backend sometimes wraps data as `{ success: true, data: <payload> }` and
// sometimes returns the payload directly.  This helper unwraps both shapes.

function unwrap<T>(responseData: unknown): T {
  const d = responseData as Record<string, unknown>;
  return (d?.success ? d.data : d) as T;
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

export function useStudentDashboard() {
  return useQuery({
    queryKey: studentQueryKeys.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get('/student/dashboard');
      return unwrap(response.data);
    },
  });
}

// ── Student Attendance ────────────────────────────────────────────────────────

interface AttendanceItem {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period?: string;
  session?: string;
}

export function useStudentAttendance() {
  return useQuery<AttendanceItem[]>({
    queryKey: studentQueryKeys.attendance(),
    queryFn: async () => {
      const response = await apiClient.get('/student/attendance');
      // The backend wraps records under `.data` inside the envelope
      const envelope = response.data as Record<string, unknown>;
      const payload = envelope?.success ? envelope.data : envelope;
      return Array.isArray((payload as any)?.data)
        ? (payload as any).data
        : Array.isArray(payload)
          ? payload
          : [];
    },
  });
}

// ── Student Tests ─────────────────────────────────────────────────────────────

export function useStudentTests() {
  return useQuery({
    queryKey: studentQueryKeys.tests(),
    queryFn: async () => {
      const response = await apiClient.get('/student/tests');
      return unwrap(response.data);
    },
  });
}

// ── Student Results & Performance ─────────────────────────────────────────────

export function useStudentResults() {
  return useQuery({
    queryKey: studentQueryKeys.results(),
    queryFn: async () => {
      const response = await apiClient.get('/student/results');
      return unwrap<unknown[]>(response.data) ?? [];
    },
  });
}

export function useStudentPerformance() {
  return useQuery({
    queryKey: studentQueryKeys.performance(),
    queryFn: async () => {
      const response = await apiClient.get('/student/performance');
      return unwrap(response.data);
    },
  });
}

// ── Student Notifications ─────────────────────────────────────────────────────

export function useStudentNotifications(page = 1, filter: 'all' | 'unread' = 'all') {
  return useQuery({
    queryKey: studentQueryKeys.notifications(page, filter),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (filter === 'unread') params.set('unreadOnly', 'true');
      const response = await apiClient.get(`/student/notifications?${params}`);
      const data = ((response.data as any)?.success ? (response.data as any).data : response.data) || {};
      return {
        notifications: data.notifications ?? [],
        totalPages: data.pagination?.totalPages ?? 1,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useStudentUnreadCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: studentQueryKeys.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get('/student/notifications/unread-count');
      const data = ((response.data as any)?.success ? (response.data as any).data : response.data) || {};
      return data.unreadCount ?? 0;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ── Student Payments ──────────────────────────────────────────────────────────

export function useStudentPayments() {
  return useQuery({
    queryKey: studentQueryKeys.payments(),
    queryFn: async () => {
      const response = await apiClient.get('/student/payments');
      return (response.data.data ?? []) as {
        id: string;
        amount: number;
        status: string;
        payment_method?: string;
        transaction_id?: string;
        description?: string;
        created_at: string;
        [key: string]: unknown;
      }[];
    },
    staleTime: 120 * 1000,
  });
}

// ── Student Materials ─────────────────────────────────────────────────────────

export function useStudentMaterials(filters: {
  subjectId?: string;
  type?: string;
  search?: string;
} = {}) {
  const filterKey = {
    subjectId: filters.subjectId ?? '',
    type: filters.type ?? '',
    search: filters.search ?? '',
  };
  return useQuery({
    queryKey: studentQueryKeys.materials(filterKey),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.subjectId) params.set('subjectId', filters.subjectId);
      if (filters.type) params.set('type', filters.type);
      if (filters.search) params.set('search', filters.search);
      const response = await apiClient.get(`/student/materials?${params}`);
      return ((response.data as any)?.data ?? []) as unknown[];
    },
    staleTime: 120 * 1000,
  });
}

export function useStudentRecentMaterials() {
  return useQuery({
    queryKey: studentQueryKeys.recentMaterials(),
    queryFn: async () => {
      const response = await apiClient.get('/student/materials/recent');
      return ((response.data as any)?.data ?? []) as unknown[];
    },
    staleTime: 120 * 1000,
  });
}

// ── Student Complaints ────────────────────────────────────────────────────────

export function useStudentComplaints() {
  return useQuery({
    queryKey: studentQueryKeys.complaints(),
    queryFn: async () => {
      const response = await apiClient.get('/student/complaints');
      const data = (response.data as any)?.success ? (response.data as any).data : response.data;
      return (data ?? []) as unknown[];
    },
    staleTime: 60 * 1000,
  });
}

// ── Student Feedback ──────────────────────────────────────────────────────────

export function useStudentFeedback() {
  return useQuery({
    queryKey: studentQueryKeys.feedback(),
    queryFn: async () => {
      const response = await apiClient.get('/student/feedback');
      const data = (response.data as any)?.success ? (response.data as any).data : response.data;
      return (data ?? []) as unknown[];
    },
    staleTime: 60 * 1000,
  });
}

// ── Student Leaderboard ───────────────────────────────────────────────────────

export function useStudentLeaderboard() {
  return useQuery({
    queryKey: studentQueryKeys.leaderboard(),
    queryFn: async () => {
      const response = await apiClient.get('/student/leaderboard');
      const data = (response.data as any)?.success ? (response.data as any).data : response.data;
      return (data ?? []) as {
        student_id: string;
        student_name: string;
        branch_name?: string;
        avatar_url?: string | null;
        total_score: number;
        final_rank_score: number;
        rank: number;
        rank_change: number | null;
        trend_score: number;
        avg_time_per_question: number;
        is_fastest: boolean;
        [key: string]: unknown;
      }[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — matches signed URL TTL
  });
}

// ── Consolidated Student Dashboard ───────────────────────────────────────────

export interface StudentDashboardData {
  dashboard: unknown;
  attendance: unknown[];
  tests: unknown;
  results: unknown[];
  performance: unknown;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Fetches all key student dashboard data in parallel with a single loading state.
 * Uses useQueries for parallel fetching while maintaining individual cache keys.
 */
export function useStudentDashboardData(): StudentDashboardData {
  const results = useQueries({
    queries: [
      {
        queryKey: studentQueryKeys.dashboard(),
        queryFn: async () => {
          const response = await apiClient.get('/student/dashboard');
          return unwrap(response.data);
        },
      },
      {
        queryKey: studentQueryKeys.attendance(),
        queryFn: async () => {
          const response = await apiClient.get('/student/attendance');
          const envelope = response.data as Record<string, unknown>;
          const payload = envelope?.success ? envelope.data : envelope;
          return Array.isArray((payload as any)?.data)
            ? (payload as any).data
            : Array.isArray(payload)
              ? payload
              : [];
        },
      },
      {
        queryKey: studentQueryKeys.tests(),
        queryFn: async () => {
          const response = await apiClient.get('/student/tests');
          return unwrap(response.data);
        },
      },
      {
        queryKey: studentQueryKeys.results(),
        queryFn: async () => {
          const response = await apiClient.get('/student/results');
          return unwrap<unknown[]>(response.data) ?? [];
        },
      },
      {
        queryKey: studentQueryKeys.performance(),
        queryFn: async () => {
          const response = await apiClient.get('/student/performance');
          return unwrap(response.data);
        },
      },
    ],
  });

  const [dashboardResult, attendanceResult, testsResult, resultsResult, performanceResult] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const error = results.find((r) => r.error)?.error;

  return {
    dashboard: dashboardResult.data,
    attendance: (attendanceResult.data as unknown[]) ?? [],
    tests: testsResult.data,
    results: (resultsResult.data as unknown[]) ?? [],
    performance: performanceResult.data,
    isLoading,
    isError,
    error,
  };
}
