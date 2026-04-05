'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import {
  useSuperAdminStudent,
  useSuperAdminBranches,
  useSuperAdminCourses,
  useUpdateStudent,
  type StudentProfile,
} from '@/hooks/queries/useSuperAdminDataQueries';

interface Course {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface StudentForm {
  name: string;
  email: string;
  course_id: string;
  branch_id: string;
  status: string;
  password: string;
}

export default function SuperAdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StudentForm | null>(null);

  const { data: student, isLoading, error } = useSuperAdminStudent(studentId);
  const { data: branches = [] } = useSuperAdminBranches() as { data: Branch[] };
  const { data: courses = [] } = useSuperAdminCourses() as { data: Course[] };
  const updateStudent = useUpdateStudent();

  const startEdit = () => {
    if (!student) return;
    setFormData({
      name: student.name ?? '',
      email: student.email ?? '',
      course_id: student.course_id ?? '',
      branch_id: student.branch_id ?? '',
      status: student.status ?? 'ACTIVE',
      password: '',
    });
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => prev ? { ...prev, [name]: value } : prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      const payload: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        course_id: formData.course_id,
        branch_id: formData.branch_id,
        status: formData.status,
      };
      if (formData.password.trim()) {
        payload.password = formData.password;
      }
      await updateStudent.mutateAsync({ id: studentId, data: payload });
      toast.success('Student updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update student');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">Student not found or failed to load.</p>
        <button
          onClick={() => router.push('/super-admin/students')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          ← Back to Students
        </button>
      </div>
    );
  }

  const statusBadgeClass: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    DEACTIVATED: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/super-admin/students')}
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ← Back to Students
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            Student Details
          </h1>
        </div>
        {!isEditing && (
          <button
            onClick={startEdit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Edit Student
          </button>
        )}
      </div>

      {/* Details / Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-600">
        {isEditing && formData ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Edit Student
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
                Course
              </label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="">No course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
                Branch
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="">No branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
                Account Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="ACTIVE">ACTIVE – Student can log in and use the platform</option>
                <option value="INACTIVE">INACTIVE – Account is deactivated</option>
                <option value="SUSPENDED">SUSPENDED – Account is suspended</option>
                <option value="DEACTIVATED">DEACTIVATED – Account is permanently deactivated</option>
              </select>
              {formData.status !== 'ACTIVE' && (
                <p className="mt-1 text-xs text-red-600">
                  ⚠ Changing status to {formData.status} will immediately block this student&apos;s access.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
                New Password{' '}
                <span className="text-gray-400 font-normal dark:text-slate-500">(leave blank to keep current)</span>
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:text-slate-200 dark:bg-slate-700 dark:border-slate-500 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateStudent.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {updateStudent.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Profile Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Full Name" value={student.name} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Roll Number" value={student.roll_number} />
              <InfoRow label="Phone" value={student.phone ?? '—'} />
              <InfoRow label="Branch" value={student.branch_name ?? student.branches?.name ?? '—'} />
              <InfoRow label="Course" value={student.course_name ?? student.courses?.name ?? '—'} />
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass[student.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {student.status}
                  </span>
                }
              />
              <InfoRow label="Joined" value={student.created_at ? new Date(student.created_at).toLocaleDateString() : '—'} />
            </div>
          </div>
        )}
      </div>

      {/* Enrollment History */}
      {!isEditing && student.enrollments && student.enrollments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Enrollment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">Course</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">Status</th>
                  <th className="text-left py-2 font-medium text-gray-600 dark:text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {student.enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-gray-50 dark:border-slate-700">
                    <td className="py-2 pr-4 text-gray-900 dark:text-slate-100">
                      {enrollment.courses?.name ?? '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadgeClass[enrollment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {enrollment.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 dark:text-slate-400">
                      {enrollment.created_at ? new Date(enrollment.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900 dark:text-slate-100">{value ?? '—'}</p>
    </div>
  );
}
