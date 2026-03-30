'use client';

import { DataTable } from '@/components/super-admin/DataTable';

export default function StudentsPage() {
  const columns = [
    { key: 'name', header: 'Student Name' },
    { key: 'email', header: 'Email' },
    { key: 'roll_number', header: 'Roll Number' },
    {
      key: 'branch_name',
      header: 'Branch',
      render: (row: any) => row.branches?.name || 'N/A',
    },
    {
      key: 'course_name',
      header: 'Course',
      render: (row: any) => row.courses?.name || 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600">Manage students across all branches</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Add New Student
        </button>
      </div>

      <DataTable columns={columns} data={[]} />
    </div>
  );
}
