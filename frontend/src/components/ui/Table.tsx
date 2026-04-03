'use client';

import { ReactNode } from 'react';
import Spinner from './Spinner';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export default function Table<T extends { id?: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
}: TableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];
  const colCount = columns.length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div className="animate-pulse">
          <div className="h-11 bg-gray-50 border-b border-gray-100 dark:bg-slate-800 dark:border-slate-700" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-gray-50 flex items-center px-6 gap-4">
              {[...Array(Math.min(colCount, 4))].map((__, j) => (
                <div
                  key={j}
                  className="h-3 bg-gray-100 rounded dark:bg-slate-700"
                  style={{ width: `${[28, 36, 20, 16][j % 4]}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto dark:bg-slate-800 dark:border-slate-700">
      <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50 dark:bg-slate-800">
          {safeData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center">
                <svg className="mx-auto mb-3 w-10 h-10 text-gray-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-400 dark:text-slate-500">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            safeData.map((item, index) => (
              <tr
                key={(item as any).id || index}
                className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50/70' : 'hover:bg-gray-50/40'} transition-colors dark:bg-slate-800 dark:hover:bg-slate-700`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-slate-100">
                    {column.render
                      ? column.render(item)
                      : (item as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}