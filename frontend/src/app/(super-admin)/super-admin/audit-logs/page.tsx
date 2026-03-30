'use client';

import { DataTable } from '@/components/super-admin/DataTable';

export default function AuditLogsPage() {
  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <span className="font-medium">{row.action}</span>
      ),
    },
    {
      key: 'entity_type',
      header: 'Entity',
      render: (row: any) => (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
          {row.entity_type}
        </span>
      ),
    },
    {
      key: 'admin_name',
      header: 'Admin',
      render: (row: any) => row.admins?.name || 'System',
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: (row: any) => row.ip_address || 'N/A',
    },
    { key: 'created_at', header: 'Timestamp' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Track all administrative actions across the platform</p>
        </div>
        <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
          Export Logs
        </button>
      </div>

      <DataTable columns={columns} data={[]} />
    </div>
  );
}
