'use client';

import { useState, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { AdminTableSkeleton } from '@/components/admin/AdminPageSkeletons';
import PageWrapper from '@/components/layout/PageWrapper';
import Switch from '@/components/ui/Switch';
import { useAdminCourses, useAdminTestsList, adminQueryKeys } from '@/hooks/queries/useAdminQueries';
import { queryClient } from '@/lib/queryClient';

interface Test {
  id: string;
  title: string;
  description: string;
  type: 'graded' | 'practice';
  course_id: string;
  courses?: { name: string };
  time_limit_mins: number;
  is_active: boolean;
  scheduled_at?: string;
  question_count: number;
  submission_count: number;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  order_index: number;
}

export default function TestsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ courseId: '', type: '' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    timeLimit: 60,
    type: 'graded',
    scheduledAt: '',
    isActive: false
  });
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'a'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignAllCourse, setAssignAllCourse] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // React Query hooks — courses cached 30 min; tests list cached 60 s, auto-refetch when filters change
  const { data: courses = [] } = useAdminCourses();
  const testsFilterKey = { courseId: filters.courseId, type: filters.type };
  const { data: tests = [], isLoading: testsLoading } = useAdminTestsList(testsFilterKey);
  const isLoading = testsLoading || loading;

  const fetchQuestions = async (testId: string) => {
    try {
      const response = await apiClient.get<Question[]>(`/admin/tests/${testId}/questions`);
      setQuestions(response.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        course_id: formData.courseId,
        time_limit_mins: formData.timeLimit,
        type: formData.type,
        scheduled_at: formData.scheduledAt || null,
        is_active: formData.isActive
      };

      if (editingTest) {
        await apiClient.put(`/admin/tests/${editingTest.id}`, payload);
      } else {
        await apiClient.post('/admin/tests', payload);
      }

      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'tests-list'] });
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (test: Test) => {
    setEditingTest(test);
    setFormData({
      title: test.title,
      description: test.description || '',
      courseId: test.course_id,
      timeLimit: test.time_limit_mins,
      type: test.type,
      scheduledAt: test.scheduled_at ? test.scheduled_at.slice(0, 16) : '',
      isActive: test.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    try {
      await apiClient.delete(`/admin/tests/${id}`);
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'tests-list'] });
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test');
    }
  };

  const handleToggleActive = async (test: Test) => {
    try {
      await apiClient.put(`/admin/tests/${test.id}`, { is_active: !test.is_active });
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'tests-list'] });
    } catch (error) {
      console.error('Error toggling test:', error);
      alert('Failed to update test status');
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId) return;
    setSaving(true);
    try {
      await apiClient.post(`/admin/tests/${selectedTestId}/questions`, {
        question_text: questionForm.questionText,
        option_a: questionForm.optionA,
        option_b: questionForm.optionB,
        option_c: questionForm.optionC,
        option_d: questionForm.optionD,
        correct_option: questionForm.correctOption
      });
      
      setQuestionForm({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'a'
      });
      fetchQuestions(selectedTestId);
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await apiClient.delete(`/admin/tests/questions/${questionId}`);
      if (selectedTestId) fetchQuestions(selectedTestId);
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTestId) return;
    setSaving(true);
    try {
      await apiClient.post(`/admin/tests/${selectedTestId}/assign`, {
        assign_all_course: assignAllCourse,
        student_ids: selectedStudents
      });
      
      setShowAssignModal(false);
      alert('Test assigned successfully');
    } catch (error) {
      console.error('Error assigning test:', error);
      alert('Failed to assign test');
    } finally {
      setSaving(false);
    }
  };

  const openQuestionsModal = (testId: string) => {
    setSelectedTestId(testId);
    fetchQuestions(testId);
    setShowQuestionModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTestId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const formPayload = new FormData();
    formPayload.append('file', file);
    setSaving(true);
    try {
      const res = await apiClient.post<{ success: number; message: string }>(
        `/admin/tests/${selectedTestId}/questions/bulk`,
        formPayload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      alert(res.data.message || `Uploaded ${res.data.success} questions`);
      fetchQuestions(selectedTestId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Failed to upload questions');
    } finally {
      setSaving(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openAssignModal = (testId: string) => {
    setSelectedTestId(testId);
    setShowAssignModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      timeLimit: 60,
      type: 'graded',
      scheduledAt: '',
      isActive: false
    });
    setEditingTest(null);
  };

  const getStatusBadge = (test: Test) => {
    if (test.scheduled_at && new Date(test.scheduled_at) > new Date()) {
      return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>Scheduled</span>;
    }
    return test.is_active
      ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}>Active</span>
      : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>Inactive</span>;
  };

  return (
    <PageWrapper title="Tests">
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: 80, right: 40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 80, left: 40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(52,211,153,0.05)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="space-y-6" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Tests</h1>
            <p style={{ color: '#94a3b8' }}>Create and manage tests for students</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-4 py-2 text-sm font-medium"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 20 }}
          >
            + Create Test
          </button>
        </div>

        {/* Filters */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 18 }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                  Course
                </label>
                <select
                  value={filters.courseId}
                  onChange={(e) => setFilters(f => ({ ...f, courseId: e.target.value }))}
                  className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
                >
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
                >
                  <option value="">All Types</option>
                  <option value="graded">Graded</option>
                  <option value="practice">Practice</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ courseId: '', type: '' })}
                  className="w-full px-3 py-2 rounded-[10px] text-sm"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tests Table */}
        {isLoading ? (
          <div
            className="relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 18 }}
          >
            <AdminTableSkeleton rows={6} cols={6} />
          </div>
        ) : tests.length === 0 ? (
          <div
            className="relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 18 }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />
            <div className="p-8 text-center" style={{ color: '#94a3b8' }}>
              No tests found. Click &quot;Create Test&quot; to add one.
            </div>
          </div>
        ) : (
          <div
            className="relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 18 }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <tr>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Title</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Course</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Type</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Time</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Questions</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Submissions</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Status</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map(test => (
                    <tr key={test.id} style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium" style={{ color: '#f1f5f9' }}>{test.title}</p>
                          {test.description && (
                            <p className="text-xs line-clamp-1" style={{ color: '#94a3b8' }}>{test.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#94a3b8' }}>{test.courses?.name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {test.type === 'graded' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8' }}>{test.type}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}>{test.type}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#94a3b8' }}>{test.time_limit_mins} min</td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#94a3b8' }}>{test.question_count}</td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#94a3b8' }}>{test.submission_count}</td>
                      <td className="py-3 px-4">{getStatusBadge(test)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => handleEdit(test)} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8' }}>
                            Edit
                          </button>
                          <button onClick={() => openQuestionsModal(test.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>
                            Questions
                          </button>
                          <button onClick={() => openAssignModal(test.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>
                            Assign
                          </button>
                          <button
                            onClick={() => handleToggleActive(test)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={test.is_active
                              ? { background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }
                              : { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}
                          >
                            {test.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(test.id)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Test Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingTest ? 'Edit Test' : 'Create New Test'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
            required
          />
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Course</label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData(f => ({ ...f, courseId: e.target.value }))}
              required
              className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
            >
              <option value="">Select Course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Time Limit (minutes)</label>
              <Input
                type="number"
                value={formData.timeLimit}
                onChange={(e) => setFormData(f => ({ ...f, timeLimit: parseInt(e.target.value) || 60 }))}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
              >
                <option value="graded">Graded</option>
                <option value="practice">Practice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Schedule (optional)</label>
            <Input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(f => ({ ...f, scheduledAt: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded"
              style={{ borderColor: 'rgba(255,255,255,0.15)', accentColor: '#6366f1' }}
            />
            <label htmlFor="isActive" className="text-sm" style={{ color: '#94a3b8' }}>
              Activate immediately
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 rounded-[10px] text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-[20px] text-sm font-medium" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none' }}>
              {saving ? 'Saving...' : editingTest ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Questions Modal */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => { setShowQuestionModal(false); setSelectedTestId(null); }}
        title="Test Questions"
        size="lg"
      >
        <div className="space-y-4">
          {/* File Upload Section */}
          <div className="p-4 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: '#818cf8' }}>📂 Bulk Upload Questions</h4>
            <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
              Upload a <strong>CSV</strong> (columns: question_text, option_a, option_b, option_c, option_d, correct_option),{' '}
              <strong>PDF</strong>, or <strong>DOCX</strong> file with numbered MCQs.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="text-sm px-3 py-1.5 rounded-[10px]"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}
              >
                {saving ? 'Uploading…' : '⬆ Choose File (CSV / PDF / DOCX)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <form onSubmit={handleQuestionSubmit} className="space-y-3 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Question Text</label>
              <textarea
                value={questionForm.questionText}
                onChange={(e) => setQuestionForm(f => ({ ...f, questionText: e.target.value }))}
                rows={2}
                required
                className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Option A</label>
                <Input
                  value={questionForm.optionA}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionA: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Option B</label>
                <Input
                  value={questionForm.optionB}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionB: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Option C</label>
                <Input
                  value={questionForm.optionC}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionC: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Option D</label>
                <Input
                  value={questionForm.optionD}
                  onChange={(e) => setQuestionForm(f => ({ ...f, optionD: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Correct Option</label>
              <select
                value={questionForm.correctOption}
                onChange={(e) => setQuestionForm(f => ({ ...f, correctOption: e.target.value }))}
                className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>
            <button type="submit" disabled={saving} className="text-sm px-4 py-1.5 rounded-[20px] font-medium" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none' }}>
              {saving ? 'Adding...' : 'Add Question'}
            </button>
          </form>

          <div>
            {questions.length === 0 ? (
              <p className="text-center py-4" style={{ color: '#94a3b8' }}>No questions yet</p>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="py-3 flex justify-between items-start" style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{idx + 1}. {q.question_text}</p>
                    <div className="text-xs mt-1 space-x-2" style={{ color: '#94a3b8' }}>
                      <span>A: {q.option_a}</span>
                      <span>B: {q.option_b}</span>
                      <span>C: {q.option_c}</span>
                      <span>D: {q.option_d}</span>
                    </div>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}>
                      Correct: {q.correct_option.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-xs px-3 py-1.5 rounded-lg ml-2 shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Assign Test Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedTestId(null); }}
        title="Assign Test"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Choose how to assign this test to students:
          </p>
          
          <Switch
            checked={assignAllCourse}
            onChange={setAssignAllCourse}
            label="Assign to all students in course"
            description="Automatically assign to all active students enrolled in the course"
          />

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowAssignModal(false); setSelectedTestId(null); }} className="px-4 py-2 rounded-[10px] text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>
              Cancel
            </button>
            <button onClick={handleAssignTest} disabled={saving} className="px-4 py-2 rounded-[20px] text-sm font-medium" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none' }}>
              {saving ? 'Assigning...' : 'Assign Test'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
