'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageWrapper from '@/components/layout/PageWrapper';
import {
  useSuperAdminNotifications,
  useSuperAdminBranches,
  superAdminQueryKeys,
  SUPER_ADMIN_NOTIF_VIEWED_AT_KEY,
} from '@/hooks/queries/useSuperAdminQueries';
import { queryClient } from '@/lib/queryClient';
import { NotificationsListSkeleton } from '@/components/super-admin/SuperAdminPageSkeletons';

const defaultForm = {
  title: '',
  message: '',
  type: 'info',
  targetAudience: 'all',
  branch_id: '',
  priority: 'normal',
  actionUrl: '',
  scheduledAt: '',
};

export default function SuperAdminNotificationsPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ type: '', targetAudience: '' });
  const [formData, setFormData] = useState(defaultForm);

  // Clear notification badge when this page is opened
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUPER_ADMIN_NOTIF_VIEWED_AT_KEY, new Date().toISOString());
      queryClient.setQueryData([...superAdminQueryKeys.all, 'notifications-count'], 0);
    }
  }, []);

  const { data, isLoading: loading } = useSuperAdminNotifications(page, filters);
  const notifications = data?.notifications ?? [];
  const totalPages = data?.totalPages ?? 1;

  const { data: branches = [] } = useSuperAdminBranches();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        targetAudience: formData.targetAudience,
        priority: formData.priority,
        actionUrl: formData.actionUrl ? formData.actionUrl : undefined,
        scheduledAt: formData.scheduledAt ? formData.scheduledAt : undefined,
      };
      if (formData.branch_id) {
        payload.branch_id = formData.branch_id;
      }
      await apiClient.post('/super-admin/notifications', payload);

      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [...superAdminQueryKeys.all, 'notifications'] });
    } catch (err) {
      console.error('Error creating notification:', err);
      alert('Failed to create notification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
      await apiClient.delete(`/super-admin/notifications/${id}`);
      queryClient.invalidateQueries({ queryKey: [...superAdminQueryKeys.all, 'notifications'] });
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Failed to delete notification');
    }
  };

  const resetForm = () => setFormData(defaultForm);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'error': return 'danger';
      default: return 'info';
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <PageWrapper title="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Notifications</h1>
            <p className="text-gray-500 dark:text-slate-400">Manage and send notifications to all branches</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            + Create Notification
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
                >
                  <option value="">All Types</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Target Audience</label>
                <select
                  value={filters.targetAudience}
                  onChange={(e) => setFilters(f => ({ ...f, targetAudience: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
                >
                  <option value="">All Audiences</option>
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ type: '', targetAudience: '' })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications List */}
        <Card>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <NotificationsListSkeleton />
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                No notifications found. Click &quot;Create Notification&quot; to add one.
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="p-4 hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {notification.type && (
                          <Badge variant={getTypeColor(notification.type)}>{notification.type}</Badge>
                        )}
                        <Badge variant="info">{notification.target_audience ?? notification.target ?? 'all'}</Badge>
                        {notification.branches?.name && (
                          <Badge variant="info">{notification.branches.name}</Badge>
                        )}
                        {notification.priority && notification.priority !== 'normal' && (
                          <Badge variant={notification.priority === 'urgent' ? 'danger' : notification.priority === 'high' ? 'warning' : 'info'}>
                            {notification.priority}
                          </Badge>
                        )}
                        {notification.sent_at && (
                          <Badge variant="success">Sent</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">{notification.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 dark:text-slate-300">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2 dark:text-slate-500">
                        Created: {formatDate(notification.created_at)}
                        {notification.scheduled_at && ` • Scheduled: ${formatDate(notification.scheduled_at)}`}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => handleDelete(notification.id)} className="text-red-600">
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Create Notification">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(f => ({ ...f, message: e.target.value }))}
              rows={4}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(f => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Target Audience</label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData(f => ({ ...f, targetAudience: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
              >
                <option value="all">All Users</option>
                <option value="students">Students Only</option>
                <option value="admins">Admins Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Branch (Optional)</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData(f => ({ ...f, branch_id: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Action URL (Optional)"
            type="url"
            value={formData.actionUrl}
            onChange={(e) => setFormData(f => ({ ...f, actionUrl: e.target.value }))}
            placeholder="https://..."
          />

          <Input
            label="Schedule At (Optional)"
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) => setFormData(f => ({ ...f, scheduledAt: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
