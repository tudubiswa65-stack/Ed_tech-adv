'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Button, Input, Modal } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useAdminStudents,
  useAdminCourses,
  useAdminBranches,
  adminQueryKeys,
} from '@/hooks/queries/useAdminQueries';
import { queryClient } from '@/lib/queryClient';

interface Student {
  id: string;
  name: string;
  email: string;
  course_id: string;
  branch_id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  courses: { name: string } | null;
  branches: { name: string } | null;
}

interface Course {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    course_id: '',
    branch_id: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = usePermissions();

  // Debounce search input — resets page to 1 when search changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // React Query hooks — reference data cached for 30 min; student list cached 60 s
  const { data: coursesData = [] } = useAdminCourses();
  const { data: branchesData = [] } = useAdminBranches();
  const { data: studentsData, isLoading: loading } = useAdminStudents({
    page,
    search: debouncedSearch,
    courseId: courseFilter,
    branchId: branchFilter,
  });

  const students = studentsData?.students ?? [];
  const total = studentsData?.total ?? 0;

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await apiClient.post('/admin/students', formData);
      toast.success('Student created successfully');
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', course_id: '', branch_id: '' });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create student');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    setFormLoading(true);

    try {
      await apiClient.delete(`/admin/students/${selectedStudent.id}`);
      toast.success('Student deactivated successfully');
      setShowDeleteModal(false);
      setSelectedStudent(null);
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to deactivate student');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (student: Student) => (
        <span className="font-medium" style={{ color: '#000000' }}>{student.name}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (student: Student) => student.branches?.name || '-',
    },
    {
      key: 'course',
      label: 'Course',
      render: (student: Student) => student.courses?.name || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (student: Student) => {
        const effectiveStatus = student.status ?? (student.is_active ? 'ACTIVE' : 'INACTIVE');
        if (effectiveStatus === 'ACTIVE') {
          return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}>ACTIVE</span>;
        }
        if (effectiveStatus === 'SUSPENDED') {
          return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>SUSPENDED</span>;
        }
        return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>INACTIVE</span>;
      },
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (student: Student) =>
        student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (student: Student) => (
        <div className="flex items-center space-x-2">
          {hasPermission('edit_student') && (
            <button
              onClick={() => router.push(`/admin/students/${student.id}/edit`)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8' }}
            >
              Edit
            </button>
          )}
          {hasPermission('delete_student') && (
            <button
              onClick={() => {
                setSelectedStudent(student);
                setShowDeleteModal(true);
              }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              Delete
            </button>
          )}
          {!hasPermission('edit_student') && !hasPermission('delete_student') && (
            <span
              className="text-xs italic"
              style={{ color: '#475569' }}
              aria-label="No actions available — contact your Super Admin to enable permissions"
            >
              No actions available
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
        title="Student Management"
        actions={
          hasPermission('add_student') ? (
            <Button
              onClick={() => setShowAddModal(true)}
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 20 }}
            >
              Add Student
            </Button>
          ) : undefined
        }
      >
        {/* Ambient orbs */}
        <div style={{ position: 'fixed', top: 80, right: 40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: 80, left: 40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(52,211,153,0.05)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              className="w-full px-3 py-2 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              style={{ background: '#0d1b36', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All Branches</option>
              {Array.isArray(branchesData) && branchesData.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <select
              className="w-full px-3 py-2 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              style={{ background: '#0d1b36', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="">All Courses</option>
              {Array.isArray(coursesData) && coursesData.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={students}
          loading={loading}
          emptyMessage="No students found"
        />

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} students
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Student"
          size="md"
        >
          <form onSubmit={handleAddStudent}>
            <div className="space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Branch <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                    style={{ background: '#0d1b36', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    required
                  >
                    <option value="">Select Branch</option>
                    {Array.isArray(branchesData) && branchesData.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Course <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                    style={{ background: '#0d1b36', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    required
                  >
                    <option value="">Select Course</option>
                    {Array.isArray(coursesData) && coursesData.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-[10px] text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>
                Cancel
              </button>
              <Button type="submit" loading={formLoading} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 20 }}>
                Add Student
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirm Deactivation"
          size="sm"
        >
          <p className="mb-4" style={{ color: '#94a3b8' }}>
            Are you sure you want to deactivate <strong style={{ color: '#f1f5f9' }}>{selectedStudent?.name}</strong>? Their results will be preserved.
          </p>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-[10px] text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>
              Cancel
            </button>
            <Button variant="danger" onClick={handleDeleteStudent} loading={formLoading}>
              Deactivate
            </Button>
          </div>
        </Modal>
      </PageWrapper>
  );
}