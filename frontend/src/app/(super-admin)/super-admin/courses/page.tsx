'use client';

import { DataTable } from '@/components/super-admin/DataTable';

export default function CoursesPage() {
  const columns = [
    { key: 'name', header: 'Course Name' },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'level',
      header: 'Level',
      render: (row: any) => (
        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
          {row.level}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (row: any) => `$${row.price.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.status === 'active'
              ? 'text-green-700 bg-green-100'
              : 'text-gray-700 bg-gray-100'
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
          <p className="text-gray-600">Manage courses across all branches</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Add New Course
        </button>
      </div>

      <DataTable columns={columns} data={[]} />
    </div>
  );
}
