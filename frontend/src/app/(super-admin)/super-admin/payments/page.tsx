'use client';

import { DataTable } from '@/components/super-admin/DataTable';

export default function PaymentsPage() {
  const columns = [
    { key: 'id', header: 'Payment ID' },
    { key: 'student_name', header: 'Student' },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: any) => `$${row.amount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
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
    { key: 'created_at', header: 'Date' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments & Revenue</h1>
        <p className="text-gray-600">Manage all payments across branches</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">$0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Pending Payments</p>
          <p className="text-2xl font-bold text-gray-900">$0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Defaulters</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
      </div>

      <DataTable columns={columns} data={[]} />
    </div>
  );
}
