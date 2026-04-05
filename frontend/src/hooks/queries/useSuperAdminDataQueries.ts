import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// ═══════════════════════════════════════════════════════════════════════════════
// Query Key Factories
// ═══════════════════════════════════════════════════════════════════════════════

export const superAdminDataQueryKeys = {
  all: ['super-admin-data'] as const,
  
  // Branches
  branches: () => [...superAdminDataQueryKeys.all, 'branches'] as const,
  branch: (id: string) => [...superAdminDataQueryKeys.branches(), id] as const,
  
  // Courses
  courses: () => [...superAdminDataQueryKeys.all, 'courses'] as const,
  course: (id: string) => [...superAdminDataQueryKeys.courses(), id] as const,
  
  // Students
  students: () => [...superAdminDataQueryKeys.all, 'students'] as const,
  student: (id: string) => [...superAdminDataQueryKeys.students(), id] as const,
  
  // Settings
  settings: () => [...superAdminDataQueryKeys.all, 'settings'] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Branch {
  id: string;
  name: string;
  location: string;
  contact_number: string;
  is_active: boolean;
  active_students: number;
  total_students: number;
  total_revenue: number;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  title?: string;
  description?: string;
  branch_name: string;
  branch_id: string;
  level?: string;
  price?: number;
  duration_value?: number;
  duration_unit?: string;
  start_date?: string;
  end_date?: string;
  last_enrollment_date?: string;
  thumbnail?: string;
  instructor?: string;
  terms_and_conditions?: string;
  category?: string;
  status?: string;
  is_active: boolean;
  is_published?: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  branch_name: string;
  course_name: string;
  status: string;
  phone?: string;
  branch_id?: string;
}

export interface Settings {
  platform_name?: string;
  tagline?: string;
  primary_color?: string;
  logo_url?: string;
  currency?: string;
  timezone?: string;
  session_timeout?: number;
  payment_threshold?: number;
  late_fee_percentage?: number;
  grace_period_days?: number;
  max_upload_size_mb?: number;
  allowed_file_types?: string[];
  [key: string]: any;
}

export interface Features {
  maintenance_mode?: boolean;
  user_registration?: boolean;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  [key: string]: any;
}

export interface SettingsAggregate {
  settings: Settings;
  features: Features;
}

export interface CoursesFilters {
  branch_id?: string;
  status?: string;
  level?: string;
  search?: string;
}

export interface StudentsFilters {
  branch_id?: string;
  status?: string;
  search?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Branches Queries
// ═══════════════════════════════════════════════════════════════════════════════

export function useSuperAdminBranches() {
  return useQuery<Branch[]>({
    queryKey: superAdminDataQueryKeys.branches(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/branches');
      return response.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Courses Queries
// ═══════════════════════════════════════════════════════════════════════════════

export function useSuperAdminCourses(filters?: CoursesFilters) {
  return useQuery<Course[]>({
    queryKey: [...superAdminDataQueryKeys.courses(), filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.branch_id) params.branch_id = filters.branch_id;
      if (filters?.status) params.status = filters.status;
      if (filters?.level) params.level = filters.level;
      if (filters?.search) params.search = filters.search;
      
      const response = await apiClient.get('/super-admin/courses', { params });
      return response.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSuperAdminCourse(id: string) {
  return useQuery<Course>({
    queryKey: superAdminDataQueryKeys.course(id),
    queryFn: async () => {
      const response = await apiClient.get(`/super-admin/courses/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiClient.post('/super-admin/courses', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.courses() });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/super-admin/courses/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.courses() });
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.course(variables.id) });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/super-admin/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.courses() });
    },
  });
}

export function useToggleCourseStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.put(`/super-admin/courses/${id}/toggle-status`);
      return response.data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.courses() });
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.course(id) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Students Queries
// ═══════════════════════════════════════════════════════════════════════════════

export function useSuperAdminStudents(filters?: StudentsFilters) {
  return useQuery<Student[]>({
    queryKey: [...superAdminDataQueryKeys.students(), filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.branch_id) params.branch_id = filters.branch_id;
      if (filters?.status) params.status = filters.status;
      if (filters?.search) params.search = filters.search;
      
      const response = await apiClient.get('/super-admin/students', { params });
      return response.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSuperAdminStudent(id: string) {
  return useQuery<Student>({
    queryKey: superAdminDataQueryKeys.student(id),
    queryFn: async () => {
      const response = await apiClient.get(`/super-admin/students/${id}/profile`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        email?: string;
        course_id?: string;
        branch_id?: string;
        status?: string;
        password?: string;
      };
    }) => {
      const response = await apiClient.put(`/super-admin/students/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.students() });
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.student(variables.id) });
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      roll_number?: string;
      phone?: string;
      branch_id?: string;
    }) => {
      const response = await apiClient.post('/super-admin/students', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.students() });
    },
  });
}

export function useUpdateStudentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.put(`/super-admin/students/${id}/status`, { status });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.students() });
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.student(variables.id) });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/super-admin/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.students() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Settings Queries
// ═══════════════════════════════════════════════════════════════════════════════

export function useSuperAdminSettings() {
  return useQuery<SettingsAggregate>({
    queryKey: superAdminDataQueryKeys.settings(),
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/settings/aggregate');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { settings: Settings; features: Features }) => {
      const payload = { ...data.settings, ...data.features };
      const response = await apiClient.put('/super-admin/settings', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.settings() });
    },
  });
}

export function useResetSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/super-admin/settings/reset');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.settings() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Branches Mutations
// ═══════════════════════════════════════════════════════════════════════════════

export function useCreateBranch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      location: string;
      contact_number: string;
    }) => {
      const response = await apiClient.post('/super-admin/branches', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.branches() });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/super-admin/branches/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.branches() });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/super-admin/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.branches() });
    },
  });
}

export function useToggleBranchStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.put(`/super-admin/branches/${id}/toggle-status`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminDataQueryKeys.branches() });
    },
  });
}
