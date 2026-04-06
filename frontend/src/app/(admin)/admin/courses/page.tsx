'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Button, Modal, Input } from '@/components/ui';
import { AdminCardGridSkeleton } from '@/components/admin/AdminPageSkeletons';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';

interface Subject {
  id: string;
  name: string;
  order_index: number;
}

interface Module {
  id: string;
  name: string;
  order_index: number;
  subjects: Subject[];
}

interface Course {
  id: string;
  name: string;
  title?: string;
  description?: string;
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
  level?: string;
  status?: string;
  is_active: boolean;
  is_published?: boolean;
  student_count: number;
  test_count: number;
  material_count: number;
  modules?: Module[];
}

const EMPTY_FORM = {
  name: '',
  title: '',
  description: '',
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
  level: '',
  status: 'active',
};

type CourseForm = typeof EMPTY_FORM;

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  const [formData, setFormData] = useState<CourseForm>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const toast = useToast();
  const { hasPermission, loading: permLoading } = usePermissions();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ courses: Course[] }>('/admin/courses');
      setCourses(response.data.courses || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchModules = async (courseId: string) => {
    try {
      const response = await apiClient.get(`/admin/courses/${courseId}/modules`);
      setModules(response.data || []);
    } catch {
      console.error('Failed to fetch modules');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await apiClient.post('/admin/courses', {
        ...formData,
        price: formData.price ? Number(formData.price) : undefined,
        duration_value: formData.duration_value ? Number(formData.duration_value) : undefined,
      });
      toast.success('Course created successfully');
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchCourses();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to create course');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setFormLoading(true);
    try {
      await apiClient.put(`/admin/courses/${selectedCourse.id}`, {
        ...formData,
        price: formData.price ? Number(formData.price) : undefined,
        duration_value: formData.duration_value ? Number(formData.duration_value) : undefined,
      });
      toast.success('Course updated successfully');
      setShowEditModal(false);
      setSelectedCourse(null);
      setFormData(EMPTY_FORM);
      fetchCourses();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to update course');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;
    setFormLoading(true);
    try {
      await apiClient.delete(`/admin/courses/${selectedCourse.id}`);
      toast.success('Course deleted successfully');
      setShowDeleteModal(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to delete course');
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      title: course.title ?? course.name,
      description: course.description ?? '',
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
      level: course.level ?? '',
      status: course.status ?? (course.is_active ? 'active' : 'inactive'),
    });
    setShowEditModal(true);
  };

  const handleToggleExpand = (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      fetchModules(courseId);
    }
  };

  const glassSelect = "w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]";
  const glassSelectStyle = { background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' };
  const glassTextarea = "w-full px-3 py-2 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]";
  const glassTextareaStyle = { background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' };
  const labelStyle = { color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: 4 };

  const CourseFormFields = () => (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {/* Title / Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>
            Course Title <span style={{ color: '#f87171' }}>*</span>
          </label>
          <Input name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Full Stack Web Development" required />
        </div>
        <div>
          <label style={labelStyle}>Instructor</label>
          <Input name="instructor" value={formData.instructor} onChange={handleChange} placeholder="Instructor name" />
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          name="description"
          className={glassTextarea}
          style={glassTextareaStyle}
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Course description..."
        />
      </div>

      {/* Price + Duration */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Price (PKR)</label>
          <Input name="price" type="number" min="0" value={formData.price} onChange={handleChange} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Duration</label>
          <Input name="duration_value" type="number" min="0" value={formData.duration_value} onChange={handleChange} placeholder="e.g. 6" />
        </div>
        <div>
          <label style={labelStyle}>Unit</label>
          <select name="duration_unit" value={formData.duration_unit} onChange={handleChange}
            className={glassSelect} style={glassSelectStyle}>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Start Date</label>
          <Input name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <Input name="end_date" type="date" value={formData.end_date} onChange={handleChange} />
        </div>
        <div>
          <label style={labelStyle}>Last Enrollment Date</label>
          <Input name="last_enrollment_date" type="date" value={formData.last_enrollment_date} onChange={handleChange} />
        </div>
      </div>

      {/* Category + Level + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Category</label>
          <Input name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Programming" />
        </div>
        <div>
          <label style={labelStyle}>Level</label>
          <select name="level" value={formData.level} onChange={handleChange}
            className={glassSelect} style={glassSelectStyle}>
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select name="status" value={formData.status} onChange={handleChange}
            className={glassSelect} style={glassSelectStyle}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Thumbnail URL */}
      <div>
        <label style={labelStyle}>Thumbnail URL</label>
        <Input name="thumbnail" value={formData.thumbnail} onChange={handleChange} placeholder="https://example.com/image.png" />
      </div>

      {/* Terms & Conditions */}
      <div>
        <label style={labelStyle}>Terms &amp; Conditions</label>
        <textarea
          name="terms_and_conditions"
          className={glassTextarea}
          style={glassTextareaStyle}
          rows={4}
          value={formData.terms_and_conditions}
          onChange={handleChange}
          placeholder="Enter course terms and conditions..."
        />
      </div>
    </div>
  );

  const statColors: Record<string, string> = {
    Students: '#6366f1',
    Tests: '#a78bfa',
    Materials: '#38bdf8',
  };

  return (
    <PageWrapper
      title="Course Management"
      actions={
        hasPermission('add_course') ? (
          <Button
            onClick={() => { setFormData(EMPTY_FORM); setShowModal(true); }}
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 20 }}
          >
            Create Course
          </Button>
        ) : undefined
      }
    >
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: 80, right: 40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 80, left: 40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(52,211,153,0.05)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      {loading ? (
        <AdminCardGridSkeleton count={6} />
      ) : courses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="mb-4" style={{ color: '#94a3b8' }}>No courses found</p>
            {hasPermission('add_course') && (
              <Button
                onClick={() => setShowModal(true)}
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 20 }}
              >
                Create Your First Course
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ position: 'relative', zIndex: 1 }}>
          {courses.map((course) => (
            <div
              key={course.id}
              className="relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                borderRadius: 18,
                padding: '1rem',
              }}
            >
              {/* Top edge glow */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />

              {/* Thumbnail */}
              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title || course.name}
                  className="w-full h-36 object-cover rounded-t-xl mb-3 -mt-4 -mx-4"
                  style={{ width: 'calc(100% + 2rem)' }}
                />
              )}

              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold truncate" style={{ color: '#f1f5f9' }}>
                    {course.title || course.name}
                  </h3>
                  {course.instructor && (
                    <p className="text-xs" style={{ color: '#94a3b8' }}>👤 {course.instructor}</p>
                  )}
                  {course.category && (
                    <p className="text-xs mt-0.5" style={{ color: '#818cf8' }}>{course.category}</p>
                  )}
                </div>
                {(course.status === 'active' || course.is_active) ? (
                  <span className="ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}>
                    {course.status ?? 'active'}
                  </span>
                ) : course.status === 'draft' ? (
                  <span className="ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                    draft
                  </span>
                ) : (
                  <span className="ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                    {course.status ?? 'inactive'}
                  </span>
                )}
              </div>

              {course.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: '#94a3b8' }}>{course.description}</p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs mb-3" style={{ color: '#94a3b8' }}>
                {course.price !== undefined && (
                  <span className="font-medium" style={{ color: '#34d399' }}>PKR {course.price.toLocaleString()}</span>
                )}
                {course.duration_value && (
                  <span>{course.duration_value} {course.duration_unit}</span>
                )}
                {course.level && (
                  <span className="capitalize px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>{course.level}</span>
                )}
              </div>

              {/* Date info */}
              {(course.start_date || course.end_date) && (
                <div className="text-xs mb-3" style={{ color: '#64748b' }}>
                  {course.start_date && <span>From: {new Date(course.start_date).toLocaleDateString()}</span>}
                  {course.start_date && course.end_date && <span className="mx-1">→</span>}
                  {course.end_date && <span>To: {new Date(course.end_date).toLocaleDateString()}</span>}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Students', val: course.student_count },
                  { label: 'Tests', val: course.test_count },
                  { label: 'Materials', val: course.material_count },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                    <p className="text-lg font-bold" style={{ color: statColors[label] }}>{val}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => handleToggleExpand(course.id)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}
                >
                  {expandedCourse === course.id ? 'Hide Modules' : 'View Modules'}
                </button>
                <div className="flex items-center space-x-2">
                  {hasPermission('edit_course') && (
                    <button
                      onClick={() => openEdit(course)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8' }}
                    >
                      Edit
                    </button>
                  )}
                  {hasPermission('delete_course') && (
                    <button
                      onClick={() => { setSelectedCourse(course); setShowDeleteModal(true); }}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {expandedCourse === course.id && (
                <div className="mt-4 pt-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: '#f1f5f9' }}>Modules</h4>
                  {modules.length === 0 ? (
                    <p className="text-sm" style={{ color: '#94a3b8' }}>No modules yet</p>
                  ) : (
                    <div className="space-y-2">
                      {modules.map((module) => (
                        <div key={module.id} className="p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                          <p className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{module.name}</p>
                          {module.subjects && module.subjects.length > 0 && (
                            <div className="mt-1 pl-3 text-xs" style={{ color: '#94a3b8' }}>
                              {module.subjects.map((s) => s.name).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Course" size="lg">
        <form onSubmit={handleCreateCourse}>
          <CourseFormFields />
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-[10px] text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>Cancel</button>
            <Button type="submit" loading={formLoading} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 20 }}>Create Course</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Course" size="lg">
        <form onSubmit={handleUpdateCourse}>
          <CourseFormFields />
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-[10px] text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>Cancel</button>
            <Button type="submit" loading={formLoading} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 20 }}>Update Course</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Course Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Course" size="sm">
        <p className="mb-4" style={{ color: '#94a3b8' }}>
          Are you sure you want to delete <strong style={{ color: '#f1f5f9' }}>{selectedCourse?.title || selectedCourse?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-[10px] text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>Cancel</button>
          <Button variant="danger" onClick={handleDeleteCourse} loading={formLoading}>Delete</Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
