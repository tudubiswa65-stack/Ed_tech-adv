'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { AdminTableSkeleton } from '@/components/admin/AdminPageSkeletons';
import PageWrapper from '@/components/layout/PageWrapper';
import { useAdminResults, useAdminTestsList } from '@/hooks/queries/useAdminQueries';

interface Test {
  id: string;
  title: string;
  total_marks: number;
  passing_marks: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
}

interface Result {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: 'passed' | 'failed' | 'pending';
  time_taken_seconds: number;
  submitted_at: string;
  started_at: string;
  tests: Test;
  students: Student;
}

interface ResultsResponse {
  results: Result[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TestOption {
  id: string;
  title: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    testId: searchParams.get('testId') || '',
    status: '',
    sortBy: 'submitted_at',
    sortOrder: 'desc'
  });

  // React Query hooks — results cached 60 s, tests dropdown cached 60 s
  const { data: resultsData, isLoading: loading, isError } = useAdminResults(page, filters);
  const { data: tests = [] } = useAdminTestsList();

  const results = resultsData?.results ?? [];
  const totalPages = resultsData?.totalPages ?? 1;

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.testId) params.append('testId', filters.testId);
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.get(`/admin/results/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results');
    } finally {
      setExporting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <PageWrapper title="Results & Analytics">
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: 80, right: 40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 80, left: 40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(52,211,153,0.05)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="space-y-6" style={{ position: 'relative', zIndex: 1 }}>
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
                  Filter by Test
                </label>
                <select
                  value={filters.testId}
                  onChange={(e) => handleFilterChange('testId', e.target.value)}
                  className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
                >
                  <option value="">All Tests</option>
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
                >
                  <option value="">All Status</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', color: '#f1f5f9' }}
                >
                  <option value="submitted_at">Submitted Date</option>
                  <option value="score">Score</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={exportToCSV}
                  disabled={exporting}
                  className="w-full px-3 py-2 rounded-[10px] text-sm"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}
                >
                  {exporting ? 'Exporting...' : 'Export to CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 18 }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#f1f5f9' }}>Test Results</h3>
            {loading ? (
              <AdminTableSkeleton rows={6} cols={6} />
            ) : isError ? (
              <p className="text-center py-8" style={{ color: '#f87171' }}>Failed to load results. Please try again.</p>
            ) : results.length === 0 ? (
              <p className="text-center py-8" style={{ color: '#94a3b8' }}>No results found</p>
            ) : (
              <>
                <Table
                  columns={[
                    { key: 'student', label: 'Student', render: (result: Result) => (
                      <div>
                        <div className="font-medium" style={{ color: '#f1f5f9' }}>{result.students?.name || 'N/A'}</div>
                        <div className="text-sm" style={{ color: '#94a3b8' }}>{result.students?.email}</div>
                      </div>
                    )},
                    { key: 'rollno', label: 'Roll No.', render: (result: Result) => result.students?.roll_number || 'N/A' },
                    { key: 'test', label: 'Test', render: (result: Result) => result.tests?.title || 'N/A' },
                    { key: 'score', label: 'Score', render: (result: Result) => `${result.score} / ${result.total_marks}` },
                    { key: 'percentage', label: 'Percentage', render: (result: Result) => `${result.percentage?.toFixed(1)}%` },
                    { key: 'status', label: 'Status', render: (result: Result) => (
                      result.status === 'passed'
                        ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}>passed</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>failed</span>
                    )},
                    { key: 'timeTaken', label: 'Time Taken', render: (result: Result) => result.time_taken_seconds ? formatTime(result.time_taken_seconds) : 'N/A' },
                    { key: 'submitted', label: 'Submitted', render: (result: Result) => result.submitted_at ? formatDate(result.submitted_at) : 'N/A' },
                    { key: 'actions', label: 'Actions', render: (result: Result) => (
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/admin/results/${result.id}`)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8' }}
                        >
                          View
                        </button>
                        {result.tests?.id && (
                          <button
                            onClick={() => router.push(`/admin/results/analytics/test/${result.tests.id}`)}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}
                          >
                            Analytics
                          </button>
                        )}
                      </div>
                    )}
                  ]}
                  data={results}
                  loading={loading}
                  emptyMessage="No results found"
                  onRowClick={(result) => router.push(`/admin/results/${result.id}`)}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm" style={{ color: '#94a3b8' }}>
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}