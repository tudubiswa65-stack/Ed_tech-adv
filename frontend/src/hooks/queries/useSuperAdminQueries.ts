import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// ── Query key factory ─────────────────────────────────────────────────────────

export const superAdminQueryKeys = {
  all: ['super-admin'] as const,
  stats: () => [...superAdminQueryKeys.all, 'stats'] as const,
  studentGrowth: () => [...superAdminQueryKeys.all, 'student-growth'] as const,
  revenue: () => [...superAdminQueryKeys.all, 'revenue'] as const,
  attendance: () => [...superAdminQueryKeys.all, 'attendance'] as const,
  topBranches: () => [...superAdminQueryKeys.all, 'top-branches'] as const,
};

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
