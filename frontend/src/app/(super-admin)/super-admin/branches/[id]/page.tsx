'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { BarChart, LineChart } from '@/components/super-admin/charts';
import { DataTable } from '@/components/super-admin/DataTable';

interface BranchDetails {
  id: string;
  name: string;
  location: string;
  contact_number: string;
  is_active: boolean;
  created_at: string;
  stats: {
    studentCount: number;
    courseCount: number;
    totalRevenue: number;
    recentActivities: any[];
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  student_name: string;
  amount: number;
  status: string;
  created_at: string;
}

// ─── Permission types ────────────────────────────────────────────────────────

type PermissionKey =
  | 'add_course' | 'edit_course' | 'delete_course'
  | 'add_student' | 'edit_student' | 'delete_student'
  | 'broadcast_message' | 'send_direct_message' | 'manage_notice_board'
  | 'manage_fees' | 'issue_receipts'
  | 'view_reports' | 'export_data';

interface PermissionGroup {
  label: string;
  permissions: PermissionKey[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  { label: 'Courses', permissions: ['add_course', 'edit_course', 'delete_course'] },
  { label: 'Students', permissions: ['add_student', 'edit_student', 'delete_student'] },
  {
    label: 'Communication',
    permissions: ['broadcast_message', 'send_direct_message', 'manage_notice_board'],
  },
  { label: 'Finance', permissions: ['manage_fees', 'issue_receipts'] },
  { label: 'Reports', permissions: ['view_reports', 'export_data'] },
];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  add_course: 'Add Course',
  edit_course: 'Edit Course',
  delete_course: 'Delete Course',
  add_student: 'Add Student',
  edit_student: 'Edit Student',
  delete_student: 'Delete Student',
  broadcast_message: 'Broadcast Message',
  send_direct_message: 'Send Direct Message',
  manage_notice_board: 'Manage Notice Board',
  manage_fees: 'Manage Fees',
  issue_receipts: 'Issue Receipts',
  view_reports: 'View Reports',
  export_data: 'Export Data',
};

interface BranchAdminPermissionsData {
  user_id: string;
  user_name: string;
  user_email: string;
  permissions: Record<PermissionKey, boolean>;
  updated_at: string | null;
  updated_by_name: string | null;
}

// ─── Permission Panel Component ───────────────────────────────────────────────

function PermissionsPanel({ branchId }: { branchId: string }) {
  const [data, setData] = useState<BranchAdminPermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // key being saved
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/super-admin/branches/${branchId}/admin-permissions`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggle = async (key: PermissionKey, newValue: boolean) => {
    if (!data) return;
    setSaving(key);
    try {
      const updatedPermissions = { ...data.permissions, [key]: newValue };
      const res = await apiClient.put(`/super-admin/branches/${branchId}/admin-permissions`, {
        permissions: updatedPermissions,
      });
      if (res.data?.success) {
        setData((prev) => prev ? { ...prev, ...res.data.data } : prev);
        showSuccess(`Permission "${PERMISSION_LABELS[key]}" ${newValue ? 'enabled' : 'disabled'}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const handleEnableAll = async () => {
    setBulkSaving(true);
    try {
      const res = await apiClient.post(`/super-admin/branches/${branchId}/admin-permissions/enable-all`);
      if (res.data?.success) {
        setData((prev) => prev ? { ...prev, ...res.data.data } : prev);
        showSuccess('All permissions enabled');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to enable all permissions');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDisableAll = async () => {
    setBulkSaving(true);
    try {
      const res = await apiClient.post(`/super-admin/branches/${branchId}/admin-permissions/disable-all`);
      if (res.data?.success) {
        setData((prev) => prev ? { ...prev, ...res.data.data } : prev);
        showSuccess('All permissions disabled');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable all permissions');
    } finally {
      setBulkSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchPermissions}
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Branch Admin Permissions</h3>
            {data && (
              <p className="text-sm text-gray-500 mt-1">
                Managing permissions for{' '}
                <span className="font-medium text-gray-700">{data.user_name}</span>
                {' '}({data.user_email})
              </p>
            )}
            {data?.updated_at && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {new Date(data.updated_at).toLocaleString()}
                {data.updated_by_name && ` by ${data.updated_by_name}`}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleEnableAll}
              disabled={bulkSaving}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {bulkSaving ? 'Saving…' : 'Enable All'}
            </button>
            <button
              onClick={handleDisableAll}
              disabled={bulkSaving}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {bulkSaving ? 'Saving…' : 'Disable All'}
            </button>
          </div>
        </div>

        {/* Success / Error banners */}
        {successMsg && (
          <div className="mt-4 px-4 py-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
            ✓ {successMsg}
          </div>
        )}
        {error && (
          <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Permission Groups */}
      {data && PERMISSION_GROUPS.map((group) => (
        <div key={group.label} className="bg-white p-6 rounded-lg shadow-sm">
          <h4 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            {group.label}
          </h4>
          <div className="space-y-4">
            {group.permissions.map((key) => {
              const enabled = data.permissions[key] ?? false;
              const isSaving = saving === key;
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{PERMISSION_LABELS[key]}</p>
                    <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Toggle ${PERMISSION_LABELS[key]}`}
                    disabled={isSaving || bulkSaving}
                    onClick={() => handleToggle(key, !enabled)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                      ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}
                      ${(isSaving || bulkSaving) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
                        ${enabled ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                    {isSaving && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.id as string;

  const [branch, setBranch] = useState<BranchDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'payments' | 'activity' | 'permissions'>('overview');

  useEffect(() => {
    if (branchId) {
      fetchBranchData();
    }
  }, [branchId]);

  const fetchBranchData = async () => {
    setLoading(true);
    try {
      const [detailsResult, studentsResult, paymentsResult] = await Promise.allSettled([
        apiClient.get(`/super-admin/branches/${branchId}/details`),
        apiClient.get(`/super-admin/students?branch_id=${branchId}&limit=50`),
        apiClient.get(`/super-admin/payments/branch/${branchId}`),
      ]);

      if (detailsResult.status === 'fulfilled' && detailsResult.value.data.success) {
        setBranch(detailsResult.value.data.data);
      } else if (detailsResult.status === 'rejected') {
        const err = detailsResult.reason;
        setError(err.response?.data?.error || 'Failed to load branch details');
      }

      if (studentsResult.status === 'fulfilled' && studentsResult.value.data.success) {
        setStudents(studentsResult.value.data.data || []);
      } else if (studentsResult.status === 'rejected') {
        console.error('Failed to load branch students:', studentsResult.reason);
      }

      if (paymentsResult.status === 'fulfilled' && paymentsResult.value.data.success) {
        setPayments(paymentsResult.value.data.data || []);
      } else if (paymentsResult.status === 'rejected') {
        console.error('Failed to load branch payments:', paymentsResult.reason);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load branch details');
    } finally {
      setLoading(false);
    }
  };

  const studentColumns = [
    {
      key: 'name',
      header: 'Student',
      render: (row: Student) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'roll_number', header: 'Roll Number' },
    {
      key: 'status',
      header: 'Status',
      render: (row: Student) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.status === 'ACTIVE'
              ? 'text-green-700 bg-green-100'
              : row.status === 'SUSPENDED'
              ? 'text-red-700 bg-red-100'
              : 'text-gray-700 bg-gray-100'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row: Student) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  const paymentColumns = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (row: Payment) => (
        <span className="font-mono text-sm">{row.id.substring(0, 8)}...</span>
      ),
    },
    { key: 'student_name', header: 'Student' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Payment) => `$${(row.amount || 0).toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Payment) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.status === 'completed'
              ? 'text-green-700 bg-green-100'
              : row.status === 'pending'
              ? 'text-yellow-700 bg-yellow-100'
              : 'text-red-700 bg-red-100'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: Payment) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p className="text-gray-500">Loading branch details...</p>
        </div>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">{error || 'Branch not found'}</p>
        <button
          onClick={() => router.push('/super-admin/branches')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Branches
        </button>
      </div>
    );
  }

  type ActiveTab = 'overview' | 'students' | 'payments' | 'activity' | 'permissions';

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'students', label: `Students (${branch.stats.studentCount})` },
    { key: 'payments', label: 'Payments' },
    { key: 'activity', label: 'Recent Activity' },
    { key: 'permissions', label: 'Admin Permissions' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button + Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push('/super-admin/branches')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Back"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                branch.is_active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
              }`}
            >
              {branch.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            {branch.location} • {branch.contact_number}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{branch.stats.studentCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Active Courses</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{branch.stats.courseCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${(branch.stats?.totalRevenue ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <p className="text-sm text-gray-500">Member Since</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{new Date(branch.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Branch Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Branch Name</dt>
                <dd className="text-sm font-medium text-gray-900">{branch.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Location</dt>
                <dd className="text-sm font-medium text-gray-900">{branch.location || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Contact</dt>
                <dd className="text-sm font-medium text-gray-900">{branch.contact_number || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      branch.is_active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                    }`}
                  >
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(branch.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Payment Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-3">
              {(() => {
                const completed = payments.filter(p => p.status === 'completed');
                const pending = payments.filter(p => p.status === 'pending');
                const failed = payments.filter(p => p.status === 'failed' || p.status === 'overdue');
                return (
                  <>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700 font-medium">Completed</span>
                      <div className="text-right">
                        <p className="font-bold text-green-800">{completed.length} payments</p>
                        <p className="text-sm text-green-600">${completed.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm text-yellow-700 font-medium">Pending</span>
                      <div className="text-right">
                        <p className="font-bold text-yellow-800">{pending.length} payments</p>
                        <p className="text-sm text-yellow-600">${pending.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700 font-medium">Failed/Overdue</span>
                      <div className="text-right">
                        <p className="font-bold text-red-800">{failed.length} payments</p>
                        <p className="text-sm text-red-600">${failed.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Students in {branch.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{students.length} students found</p>
          </div>
          <DataTable columns={studentColumns} data={students} />
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <p className="text-sm text-gray-500 mt-1">All payments from {branch.name}</p>
          </div>
          <DataTable columns={paymentColumns} data={payments} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </div>
          <div className="p-6">
            {branch.stats.recentActivities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent activity found</p>
            ) : (
              <div className="space-y-4">
                {branch.stats.recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <PermissionsPanel branchId={branchId} />
      )}
    </div>
  );
}
