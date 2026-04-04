import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

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

export function useAdminDashboard() {
  return useQuery({
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
