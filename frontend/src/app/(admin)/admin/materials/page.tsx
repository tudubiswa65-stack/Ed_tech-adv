'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { AdminCardGridSkeleton } from '@/components/admin/AdminPageSkeletons';
import PageWrapper from '@/components/layout/PageWrapper';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/hooks/useAuth';

interface Course {
  id: string;
  name: string;
}

interface Material {
  id: string;
  title: string;
  description?: string;
  url: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  is_active?: boolean;
  is_published?: boolean;
  created_at: string;
  course_id?: string;
  branch_id?: string;
  courses?: { id: string; name: string };
  branches?: { id: string; name: string };
  uploaded_by_admin?: { id: string; name: string };
}

interface MaterialsResponse {
  materials: Material[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif';

export default function MaterialsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterCourseId, setFilterCourseId] = useState(searchParams?.get('courseId') || '');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    courseId: '',
    file: null as File | null,
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    isActive: true,
  });

  const isBranchAdmin = user?.role === 'branch_admin';

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [page, filterCourseId]);

  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/admin/courses');
      setCourses(res.data.courses || []);
    } catch {
      // non-fatal
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (filterCourseId) params.append('courseId', filterCourseId);
      const res = await apiClient.get<MaterialsResponse>(`/admin/materials?${params}`);
      setMaterials(res.data.materials || []);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch {
      toast.error('Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.courseId || !uploadForm.title.trim()) {
      toast.error('Title, course, and file are required');
      return;
    }
    setSaving(true);
    setUploadProgress(0);
    try {
      // Step 1: Upload file to B2
      const fd = new FormData();
      fd.append('file', uploadForm.file);
      setUploadProgress(30);
      const uploadRes = await apiClient.post('/admin/materials/upload', fd);
      setUploadProgress(70);

      const { key, fileSize, fileName, fileType } = uploadRes.data;

      // Step 2: Create material record + trigger notifications
      await apiClient.post('/admin/materials', {
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || undefined,
        courseId: uploadForm.courseId,
        fileKey: key,
        fileName,
        fileType,
        fileSize,
      });
      setUploadProgress(100);

      toast.success('Material uploaded successfully');
      setShowUploadModal(false);
      resetUploadForm();
      fetchMaterials();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to upload material');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    setSaving(true);
    try {
      await apiClient.put(`/admin/materials/${selectedMaterial.id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        isActive: editForm.isActive,
      });
      toast.success('Material updated successfully');
      setShowEditModal(false);
      fetchMaterials();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to update material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMaterial) return;
    setSaving(true);
    try {
      await apiClient.delete(`/admin/materials/${selectedMaterial.id}`);
      toast.success('Material deleted successfully');
      setShowDeleteModal(false);
      fetchMaterials();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to delete material');
    } finally {
      setSaving(false);
    }
  };

  const openSignedUrl = async (id: string) => {
    try {
      const res = await apiClient.get(`/admin/materials/${id}/signed-url`);
      window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to generate download link');
    }
  };

  const resetUploadForm = () => {
    setUploadForm({ title: '', description: '', courseId: '', file: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditModal = (material: Material) => {
    setSelectedMaterial(material);
    setEditForm({
      title: material.title,
      description: material.description || '',
      isActive: material.is_active ?? material.is_published ?? true,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (material: Material) => {
    setSelectedMaterial(material);
    setShowDeleteModal(true);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType?: string, fileName?: string) => {
    const t = fileType || '';
    const n = (fileName || '').toLowerCase();
    if (t.includes('pdf') || n.endsWith('.pdf')) return '📄';
    if (t.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return '📝';
    if (t.includes('powerpoint') || t.includes('presentation') || n.endsWith('.ppt') || n.endsWith('.pptx')) return '📊';
    if (t.startsWith('image/') || n.match(/\.(jpg|jpeg|png|gif|webp)$/)) return '🖼️';
    return '📎';
  };

  return (
    <PageWrapper title="Study Materials">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Study Materials</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm">Upload and manage learning resources</p>
          </div>
          {isBranchAdmin && (
            <Button onClick={() => { resetUploadForm(); setShowUploadModal(true); }}>
              + Upload Material
            </Button>
          )}
        </div>

        {/* Filter */}
        <Card>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Filter by Course</label>
                <select
                  value={filterCourseId}
                  onChange={(e) => { setFilterCourseId(e.target.value); setPage(1); }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {filterCourseId && (
                <div className="flex items-end">
                  <Button variant="outline" size="sm" onClick={() => { setFilterCourseId(''); setPage(1); }}>
                    Clear Filter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Materials Grid */}
        {loading ? (
          <AdminCardGridSkeleton count={6} />
        ) : materials.length === 0 ? (
          <Card>
            <div className="p-10 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-500 dark:text-slate-400">
                {isBranchAdmin ? 'No materials yet. Click "+ Upload Material" to add one.' : 'No study materials found.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(material => {
              const isActive = material.is_active ?? material.is_published ?? true;
              return (
                <Card key={material.id}>
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{getFileIcon(material.file_type, material.file_name)}</span>
                      <Badge variant={isActive ? 'success' : 'warning'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-1">{material.title}</h3>
                    {material.description && (
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-2 line-clamp-2">{material.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                      {material.courses?.name || 'No course'}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-400 dark:text-slate-500 mt-auto pt-2">
                      <span>{formatFileSize(material.file_size)}</span>
                      <span>{new Date(material.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openSignedUrl(material.id)}>
                        View
                      </Button>
                      {isBranchAdmin && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(material)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                            onClick={() => openDeleteModal(material)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => { setShowUploadModal(false); resetUploadForm(); }} title="Upload Material" size="lg">
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            label="Title *"
            value={uploadForm.title}
            onChange={(e) => setUploadForm(f => ({ ...f, title: e.target.value }))}
            required
            placeholder="e.g. Chapter 3 Notes"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Description</label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Optional description..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Course *</label>
            <select
              value={uploadForm.courseId}
              onChange={(e) => setUploadForm(f => ({ ...f, courseId: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
              File * <span className="text-xs text-gray-400">(PDF, DOC, DOCX, PPT, PPTX, Images — max 50 MB)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              required
              onChange={(e) => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
              className="w-full text-sm text-gray-700 dark:text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-slate-700 dark:file:text-slate-200 hover:file:bg-indigo-100 dark:hover:file:bg-slate-600 cursor-pointer"
            />
            {uploadForm.file && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
              </p>
            )}
          </div>

          {/* Upload progress */}
          {saving && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowUploadModal(false); resetUploadForm(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Upload Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Material">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Title *"
            value={editForm.title}
            onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={editForm.isActive}
              onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300 dark:border-slate-500 text-indigo-600"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-slate-200">Active (visible to students)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Material" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-slate-300">
            Are you sure you want to delete <strong>&quot;{selectedMaterial?.title}&quot;</strong>? This will also delete the file from storage. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={saving} disabled={saving} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
