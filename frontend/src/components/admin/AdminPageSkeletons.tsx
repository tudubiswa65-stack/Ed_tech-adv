'use client';

// ─── Reusable pulse helpers ──────────────────────────────────────────────────

/** Light-theme animated pulse block (works in both light and dark Tailwind modes) */
function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`}
    />
  );
}

/** Dark-theme animated pulse block (for pages using the #0f172a / #1e293b palette) */
function DarkPulse({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse"
      style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, ...style }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SKELETON  (mirrors AdminDashboard mobile + desktop layouts)
// ─────────────────────────────────────────────────────────────────────────────

function AdminDashboardMobileSkeleton() {
  return (
    <div
      className="lg:hidden flex flex-col"
      style={{ background: '#0f172a', minHeight: '100%', paddingBottom: 80 }}
    >
      {/* Header bar */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <DarkPulse style={{ width: 80, height: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <DarkPulse style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <DarkPulse style={{ width: 80, height: 28, borderRadius: 20 }} />
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {/* Greeting banner */}
        <div
          style={{
            background: '#1e3a5f',
            borderRadius: 14,
            border: '0.5px solid rgba(59,130,246,0.25)',
            padding: 18,
            marginBottom: 20,
          }}
        >
          <DarkPulse style={{ width: 80, height: 11, marginBottom: 8 }} />
          <DarkPulse style={{ width: 140, height: 20, marginBottom: 8 }} />
          <DarkPulse style={{ width: 200, height: 11, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <DarkPulse style={{ width: 90, height: 22, borderRadius: 20 }} />
            <DarkPulse style={{ width: 110, height: 22, borderRadius: 20 }} />
          </div>
        </div>

        {/* Section label */}
        <DarkPulse style={{ width: 60, height: 10, marginBottom: 12 }} />

        {/* 2×2 stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                background: '#1e293b',
                borderRadius: 12,
                padding: 16,
                border: '0.5px solid rgba(255,255,255,0.06)',
              }}
            >
              <DarkPulse style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 10 }} />
              <DarkPulse style={{ width: '60%', height: 24, marginBottom: 6 }} />
              <DarkPulse style={{ width: '50%', height: 10 }} />
            </div>
          ))}
        </div>

        {/* Quick actions label */}
        <DarkPulse style={{ width: 90, height: 10, marginBottom: 12 }} />

        {/* 3-column quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                background: '#1e293b',
                borderRadius: 12,
                padding: '14px 10px',
                border: '0.5px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <DarkPulse style={{ width: 32, height: 32, borderRadius: 8 }} />
              <DarkPulse style={{ width: 48, height: 10 }} />
            </div>
          ))}
        </div>

        {/* Recent activity label */}
        <DarkPulse style={{ width: 110, height: 10, marginBottom: 12 }} />

        {/* Activity list */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: 12,
            border: '0.5px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                borderBottom: i < 4 ? '0.5px solid rgba(255,255,255,0.06)' : undefined,
              }}
            >
              <DarkPulse style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <DarkPulse style={{ width: '70%', height: 13, marginBottom: 6 }} />
                <DarkPulse style={{ width: '40%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminDashboardDesktopSkeleton() {
  return (
    <div className="hidden lg:block p-4 md:p-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="animate-pulse rounded-xl p-5 mb-6 bg-gray-200 dark:bg-slate-700 h-28" />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700"
          >
            <div className="h-1 w-full bg-gray-200 dark:bg-slate-600" />
            <div className="p-5 flex items-center gap-4">
              <Pulse className="w-11 h-11 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Pulse className="h-3 w-3/4" />
                <Pulse className="h-7 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions card */}
        <div className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-100 p-6 dark:bg-slate-800 dark:border-slate-700 lg:col-span-1">
          <Pulse className="h-4 w-1/3 mb-2" />
          <Pulse className="h-3 w-1/2 mb-4" />
          <div className="grid grid-cols-2 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-700">
                <Pulse className="w-8 h-8 rounded-xl" />
                <Pulse className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity card */}
        <div className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-100 p-6 dark:bg-slate-800 dark:border-slate-700 lg:col-span-2">
          <Pulse className="h-4 w-1/4 mb-2" />
          <Pulse className="h-3 w-2/5 mb-4" />
          <div className="space-y-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 dark:border-slate-700">
                <Pulse className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Pulse className="h-3 w-3/4" />
                  <Pulse className="h-2.5 w-1/3" />
                </div>
                <Pulse className="h-5 w-12 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <>
      <AdminDashboardMobileSkeleton />
      <AdminDashboardDesktopSkeleton />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD GRID SKELETON  (courses, materials — 3-column grid of cards)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-100 p-5 dark:bg-slate-800 dark:border-slate-700"
        >
          {/* Thumbnail placeholder */}
          <Pulse className="h-36 w-full rounded-lg mb-4" />
          {/* Title */}
          <Pulse className="h-4 w-3/4 mb-2" />
          {/* Description */}
          <Pulse className="h-3 w-full mb-1" />
          <Pulse className="h-3 w-2/3 mb-4" />
          {/* Badges row */}
          <div className="flex gap-2 mb-4">
            <Pulse className="h-5 w-16 rounded-full" />
            <Pulse className="h-5 w-16 rounded-full" />
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <Pulse className="h-8 flex-1 rounded-lg" />
            <Pulse className="h-8 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST SKELETON  (notifications, complaints, feedback — list items inside a Card)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="animate-pulse divide-y divide-gray-100 dark:divide-slate-700">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-4">
          {/* Badge row */}
          <div className="flex items-center gap-2 mb-2">
            <Pulse className="h-5 w-16 rounded-full" />
            <Pulse className="h-5 w-20 rounded-full" />
          </div>
          {/* Title */}
          <Pulse className="h-4 w-1/2 mb-2" />
          {/* Body */}
          <Pulse className="h-3 w-full mb-1" />
          <Pulse className="h-3 w-3/4 mb-2" />
          {/* Meta row */}
          <div className="flex items-center gap-4">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE SKELETON  (tests, results — full-width table)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-700/50">
            {[...Array(cols)].map((_, c) => (
              <th key={c} className="px-4 py-3 text-left">
                <Pulse className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, r) => (
            <tr key={r} className="border-t border-gray-50 dark:border-slate-700">
              {[...Array(cols)].map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Pulse className={`h-4 ${c === 0 ? 'w-1/3' : c === cols - 1 ? 'w-16' : 'w-24'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM SKELETON  (profile, settings — label + input pairs)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminFormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="animate-pulse space-y-6 max-w-2xl">
      {/* Avatar / header area */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-700">
        <Pulse className="w-20 h-20 rounded-full shrink-0" />
        <div className="space-y-2">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-3 w-48" />
          <Pulse className="h-8 w-28 rounded-lg" />
        </div>
      </div>
      {/* Field rows */}
      {[...Array(fields)].map((_, i) => (
        <div key={i}>
          <Pulse className="h-3 w-1/4 mb-2" />
          <Pulse className="h-10 w-full rounded-lg" />
        </div>
      ))}
      {/* Submit button */}
      <Pulse className="h-10 w-32 rounded-lg" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY SKELETON  (gallery label form)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminGallerySkeleton() {
  return (
    <div className="animate-pulse space-y-4 max-w-lg">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <Pulse className="h-3 w-1/4 mb-2" />
          <Pulse className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Pulse className="h-9 w-28 rounded-lg" />
    </div>
  );
}

export function AdminGallerySubmissionsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 dark:bg-slate-800 dark:border-slate-700"
        >
          <Pulse className="w-16 h-16 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-1/3" />
            <Pulse className="h-3 w-1/2" />
            <Pulse className="h-3 w-1/4" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Pulse className="h-8 w-20 rounded-lg" />
            <Pulse className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
