'use client';

import { DataTable } from '@/components/super-admin/DataTable';

export default function ComplaintsPage() {
  const columns = [
    { key: 'subject', header: 'Subject' },
    {
      key: 'student_name',
      header: 'Student',
      render: (row: any) => row.students?.name || 'N/A',
    },
    {
      key: 'branch_name',
      header: 'Branch',
      render: (row: any) => row.branches?.name || 'N/A',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: any) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.priority === 'high'
              ? 'text-red-700 bg-red-100'
              : row.priority === 'medium'
              ? 'text-yellow-700 bg-yellow-100'
              : 'text-gray-700 bg-gray-100'
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.status === 'open'
              ? 'text-red-700 bg-red-100'
              : row.status === 'in_progress'
              ? 'text-yellow-700 bg-yellow-100'
              : 'text-green-700 bg-green-100'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    { key: 'created_at', header: 'Created' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Complaint Management</h1>
        <p className="text-gray-600">View and resolve complaints from all branches</p>
      </div>

      <DataTable columns={columns} data={[]} />
    </div>
  );
}
