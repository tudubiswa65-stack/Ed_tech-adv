'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import PageWrapper from '@/components/layout/PageWrapper';
import { useStudentMaterials } from '@/hooks/queries/useStudentQueries';

interface Course {
  id: string;
  name: string;
}

interface Material {
  id: string;
  title: string;
  description?: string;
  url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  course_id?: string;
  courses?: { id: string; name: string };
}

export default function StudyMaterialsPage() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams?.get('courseId') || '';

  const [courses, setCourses] = useState<Course[]>([]);
  const [filterCourseId, setFilterCourseId] = useState(initialCourseId);
  const [search, setSearch] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const filters: Record<string, string> = {};
  if (filterCourseId) filters.courseId = filterCourseId;
  if (search) filters.search = search;

  const { data: materialsRaw = [], isLoading: loading } = useStudentMaterials(filters);
  const materials = materialsRaw as Material[];

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  // Re-apply courseId filter when URL param changes (e.g. notification tap)
  useEffect(() => {
    const courseId = searchParams?.get('courseId') || '';
    setFilterCourseId(courseId);
  }, [searchParams]);

  const fetchEnrolledCourses = async () => {
    try {
      const res = await apiClient.get('/student/materials/subjects');
      setCourses((res.data.data || res.data) as Course[]);
    } catch {
      // non-fatal
    }
  };

  const openMaterial = async (material: Material) => {
    setOpeningId(material.id);
    try {
      const res = await apiClient.get(`/student/materials/${material.id}/signed-url`);
      const signedUrl = res.data.data?.signedUrl || res.data.signedUrl;
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // fallback: try direct URL
      if (material.url && !material.url.startsWith('materials/')) {
        window.open(material.url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setOpeningId(null);
    }
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
    <PageWrapper title="Study Materials">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Study Materials</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Access learning resources from your enrolled courses</p>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Course</label>
                <select
                  value={filterCourseId}
                  onChange={(e) => setFilterCourseId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">All Enrolled Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search materials..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Materials Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 h-44" />
            ))}
          </div>
        ) : materials.length === 0 ? (
          <Card>
            <div className="p-10 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-500 dark:text-slate-400">No study materials found for your enrolled courses.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(material => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow">
                <div className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{getFileIcon(material.file_type, material.file_name)}</span>
                    <Badge variant="info">{getFileLabel(material.file_type, material.file_name)}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{material.title}</h3>
                  {material.description && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-2 line-clamp-2">{material.description}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                    {material.courses?.name || 'Course'}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-400 dark:text-slate-500 mt-auto pt-2">
                    {material.file_size ? <span>{formatFileSize(material.file_size)}</span> : <span />}
                    <span>{new Date(material.created_at).toLocaleDateString()}</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    loading={openingId === material.id}
                    disabled={openingId === material.id}
                    onClick={() => openMaterial(material)}
                  >
                    View / Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
