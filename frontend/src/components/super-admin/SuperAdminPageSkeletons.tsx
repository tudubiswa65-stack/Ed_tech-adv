'use client';

// ─── Reusable pulse block ─────────────────────────────────────────────────────
function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} style={style} />;
}

// ─── Dark-themed pulse (for pages using the dark #0f172a / #1e293b palette) ───
function DarkPulse({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse"
      style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, ...style }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DASHBOARD SKELETON  (dark-themed, mirrors the main super-admin dashboard)
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingBottom: 24 }}>
      {/* Mobile header bar */}
      <div className="lg:hidden" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <DarkPulse style={{ width: 80, height: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <DarkPulse style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <DarkPulse style={{ width: 90, height: 28, borderRadius: 20 }} />
        </div>
      </div>

      <div style={{ padding: '0 16px' }} className="lg:pt-4 lg:px-0">
        {/* Divider */}
        <div className="lg:hidden" style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />

        {/* Page title */}
        <div style={{ marginBottom: 20 }}>
          <DarkPulse style={{ width: 220, height: 17, marginBottom: 8 }} />
          <DarkPulse style={{ width: 280, height: 12 }} />
        </div>

        {/* Overview section label */}
        <DarkPulse style={{ width: 70, height: 11, marginBottom: 12 }} />

        {/* Stats grid – 3 columns × 2 rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ background: '#1e293b', borderRadius: 12, padding: '14px 12px', border: '0.5px solid rgba(255,255,255,0.06)' }}
            >
              <DarkPulse style={{ width: 28, height: 28, borderRadius: 7, marginBottom: 8 }} />
              <DarkPulse style={{ width: '60%', height: 22, marginBottom: 4 }} />
              <DarkPulse style={{ width: '50%', height: 10 }} />
            </div>
          ))}
        </div>

        {/* Student Growth section */}
        <DarkPulse style={{ width: 110, height: 11, marginBottom: 12 }} />
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 12px', border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <DarkPulse style={{ width: 160, height: 12 }} />
            <DarkPulse style={{ width: 60, height: 20, borderRadius: 20 }} />
          </div>
          {/* Bar chart placeholder */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
            {[40, 55, 30, 70, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div className="animate-pulse" style={{ width: '100%', height: h, background: 'rgba(59,130,246,0.15)', borderRadius: '4px 4px 0 0' }} />
                <DarkPulse style={{ width: '80%', height: 9 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Analytics section */}
        <DarkPulse style={{ width: 130, height: 11, marginBottom: 12 }} />
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 12px', border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <DarkPulse style={{ width: 200, height: 12 }} />
            <DarkPulse style={{ width: 60, height: 20, borderRadius: 20 }} />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
            {[50, 35, 65, 45, 30].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div className="animate-pulse" style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.2)', borderRadius: '4px 4px 0 0' }} />
                <DarkPulse style={{ width: '80%', height: 9 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Overview */}
        <DarkPulse style={{ width: 150, height: 11, marginBottom: 12 }} />
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 12px', border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Present', 'Absent', 'Late'].map((_, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <DarkPulse style={{ width: 60, height: 11 }} />
                    <DarkPulse style={{ width: 30, height: 11 }} />
                  </div>
                  <DarkPulse style={{ height: 5, borderRadius: 99 }} />
                </div>
              ))}
            </div>
            <div className="animate-pulse" style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          </div>
        </div>

        {/* Top Performing Branches */}
        <DarkPulse style={{ width: 165, height: 11, marginBottom: 12 }} />
        <div style={{ background: '#1e293b', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <DarkPulse style={{ width: 32, height: 32, borderRadius: 8 }} />
                  <div>
                    <DarkPulse style={{ width: 100, height: 13, marginBottom: 6 }} />
                    <DarkPulse style={{ width: 70, height: 11 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <DarkPulse style={{ width: 30, height: 18, marginBottom: 4 }} />
                  <DarkPulse style={{ width: 45, height: 10 }} />
                </div>
              </div>
              <DarkPulse style={{ height: 4, borderRadius: 0 }} />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <DarkPulse style={{ width: 100, height: 11, marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ background: '#1e293b', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10, border: '0.5px solid rgba(255,255,255,0.06)' }}
            >
              <DarkPulse style={{ width: 32, height: 32, borderRadius: 8 }} />
              <DarkPulse style={{ flex: 1, height: 12 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATS TABLE SKELETON  (stat cards + filters + data table)
//    Used for: students, complaints, audit-logs, payments, feedback
// ─────────────────────────────────────────────────────────────────────────────
export function StatsTableSkeleton({ statCount = 4, showButton = true }: { statCount?: number; showButton?: boolean }) {
  const gridCols =
    statCount === 3
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-7 w-48" />
          <Pulse className="h-4 w-64" />
        </div>
        {showButton && <Pulse className="h-9 w-32 rounded-lg" />}
      </div>

      {/* Stat cards */}
      <div className={gridCols}>
        {[...Array(statCount)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-9 w-9 rounded-lg" />
            </div>
            <Pulse className="h-8 w-20 mb-1" />
            <Pulse className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Pulse className="h-9 w-32 rounded-lg" />
        <Pulse className="h-9 w-32 rounded-lg" />
        <Pulse className="h-9 flex-1 min-w-48 rounded-lg" />
      </div>

      {/* Table */}
      <TableBodySkeleton />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TABLE-ONLY SKELETON  (header + search/filter bar + data table)
//    Used for: branches, courses
// ─────────────────────────────────────────────────────────────────────────────
export function TableOnlySkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-7 w-52" />
          <Pulse className="h-4 w-72" />
        </div>
        <Pulse className="h-9 w-36 rounded-lg" />
      </div>

      {/* Search input */}
      <div className="flex gap-4 flex-wrap">
        <Pulse className="h-9 flex-1 min-w-64 rounded-lg" />
        <Pulse className="h-9 w-32 rounded-lg" />
      </div>

      {/* Table */}
      <TableBodySkeleton />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. NOTIFICATIONS LIST SKELETON  (inline, used inside the Card's divide-y area)
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationsListSkeleton() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-slate-700">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Pulse className="h-5 w-14 rounded-full" />
                <Pulse className="h-5 w-12 rounded-full" />
              </div>
              <Pulse className="h-4 w-3/4" />
              <Pulse className="h-3 w-full" />
              <Pulse className="h-3 w-2/3" />
              <div className="flex items-center gap-3 pt-1">
                <Pulse className="h-3 w-24" />
                <Pulse className="h-3 w-20" />
              </div>
            </div>
            <Pulse className="h-7 w-16 rounded-lg ml-4 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STUDENT DETAIL SKELETON
// ─────────────────────────────────────────────────────────────────────────────
export function StudentDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pulse className="h-9 w-9 rounded-lg" />
          <Pulse className="h-7 w-40" />
          <Pulse className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Pulse className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="flex items-center gap-6 mb-6">
          <Pulse className="h-20 w-20 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Pulse className="h-6 w-48" />
            <Pulse className="h-4 w-56" />
            <Pulse className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Pulse className="h-3 w-20" />
              <Pulse className="h-5 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BRANCH DETAIL SKELETON  (full-page loading state)
// ─────────────────────────────────────────────────────────────────────────────
export function BranchDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back button + header */}
      <div className="flex items-center space-x-4">
        <Pulse className="h-9 w-9 rounded-lg flex-shrink-0" />
        <div className="flex-1 flex items-center gap-3">
          <Pulse className="h-7 w-48" />
          <Pulse className="h-6 w-16 rounded-full" />
        </div>
        <Pulse className="h-9 w-28 rounded-lg" />
      </div>

      {/* Info + stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Branch info card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 space-y-3">
          <Pulse className="h-5 w-36" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Pulse className="h-4 w-4 rounded flex-shrink-0" />
                <Pulse className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        {/* Stat cards */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700">
            <Pulse className="h-4 w-24 mb-3" />
            <Pulse className="h-8 w-16 mb-1" />
            <Pulse className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700">
        {[...Array(5)].map((_, i) => (
          <Pulse key={i} className={`h-9 rounded-t-lg ${i === 0 ? 'w-20' : 'w-28'}`} />
        ))}
      </div>

      {/* Tab content area */}
      <TableBodySkeleton rows={6} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PERMISSIONS PANEL SKELETON  (inline, inside BranchDetail tab)
// ─────────────────────────────────────────────────────────────────────────────
export function PermissionsPanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Admin info header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-5 w-36" />
          <Pulse className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Pulse className="h-8 w-24 rounded-lg" />
          <Pulse className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Permission groups */}
      {['Courses', 'Students', 'Communication', 'Finance', 'Reports'].map((group) => (
        <div key={group} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-100 dark:border-slate-700">
          <Pulse className="h-5 w-28 mb-4" />
          <div className="space-y-3">
            {[...Array(group === 'Communication' ? 3 : group === 'Courses' || group === 'Students' ? 3 : 2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Pulse className="h-4 w-32" />
                  <Pulse className="h-3 w-48" />
                </div>
                <Pulse className="h-6 w-11 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. RESULTS SKELETON  (test analytics page)
// ─────────────────────────────────────────────────────────────────────────────
export function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Pulse className="h-9 w-9 rounded-lg flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Pulse className="h-6 w-56" />
          <Pulse className="h-4 w-40" />
        </div>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-slate-700">
            <Pulse className="h-4 w-24 mb-3" />
            <Pulse className="h-8 w-20 mb-1" />
            <Pulse className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Score distribution chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-slate-700">
        <Pulse className="h-5 w-40 mb-4" />
        <div className="flex gap-2 items-end h-32">
          {[...Array(8)].map((_, i) => (
            <Pulse key={i} className="flex-1 rounded-t-md" style={{ height: `${20 + (i % 4) * 20}%` }} />
          ))}
        </div>
      </div>

      {/* Submissions table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <Pulse className="h-5 w-36" />
        </div>
        <TableBodySkeleton rows={6} showCard={false} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SETTINGS SKELETON  (dark-themed, mirrors the settings page)
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsSkeleton() {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingBottom: 24 }}>
      <div style={{ padding: '0 16px' }} className="lg:pt-4 lg:px-0">
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <DarkPulse style={{ width: 180, height: 17, marginBottom: 8 }} />
          <DarkPulse style={{ width: 250, height: 12 }} />
        </div>

        {/* Settings cards */}
        {[
          { label: 'Platform Settings', fields: 4 },
          { label: 'File Upload Settings', fields: 3 },
          { label: 'Feature Flags', fields: 4 },
        ].map(({ label, fields }) => (
          <div
            key={label}
            className="animate-pulse"
            style={{ background: '#1e293b', borderRadius: 12, padding: 16, border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 20 }}
          >
            <DarkPulse style={{ width: 130, height: 11, marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[...Array(fields)].map((_, i) => (
                <div key={i}>
                  <DarkPulse style={{ width: 120, height: 12, marginBottom: 8 }} />
                  <DarkPulse style={{ height: 38 }} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Save button */}
        <DarkPulse style={{ height: 40, width: 120, borderRadius: 8 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. TESTS TABLE SKELETON  (inline, replaces spinner in the tests card area)
// ─────────────────────────────────────────────────────────────────────────────
export function TestsTableSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b dark:bg-slate-900 dark:border-slate-700">
            <tr>
              {['Title', 'Course', 'Type', 'Time', 'Questions', 'Submissions', 'Actions'].map((col) => (
                <th key={col} className="py-3 px-4 text-left">
                  <Pulse className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700">
                <td className="py-3 px-4">
                  <Pulse className="h-4 w-36 mb-1" />
                  <Pulse className="h-3 w-24" />
                </td>
                <td className="py-3 px-4"><Pulse className="h-4 w-28" /></td>
                <td className="py-3 px-4"><Pulse className="h-5 w-16 rounded-full" /></td>
                <td className="py-3 px-4"><Pulse className="h-4 w-16" /></td>
                <td className="py-3 px-4"><Pulse className="h-4 w-10" /></td>
                <td className="py-3 px-4"><Pulse className="h-4 w-10" /></td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <Pulse className="h-7 w-14 rounded" />
                    <Pulse className="h-7 w-14 rounded" />
                    <Pulse className="h-7 w-14 rounded" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: reusable data-table body skeleton
// ─────────────────────────────────────────────────────────────────────────────
function TableBodySkeleton({ rows = 8, showCard = true }: { rows?: number; showCard?: boolean }) {
  const inner = (
    <div className="animate-pulse">
      {/* Table header row */}
      <div className="flex gap-4 p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        {[...Array(5)].map((_, i) => (
          <Pulse key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-gray-50 dark:border-slate-700/50 items-center">
          <div className="flex-1 space-y-1">
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-3 w-1/2" />
          </div>
          <Pulse className="h-4 flex-1" />
          <Pulse className="h-4 flex-1" />
          <Pulse className="h-5 w-16 rounded-full" />
          <div className="flex gap-2">
            <Pulse className="h-7 w-7 rounded" />
            <Pulse className="h-7 w-7 rounded" />
            <Pulse className="h-7 w-7 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!showCard) return inner;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {inner}
    </div>
  );
}
