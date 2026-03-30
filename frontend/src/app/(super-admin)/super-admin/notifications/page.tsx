'use client';

import { DataTable } from '@/components/super-admin/DataTable';

export default function NotificationsPage() {
  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'message', header: 'Message' },
    {
      key: 'target',
      header: 'Target',
      render: (row: any) => (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          {row.target}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: any) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.priority === 'urgent'
              ? 'text-red-700 bg-red-100'
              : row.priority === 'high'
              ? 'text-orange-700 bg-orange-100'
              : 'text-gray-700 bg-gray-100'
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    { key: 'created_at', header: 'Created' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Management</h1>
          <p className="text-gray-600">Create and manage platform-wide notifications</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Create Notification
        </button>
      </div>

      <DataTable columns={columns} data={[]} />
    </div>
  );
}
