'use client';

import Link from 'next/link';
import { useSuperAdminDashboard } from '@/hooks/queries/useSuperAdminQueries';
import { DashboardSkeleton } from '@/components/super-admin/SuperAdminPageSkeletons';


// ─── Section label ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
      letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)',
      marginBottom: 12, marginTop: 0,
    }}>
      {children}
    </p>
  );
}

// ─── Stat cell ───────────────────────────────────────────────────────────────
function StatCell({
  icon, badgeBg, iconColor, value, valueColor, label,
}: {
  icon: React.ReactNode;
  badgeBg: string;
  iconColor: string;
  value: string | number;
  valueColor: string;
  label: string;
}) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 12, padding: '14px 12px',
      border: '0.5px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, background: badgeBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8, color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: valueColor, lineHeight: 1.1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{label}</div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_MONTHS  = 5;
const MAX_BAR_HEIGHT = 60;
const DONUT_RADIUS   = 35;

// ─── Mini bar chart ───────────────────────────────────────────────────────────
interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

function MiniBarChart({
  data, valueKey, max, activeColor, inactiveColor, activeLabelColor, inactiveLabelColor,
  currentIndex,
}: {
  data: ChartDataPoint[];
  valueKey: string;
  max: number;
  activeColor: string;
  inactiveColor: string;
  activeLabelColor: string;
  inactiveLabelColor: string;
  /** Index of the "current" bar to highlight. Defaults to the last bar. */
  currentIndex?: number;
}) {
  const emptyFallback = Array.from({ length: CHART_MONTHS }, (_, i) => {
    const year = new Date().getFullYear();
    const d = new Date(year, i, 1);
    return { month: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), [valueKey]: 0 };
  });
  const display = data.length > 0 ? data : emptyFallback;
  const activeIdx = currentIndex !== undefined ? currentIndex : display.length - 1;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: MAX_BAR_HEIGHT + 20 }}>
      {display.map((item, idx) => {
        const isActive = idx === activeIdx;
        const isUpcoming = idx > activeIdx;
        const val = Number(item[valueKey]);
        const barH = isUpcoming
          ? 0
          : Math.max(isActive ? 8 : 4, max > 0 ? Math.round((val / max) * MAX_BAR_HEIGHT) : 0);
        const label = String(item.month ?? '').slice(0, 3);
        return (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
              <div style={{
                width: '100%', height: barH, borderRadius: '4px 4px 0 0',
                background: isUpcoming ? 'transparent' : isActive ? activeColor : inactiveColor,
                transition: 'height 0.4s',
              }} />
            </div>
            <span style={{
              fontSize: 9,
              color: isUpcoming
                ? 'rgba(255,255,255,0.12)'
                : isActive ? activeLabelColor : inactiveLabelColor,
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Attendance row ───────────────────────────────────────────────────────────
function AttendanceRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ─── Quick action tile ─────────────────────────────────────────────────────────
function QuickAction({
  href, label, badgeBg, labelColor, icon,
}: {
  href: string;
  label: string;
  badgeBg: string;
  labelColor: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} style={{
      background: '#1e293b', borderRadius: 12, padding: 14,
      display: 'flex', alignItems: 'center', gap: 10,
      border: '0.5px solid rgba(255,255,255,0.06)',
      textDecoration: 'none',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: badgeBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: labelColor, flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: labelColor }}>{label}</span>
    </Link>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const BranchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const StudentsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const RevenueIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const CoursesIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const ActiveCoursesIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const TestsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);
const BellIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

// ─── Branch rank accent helpers ───────────────────────────────────────────────
function branchAccent(rank: number) {
  if (rank === 0) return { color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' };
  if (rank === 1) return { color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
  return { color: '#818cf8', bg: 'rgba(99,102,241,0.15)' };
}

// ─── Revenue formatter ────────────────────────────────────────────────────────
function fmtRevenue(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${Math.round(val / 1_000)}k`;
  return `$${val}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const {
    stats,
    studentGrowth,
    revenue,
    attendance,
    topBranches,
    isLoading: loading,
    isError: statsError,
  } = useSuperAdminDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (statsError) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#f87171', fontSize: 14 }}>Failed to load dashboard data</span>
      </div>
    );
  }

  // Render stat values with safe fallbacks while secondary queries load
  const safeStats = stats ?? {
    totalBranches: 0,
    totalStudents: 0,
    totalRevenue: 0,
    activeCourses: 0,
    totalCourses: 0,
    totalTests: 0,
  };

  // ── Attendance percentages ───────────────────────────────────────────────────
  const attMap: Record<string, number> = {};
  attendance.forEach(item => {
    const k = String(item.label ?? '').toLowerCase();
    attMap[k] = Number(item.value ?? 0);
  });
  const attTotal = Math.max(Object.values(attMap).reduce((a, b) => a + b, 0), 1);
  const presentPct = Math.round(((attMap['present'] ?? 0) / attTotal) * 100);
  const absentPct  = Math.round(((attMap['absent']  ?? 0) / attTotal) * 100);
  const latePct    = Math.round(((attMap['late']    ?? 0) / attTotal) * 100);

  // ── SVG donut math (r=DONUT_RADIUS) ─────────────────────────────────────────
  const C = 2 * Math.PI * DONUT_RADIUS;
  const presentDash       = (presentPct / 100) * C;
  const remainingDash     = ((100 - presentPct) / 100) * C;   // amber covers absent + late

  // ── Chart data (fixed Jan–Dec of current year from backend) ─────────────────
  const getCalendarYearLabels = () => {
    const year = new Date().getFullYear();
    return Array.from({ length: CHART_MONTHS }, (_, i) => {
      const d = new Date(year, i, 1);
      return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    });
  };
  const emptyMonths = getCalendarYearLabels();
  const growthSlice  = studentGrowth.length > 0 ? studentGrowth : emptyMonths.map(month => ({ month, count: 0 }));
  const revenueSlice = revenue.length > 0 ? revenue : emptyMonths.map(month => ({ month, revenue: 0 }));
  const growthMax    = Math.max(...growthSlice.map(d => d.count   ?? 0), 1);
  const revenueMax   = Math.max(...revenueSlice.map(d => d.revenue ?? 0), 1);
  const growthTotal  = growthSlice.reduce((a, d) => a + (d.count ?? 0), 0);

  // ── Top branches ─────────────────────────────────────────────────────────────
  const branches   = topBranches.slice(0, 5);
  const maxStudents = Math.max(branches[0]?.active_students ?? 1, 1);

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingBottom: 24 }}>

      {/* ── Page content ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px' }} className="lg:px-0">

        {/* Page title block */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 17, fontWeight: 500, color: '#fff', margin: 0, marginBottom: 4 }}>
            Super Admin Dashboard
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Overview of all branches, students, and revenue
          </p>
        </div>

        {/* ── Stats grid ──────────────────────────────────────────────────────────── */}
        <SectionLabel>Overview</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          <StatCell icon={<BranchIcon />}       badgeBg="rgba(59,130,246,0.15)"  iconColor="#60a5fa" value={safeStats.totalBranches}  valueColor="#fff"     label="Branches" />
          <StatCell icon={<StudentsIcon />}      badgeBg="rgba(52,211,153,0.12)"  iconColor="#34d399" value={safeStats.totalStudents}  valueColor="#34d399"  label="Students" />
          <StatCell icon={<RevenueIcon />}       badgeBg="rgba(251,191,36,0.12)"  iconColor="#fbbf24" value={fmtRevenue(safeStats.totalRevenue)} valueColor="#fbbf24" label="Revenue" />
          <StatCell icon={<CoursesIcon />}       badgeBg="rgba(99,102,241,0.15)"  iconColor="#818cf8" value={safeStats.totalCourses}   valueColor="#818cf8"  label="Courses" />
          <StatCell icon={<ActiveCoursesIcon />} badgeBg="rgba(251,146,60,0.12)"  iconColor="#fb923c" value={safeStats.activeCourses}  valueColor="#fb923c"  label="Active" />
          <StatCell icon={<TestsIcon />}         badgeBg="rgba(244,114,182,0.12)" iconColor="#f472b6" value={safeStats.totalTests}     valueColor="#f472b6"  label="Tests" />
        </div>

        {/* ── Student Growth chart ─────────────────────────────────────────────────── */}
        <SectionLabel>Student Growth</SectionLabel>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 12px', border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>New enrolments · last 5 months</span>
            <span style={{
              fontSize: 11, background: 'rgba(52,211,153,0.12)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '2px 8px',
            }}>
              +{growthTotal} total
            </span>
          </div>
          <MiniBarChart
            data={growthSlice}
            valueKey="count"
            max={growthMax}
            activeColor="#3b82f6"
            inactiveColor="rgba(59,130,246,0.12)"
            activeLabelColor="#60a5fa"
            inactiveLabelColor="rgba(255,255,255,0.2)"
          />
        </div>

        {/* ── Revenue Analytics chart ──────────────────────────────────────────────── */}
        <SectionLabel>Revenue Analytics</SectionLabel>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 12px', border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Monthly payments · 3 past + current + upcoming</span>
            <span style={{
              fontSize: 11, background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.2)', borderRadius: 20, padding: '2px 8px',
            }}>
              {fmtRevenue(safeStats.totalRevenue)}
            </span>
          </div>
          <MiniBarChart
            data={revenueSlice}
            valueKey="revenue"
            max={revenueMax}
            activeColor="#6366f1"
            inactiveColor="rgba(99,102,241,0.28)"
            activeLabelColor="#818cf8"
            inactiveLabelColor="rgba(255,255,255,0.2)"
            currentIndex={3}
          />
        </div>

        {/* ── Attendance Overview ──────────────────────────────────────────────────── */}
        <SectionLabel>Attendance Overview</SectionLabel>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 12px', border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
            {/* Left: rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AttendanceRow label="Present" pct={presentPct} color="#34d399" />
              <AttendanceRow label="Absent"  pct={absentPct}  color="#fbbf24" />
              <AttendanceRow label="Late"    pct={latePct}    color="#f87171" />
            </div>
            {/* Right: SVG donut (r=35, stroke-width=10, cx/cy=45) */}
            <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden="true">
              {/* Track */}
              <circle cx="45" cy="45" r={DONUT_RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              {/* Present — green */}
              <circle
                cx="45" cy="45" r={DONUT_RADIUS} fill="none"
                stroke="#34d399" strokeWidth="10"
                strokeDasharray={`${presentDash} ${C}`}
                strokeDashoffset={0}
                transform="rotate(-90 45 45)"
                strokeLinecap="butt"
              />
              {/* Remaining (absent + late) — amber */}
              <circle
                cx="45" cy="45" r={DONUT_RADIUS} fill="none"
                stroke="#fbbf24" strokeWidth="10"
                strokeDasharray={`${remainingDash} ${C}`}
                strokeDashoffset={-presentDash}
                transform="rotate(-90 45 45)"
                strokeLinecap="butt"
              />
              <text x="45" y="42" textAnchor="middle" fill="#34d399" fontSize="16" fontWeight="500">{presentPct}%</text>
              <text x="45" y="54" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">present</text>
            </svg>
          </div>
        </div>

        {/* ── Top Performing Branches ──────────────────────────────────────────────── */}
        <SectionLabel>Top Performing Branches</SectionLabel>
        <div style={{ background: '#1e293b', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
          {branches.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              No branch data available
            </div>
          )}
          {branches.map((branch, idx) => {
            const accent = branchAccent(idx);
            const pct = Math.round((branch.active_students / maxStudents) * 100);
            return (
              <div key={branch.id} style={{ borderBottom: idx < branches.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: accent.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: accent.color, flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{branch.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{branch.location}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 500, color: accent.color }}>{branch.active_students}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>students</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: accent.color, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────────────── */}
        <SectionLabel>Quick Actions</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <QuickAction href="/super-admin/branches"      label="Add Branch"        badgeBg="rgba(59,130,246,0.15)"  labelColor="#60a5fa" icon={<PlusIcon />} />
          <QuickAction href="/super-admin/students"      label="Add Student"       badgeBg="rgba(52,211,153,0.12)"  labelColor="#34d399" icon={<PlusIcon />} />
          <QuickAction href="/super-admin/courses"       label="Add Course"        badgeBg="rgba(251,146,60,0.12)"  labelColor="#fb923c" icon={<PlusIcon />} />
          <QuickAction href="/super-admin/notifications" label="Send Notification" badgeBg="rgba(167,139,250,0.12)" labelColor="#a78bfa" icon={<BellIcon />} />
        </div>

      </div>
    </div>
  );
}
