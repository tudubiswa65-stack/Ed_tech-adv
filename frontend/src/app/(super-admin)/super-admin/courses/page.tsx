'use client';

import { useState } from 'react';
import { DataTable } from '@/components/super-admin/DataTable';
import { Modal } from '@/components/ui';
import {
  useSuperAdminCourses,
  useSuperAdminBranches,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useToggleCourseStatus,
  type CoursesFilters,
  type Course,
} from '@/hooks/queries/useSuperAdminDataQueries';
import { Spinner } from '@/components/ui';

const EMPTY_FORM = {
  title: '',
  name: '',
  description: '',
  branch_id: '',
  level: '',
  price: '',
  duration_value: '',
  duration_unit: 'months',
  start_date: '',
  end_date: '',
  last_enrollment_date: '',
  thumbnail: '',
  instructor: '',
  terms_and_conditions: '',
  category: '',
  status: 'active',
};

type CourseForm = typeof EMPTY_FORM;

export default function CoursesPage() {
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const filters: CoursesFilters = {
    ...(branchFilter && { branch_id: branchFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...(levelFilter && { level: levelFilter }),
    ...(search && { search }),
  };

  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useSuperAdminCourses(filters);
  const { data: branches = [] } = useSuperAdminBranches();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const toggleCourseStatus = useToggleCourseStatus();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => ({
    ...formData,
    name: formData.name || formData.title,
    title: formData.title || formData.name,
    price: formData.price ? Number(formData.price) : undefined,
    duration_value: formData.duration_value ? Number(formData.duration_value) : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const payload = buildPayload();
    try {
      if (selectedCourse) {
        await updateCourse.mutateAsync({ id: selectedCourse.id, data: payload });
      } else {
        await createCourse.mutateAsync(payload);
      }
      setIsModalOpen(false);
      setSelectedCourse(null);
      setFormData(EMPTY_FORM);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setFormError(e.response?.data?.error || e.response?.data?.message || 'Failed to save course');
    }
  };

  const openEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title ?? course.name,
      name: course.name,
      description: course.description ?? '',
      branch_id: course.branch_id,
      level: course.level ?? '',
      price: course.price !== undefined ? String(course.price) : '',
      duration_value: course.duration_value !== undefined ? String(course.duration_value) : '',
      duration_unit: course.duration_unit ?? 'months',
      start_date: course.start_date ?? '',
      end_date: course.end_date ?? '',
      last_enrollment_date: course.last_enrollment_date ?? '',
      thumbnail: course.thumbnail ?? '',
      instructor: course.instructor ?? '',
      terms_and_conditions: course.terms_and_conditions ?? '',
      category: course.category ?? '',
      status: course.status ?? (course.is_active ? 'active' : 'inactive'),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteCourse.mutateAsync(id);
    } catch {
      alert('Failed to delete course');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleCourseStatus.mutateAsync(id);
    } catch {
      alert('Failed to toggle status');
    }
  };

  const levelBadge = (level: string) => {
    const map: Record<string, string> = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-yellow-100 text-yellow-700',
      advanced: 'bg-red-100 text-red-700',
      expert: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[level] || 'bg-gray-100 text-gray-600'} dark:text-slate-300 dark:bg-slate-700`}>
        {level}
      </span>
    );
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100';

  const CourseFormFields = () => (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Course Title <span className="text-red-500">*</span></label>
          <input name="title" value={formData.title} onChange={handleChange} className={inputCls} placeholder="e.g. Full Stack Web Development" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Instructor</label>
          <input name="instructor" value={formData.instructor} onChange={handleChange} className={inputCls} placeholder="Instructor name" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Description</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={inputCls} placeholder="Course description..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Branch <span className="text-red-500">*</span></label>
        <select name="branch_id" value={formData.branch_id} onChange={handleChange} className={inputCls} required>
          <option value="">Select Branch</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Price</label>
          <input name="price" type="number" min="0" value={formData.price} onChange={handleChange} className={inputCls} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Duration</label>
          <input name="duration_value" type="number" min="0" value={formData.duration_value} onChange={handleChange} className={inputCls} placeholder="e.g. 6" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Unit</label>
          <select name="duration_unit" value={formData.duration_unit} onChange={handleChange} className={inputCls}>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Start Date</label>
          <input name="start_date" type="date" value={formData.start_date} onChange={handleChange} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">End Date</label>
          <input name="end_date" type="date" value={formData.end_date} onChange={handleChange} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Last Enrollment Date</label>
          <input name="last_enrollment_date" type="date" value={formData.last_enrollment_date} onChange={handleChange} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Category</label>
          <input name="category" value={formData.category} onChange={handleChange} className={inputCls} placeholder="e.g. Programming" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Level</label>
          <select name="level" value={formData.level} onChange={handleChange} className={inputCls}>
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Thumbnail URL</label>
        <input name="thumbnail" value={formData.thumbnail} onChange={handleChange} className={inputCls} placeholder="https://example.com/image.png" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Terms &amp; Conditions</label>
        <textarea name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleChange} rows={4} className={inputCls} placeholder="Enter course terms and conditions..." />
      </div>
    </div>
  );

  const columns = [
    {
      key: 'name',
      header: 'Name / Description',
      render: (row: Course) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900 dark:text-slate-100">{row.title || row.name}</p>
          <p className="text-xs text-gray-500 truncate dark:text-slate-400">{row.description}</p>
        </div>
      ),
    },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'level',
      header: 'Level',
      render: (row: Course) => row.level ? levelBadge(row.level) : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (row: Course) => row.price !== undefined ? `₹${Number(row.price).toLocaleString()}` : '—',
    },
    {
      key: 'duration_value',
      header: 'Duration',
      render: (row: Course) => row.duration_value ? `${row.duration_value} ${row.duration_unit ?? 'months'}` : '—',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row: Course) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} dark:text-slate-300 dark:bg-slate-700`}>
          {row.status ?? (row.is_active ? 'Active' : 'Inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Course) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openEdit(row)}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleToggleStatus(row.id)}
            className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (coursesLoading && courses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (coursesError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Failed to load courses
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Courses</h1>
        <button
          onClick={() => { setSelectedCourse(null); setFormData(EMPTY_FORM); setIsModalOpen(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Add New Course
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <DataTable columns={columns} data={courses} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedCourse ? 'Edit Course' : 'Add New Course'} size="lg">
        <form onSubmit={handleSubmit}>
          {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
          <CourseFormFields />
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:text-slate-200 dark:bg-slate-800 dark:border-slate-500 dark:hover:bg-slate-700">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{selectedCourse ? 'Update' : 'Create'} Course</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
