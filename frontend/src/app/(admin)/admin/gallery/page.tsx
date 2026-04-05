'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import PageWrapper from '@/components/layout/PageWrapper';
import {
  useGalleryLabel,
  useGallerySubmissions,
  useAdminStudents,
  adminQueryKeys,
  type GalleryLabelData,
  type GallerySubmission,
} from '@/hooks/queries/useAdminQueries';

// ── Types ────────────────────────────────────────────────────────────────────

type SubmissionStatus = 'all' | 'pending' | 'approved' | 'rejected';

// ── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const show = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  return { message, show };
}

function Toast({ message }: { message: { text: string; type: 'success' | 'error' } | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all ${
        message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
      }`}
    >
      {message.text}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'approved'
      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
      : status === 'rejected'
        ? 'bg-red-600/20 text-red-400 border border-red-600/30'
        : 'bg-amber-600/20 text-amber-400 border border-amber-600/30';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{status}</span>
  );
}

// ── Gallery Label Tab ─────────────────────────────────────────────────────────

function GalleryLabelTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const queryClient = useQueryClient();
  const { data: label, isLoading } = useGalleryLabel();
  const [form, setForm] = useState<GalleryLabelData | null>(null);

  // Initialise form from fetched data (once)
  const initialised = useRef(false);
  if (label && !initialised.current) {
    setForm(label);
    initialised.current = true;
  }

  const mutation = useMutation({
    mutationFn: async (payload: GalleryLabelData) => {
      await apiClient.put('/admin/gallery/label', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.galleryLabel() });
      toast.show('Gallery label updated');
    },
    onError: () => toast.show('Failed to update label', 'error'),
  });

  if (isLoading) {
    return <p className="text-slate-400 py-8 text-center">Loading…</p>;
  }

  const current = form ?? {
    title: 'Hall of Fame',
    subtitle: 'Celebrating our brightest students',
    season_tag: null,
  };

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(current);
      }}
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="gl-title">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="gl-title"
          type="text"
          maxLength={100}
          required
          value={current.title}
          onChange={(e) => setForm({ ...current, title: e.target.value })}
          className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="gl-subtitle">
          Subtitle <span className="text-red-400">*</span>
        </label>
        <input
          id="gl-subtitle"
          type="text"
          maxLength={100}
          required
          value={current.subtitle}
          onChange={(e) => setForm({ ...current, subtitle: e.target.value })}
          className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="gl-season">
          Season Tag <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="gl-season"
          type="text"
          maxLength={50}
          value={current.season_tag ?? ''}
          onChange={(e) =>
            setForm({ ...current, season_tag: e.target.value.trim() || null })
          }
          className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="e.g. April 2026 Edition"
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        {mutation.isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}

// ── Upload Form ───────────────────────────────────────────────────────────────

function UploadForm({
  toast,
  onSuccess,
}: {
  toast: ReturnType<typeof useToast>;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: studentsData } = useAdminStudents({ limit: 200 });
  const students = studentsData?.students ?? [];

  const [form, setForm] = useState({
    student_id: '',
    title: '',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.show('Please select an image', 'error');
      return;
    }
    if (!form.student_id) {
      toast.show('Please select a student', 'error');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('student_id', form.student_id);
      fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);

      await apiClient.post('/admin/gallery/submissions', fd);
      setForm({ student_id: '', title: '', description: '' });
      setFile(null);
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'gallery'] });
      toast.show('Submission uploaded successfully');
      onSuccess();
    } catch {
      toast.show('Failed to upload submission', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1e293b] rounded-2xl border border-white/8 p-5 mb-6 space-y-4"
    >
      <h3 className="text-white font-semibold text-sm">Upload New Submission</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="up-student">
            Student <span className="text-red-400">*</span>
          </label>
          <select
            id="up-student"
            required
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Select student…</option>
            {students.map((s: { id: string; name: string }) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="up-title">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="up-title"
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="e.g. Achievement Highlight"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1" htmlFor="up-desc">
          Description
        </label>
        <textarea
          id="up-desc"
          rows={2}
          maxLength={500}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          placeholder="Optional description…"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1" htmlFor="up-file">
          Image <span className="text-red-400">*</span>{' '}
          <span className="text-slate-500">(JPEG/PNG/WebP, max 10 MB)</span>
        </label>
        <input
          id="up-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:text-xs file:cursor-pointer hover:file:bg-violet-500"
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        {uploading ? 'Uploading…' : 'Upload Submission'}
      </button>
    </form>
  );
}

// ── Submissions Tab ───────────────────────────────────────────────────────────

function SubmissionsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus>('all');

  const { data: submissions = [], isLoading } = useGallerySubmissions(statusFilter);

  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      await apiClient.patch(`/admin/gallery/submissions/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'gallery'] });
      toast.show('Submission updated');
    },
    onError: () => toast.show('Failed to update submission', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/gallery/submissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'gallery'] });
      toast.show('Submission deleted');
    },
    onError: () => toast.show('Failed to delete submission', 'error'),
  });

  const STATUS_TABS: SubmissionStatus[] = ['all', 'pending', 'approved', 'rejected'];

  return (
    <div>
      <UploadForm toast={toast} onSuccess={() => setStatusFilter('approved')} />

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === s
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-slate-400 py-8 text-center">Loading submissions…</p>
      ) : submissions.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">No submissions found.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub: GallerySubmission) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              onPatch={(payload) => patchMutation.mutate({ id: sub.id, payload })}
              onDelete={() => {
                if (!confirm('Delete this submission? This cannot be undone.')) return;
                deleteMutation.mutate(sub.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Submission Card ───────────────────────────────────────────────────────────

function SubmissionCard({
  submission,
  onPatch,
  onDelete,
}: {
  submission: GallerySubmission;
  onPatch: (payload: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-4 bg-[#1e293b] rounded-2xl border border-white/8 p-4 items-start">
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={submission.thumbnail_url}
        alt={submission.title}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold text-sm truncate">{submission.title}</span>
          <StatusBadge status={submission.status} />
          {submission.is_pinned && (
            <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-2 py-0.5 rounded-full text-xs font-semibold">
              📌 Pinned
            </span>
          )}
        </div>
        <p className="text-slate-400 text-xs mt-0.5">{submission.student_first_name}</p>
        <p className="text-slate-600 text-xs mt-0.5">
          Submitted {new Date(submission.submitted_at).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {submission.status !== 'approved' && (
          <button
            onClick={() => onPatch({ status: 'approved' })}
            className="text-xs px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-colors"
          >
            Approve
          </button>
        )}
        {submission.status !== 'rejected' && (
          <button
            onClick={() => onPatch({ status: 'rejected' })}
            className="text-xs px-2 py-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors"
          >
            Reject
          </button>
        )}
        <button
          onClick={() => onPatch({ is_pinned: !submission.is_pinned })}
          className="text-xs px-2 py-1 rounded-lg bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40 transition-colors"
        >
          {submission.is_pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          onClick={onDelete}
          className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminGalleryPage() {
  const [activeTab, setActiveTab] = useState<'label' | 'submissions'>('label');
  const toast = useToast();

  const TABS = [
    { key: 'label' as const, label: 'Gallery Label' },
    { key: 'submissions' as const, label: 'Submissions' },
  ];

  return (
    <PageWrapper title="Gallery Management">
      <div className="max-w-4xl mx-auto">
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'label' ? (
          <GalleryLabelTab toast={toast} />
        ) : (
          <SubmissionsTab toast={toast} />
        )}
      </div>

      <Toast message={toast.message} />
    </PageWrapper>
  );
}
