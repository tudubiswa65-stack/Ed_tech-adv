'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { TableOnlySkeleton } from '@/components/super-admin/SuperAdminPageSkeletons';

interface Branch {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  branch_id?: string;
}

interface Material {
  id: string;
  title: string;
  description?: string;
  url?: string;
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
  success: boolean;
  data: {
    materials: Material[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export default function SuperAdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterCourseId, setFilterCourseId] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const filteredCourses = filterBranchId
    ? courses.filter(c => c.branch_id === filterBranchId)
    : courses;

  useEffect(() => {
    fetchBranchesAndCourses();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [page, filterBranchId, filterCourseId]);

  const fetchBranchesAndCourses = async () => {
    try {
      const [branchRes, courseRes] = await Promise.all([
        apiClient.get('/super-admin/branches'),
        apiClient.get('/super-admin/courses'),
      ]);
      const branchData = branchRes.data?.data?.branches || branchRes.data?.branches || branchRes.data || [];
      const courseData = courseRes.data?.data?.courses || courseRes.data?.courses || courseRes.data || [];
      setBranches(Array.isArray(branchData) ? branchData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
    } catch {
      // non-fatal
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterBranchId) params.append('branchId', filterBranchId);
      if (filterCourseId) params.append('courseId', filterCourseId);
      const res = await apiClient.get<MaterialsResponse>(`/super-admin/materials?${params}`);
      const data = res.data?.data;
      setMaterials(data?.materials || []);
      setTotalPages(data?.pagination?.totalPages ?? 1);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const openMaterial = async (material: Material) => {
    setOpeningId(material.id);
    try {
      const res = await apiClient.get(`/super-admin/materials/${material.id}/signed-url`);
      const signedUrl = res.data?.data?.signedUrl || res.data?.signedUrl;
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // non-fatal
    } finally {
      setOpeningId(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '–';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileLabel = (fileType?: string, fileName?: string) => {
    const t = fileType || '';
    const n = (fileName || '').toLowerCase();
    if (t.includes('pdf') || n.endsWith('.pdf')) return 'PDF';
    if (t.includes('word') || n.endsWith('.docx')) return 'DOCX';
    if (t.includes('msword') || n.endsWith('.doc')) return 'DOC';
    if (t.includes('presentation') || n.endsWith('.pptx')) return 'PPTX';
    if (t.includes('powerpoint') || n.endsWith('.ppt')) return 'PPT';
    if (t.startsWith('image/')) return 'Image';
    return 'File';
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Study Materials</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Read-only view of all materials across all branches</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Branch</label>
              <select
                value={filterBranchId}
                onChange={(e) => { setFilterBranchId(e.target.value); setFilterCourseId(''); setPage(1); }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Course</label>
              <select
                value={filterCourseId}
                onChange={(e) => { setFilterCourseId(e.target.value); setPage(1); }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">All Courses</option>
                {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {(filterBranchId || filterCourseId) && (
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={() => { setFilterBranchId(''); setFilterCourseId(''); setPage(1); }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <TableOnlySkeleton />
      ) : materials.length === 0 ? (
        <Card>
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-500 dark:text-slate-400">No study materials found.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Course</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Branch</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Uploaded By</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Size</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-200">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {materials.map(material => (
                  <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100 line-clamp-1">{material.title}</p>
                        {material.description && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 line-clamp-1 mt-0.5">{material.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{material.courses?.name || '–'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{material.branches?.name || '–'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{material.uploaded_by_admin?.name || '–'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{getFileLabel(material.file_type, material.file_name)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{formatFileSize(material.file_size)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">
                      {new Date(material.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={openingId === material.id}
                        disabled={openingId === material.id}
                        onClick={() => openMaterial(material)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
  );
}
