import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// ── Query key factory ─────────────────────────────────────────────────────────

export const studentQueryKeys = {
  all: ['student'] as const,
  dashboard: () => [...studentQueryKeys.all, 'dashboard'] as const,
  attendance: () => [...studentQueryKeys.all, 'attendance'] as const,
  tests: () => [...studentQueryKeys.all, 'tests'] as const,
  results: () => [...studentQueryKeys.all, 'results'] as const,
  performance: () => [...studentQueryKeys.all, 'performance'] as const,
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
