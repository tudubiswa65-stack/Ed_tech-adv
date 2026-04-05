'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { AdminListSkeleton } from '@/components/admin/AdminPageSkeletons';
import PageWrapper from '@/components/layout/PageWrapper';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminNotifications, adminQueryKeys, ADMIN_NOTIF_VIEWED_AT_KEY } from '@/hooks/queries/useAdminQueries';
import { queryClient } from '@/lib/queryClient';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target_audience: 'all' | 'students' | 'admins';
  action_url?: string;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ type: '', targetAudience: '' });
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all',
    actionUrl: '',
    scheduledAt: ''
  });

  const { hasPermission } = usePermissions();

  // Clear notification badge when this page is opened
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_NOTIF_VIEWED_AT_KEY, new Date().toISOString());
      queryClient.setQueryData([...adminQueryKeys.all, 'notifications-count'], 0);
    }
  }, []);

  // React Query hook — notifications list cached 60 s, auto-refetch on page/filter change
  const { data, isLoading: loading } = useAdminNotifications(page, filters);
  const notifications = data?.notifications ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        targetAudience: formData.targetAudience,
        actionUrl: formData.actionUrl || undefined,
        scheduledAt: formData.scheduledAt || undefined
      };
      await apiClient.post('/admin/notifications', payload);

      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'notifications'] });
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Failed to create notification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
      await apiClient.delete(`/admin/notifications/${id}`);
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'notifications'] });
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    }
  };

  const handleBroadcast = async (id: string) => {
    if (!confirm('Send this notification to all targeted users?')) return;
    try {
      await apiClient.post(`/admin/notifications/${id}/broadcast`);
      alert('Notification broadcasted successfully');
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'notifications'] });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      alert('Failed to broadcast notification');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      targetAudience: 'all',
      actionUrl: '',
      scheduledAt: ''
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'error': return 'danger';
      default: return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PageWrapper title="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Notifications</h1>
            <p className="text-gray-500 dark:text-slate-400">Manage and send notifications to students</p>
          </div>
          {hasPermission('broadcast_message') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              + Create Notification
            </Button>
          )}
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
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
              <AdminListSkeleton count={5} />
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                No notifications found. Click &quot;Create Notification&quot; to add one.
              </div>
            ) : (
              notifications.map((notification: Notification) => (
                <div key={notification.id} className="p-4 hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getTypeColor(notification.type)}>{notification.type}</Badge>
                        <Badge variant="info">{notification.target_audience}</Badge>
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
                      {!notification.sent_at && hasPermission('broadcast_message') && (
                        <Button size="sm" variant="outline" onClick={() => handleBroadcast(notification.id)}>
                          Send
                        </Button>
                      )}
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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Target Audience</label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData(f => ({ ...f, targetAudience: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
              >
                <option value="all">All Users</option>
                <option value="students">Students Only</option>
                <option value="admins">Admins Only</option>
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