'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import PageWrapper from '@/components/layout/PageWrapper';
import { useStudentMaterials, useStudentRecentMaterials } from '@/hooks/queries/useStudentQueries';

interface Subject {
  id: string;
  name: string;
  modules?: {
    name: string;
    courses?: {
      name: string;
    };
  };
}

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'document' | 'link' | 'text';
  url: string;
  file_size: number;
  created_at: string;
  subjects: Subject;
  viewedAt?: string;
}

export default function StudyMaterialsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ subjectId: '', type: '', search: '' });
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showModal, setShowModal] = useState(false);

  // React Query hooks — materials cached 2 min, auto-refetch when filters change
  const { data: materialsRaw = [], isLoading: loading } = useStudentMaterials(filters);
  const { data: recentMaterialsRaw = [] } = useStudentRecentMaterials();

  const materials = materialsRaw as Material[];
  const recentMaterials = recentMaterialsRaw as Material[];

  const openMaterial = async (material: Material) => {
    setSelectedMaterial(material);
    setShowModal(true);

    // Log the view
    try {
      await apiClient.get(`/student/materials/${material.id}`);
    } catch (error) {
      console.error('Error logging material view:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'video': return '🎥';
      case 'document': return '📝';
      case 'link': return '🔗';
      case 'text': return '📃';
      default: return '📎';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <PageWrapper title="Study Materials">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Study Materials</h1>
          <p className="text-gray-500 dark:text-slate-400">Access learning resources and study materials</p>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search materials..."
                  className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
                >
                  <option value="">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="link">Link</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ subjectId: '', type: '', search: '' })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Recently Viewed */}
        {recentMaterials.length > 0 && (
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 dark:text-slate-100">Recently Viewed</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recentMaterials.slice(0, 5).map(material => (
                  <div
                    key={material.id}
                    onClick={() => openMaterial(material)}
                    className="flex-shrink-0 w-48 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <div className="text-2xl mb-2">{getTypeIcon(material.type)}</div>
                    <p className="font-medium text-sm truncate">{material.title}</p>
                    <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">{material.subjects?.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Materials Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-slate-600 rounded" />
                  <div className="h-5 bg-gray-200 dark:bg-slate-600 rounded w-16" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-2/3 mb-4" />
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-20" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : materials.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">
              No study materials found.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(material => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-4" onClick={() => openMaterial(material)}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{getTypeIcon(material.type)}</span>
                    <Badge variant="info">{material.type.toUpperCase()}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 dark:text-slate-100">{material.title}</h3>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2 dark:text-slate-400">
                    {material.description || 'No description'}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-400 dark:text-slate-500">
                    <span>{material.subjects?.name || 'General'}</span>
                    {material.file_size && <span>{formatFileSize(material.file_size)}</span>}
                  </div>
                  <div className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                    Added: {formatDate(material.created_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Material Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedMaterial(null); }}
        title={selectedMaterial?.title || 'Material'}
        size="lg"
      >
        {selectedMaterial && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{getTypeIcon(selectedMaterial.type)}</span>
              <Badge variant="info">{selectedMaterial.type.toUpperCase()}</Badge>
              {selectedMaterial.file_size && (
                <span className="text-sm text-gray-500 dark:text-slate-400">{formatFileSize(selectedMaterial.file_size)}</span>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg dark:bg-slate-800">
              <p className="text-sm text-gray-600 dark:text-slate-300">{selectedMaterial.description || 'No description available'}</p>
              <p className="text-xs text-gray-400 mt-2 dark:text-slate-500">
                Subject: {selectedMaterial.subjects?.name || 'General'}
              </p>
            </div>

            {(selectedMaterial.type === 'pdf' || selectedMaterial.type === 'document' || selectedMaterial.type === 'link') && selectedMaterial.url && (
              <div className="space-y-3">
                <a
                  href={selectedMaterial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full">
                    {selectedMaterial.type === 'link' ? 'Open Link' : 'Download File'}
                  </Button>
                </a>
              </div>
            )}

            {selectedMaterial.type === 'video' && selectedMaterial.url && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={selectedMaterial.url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {selectedMaterial.type === 'text' && (
              <div className="prose max-w-none p-4 bg-gray-50 rounded-lg dark:bg-slate-800">
                <p className="whitespace-pre-wrap">Content would be displayed here from the server.</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}