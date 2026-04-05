'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Spinner, Badge } from '@/components/ui';
import { AdminDashboardSkeleton } from '@/components/admin/AdminPageSkeletons';
import { useAuth } from '@/hooks/useAuth';
import { AdminDashboardStats, useAggregatedDashboard } from '@/hooks/queries/useAdminQueries';

// ── Mobile design tokens ────────────────────────────────────────────────────
const TOKEN = {
  pageBg: '#0f172a',
  cardSurface: '#1e293b',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardRadius: 12,
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },
};

// ── Quick actions config ────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: 'Add Student',
    href: '/admin/students',
    badgeBg: 'rgba(59,130,246,0.15)',
    iconColor: '#60a5fa',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    label: 'New Test',
    href: '/admin/tests',
    badgeBg: 'rgba(251,191,36,0.12)',
    iconColor: '#fbbf24',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Results',
    href: '/admin/results',
    badgeBg: 'rgba(167,139,250,0.12)',
    iconColor: '#a78bfa',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Attendance',
    href: '/admin/attendance',
    badgeBg: 'rgba(52,211,153,0.12)',
    iconColor: '#34d399',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Payments',
    href: '/admin/payments',
    badgeBg: 'rgba(52,211,153,0.10)',
    iconColor: '#34d399',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Alerts',
    href: '/admin/notifications',
    badgeBg: 'rgba(248,113,113,0.10)',
    iconColor: '#f87171',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

// ── Desktop quick actions (declared before the color lookup that uses it) ───
const DESKTOP_QUICK_ACTIONS = [
  { label: 'Add Student', href: '/admin/students', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30' },
  { label: 'New Test', href: '/admin/tests', color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30' },
  { label: 'Results', href: '/admin/results', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/30' },
  { label: 'Attendance', href: '/admin/attendance', color: 'text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30' },
  { label: 'Payments', href: '/admin/payments', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30' },
  { label: 'Alerts', href: '/admin/notifications', color: 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/30' },
];

// ── Desktop action color lookup (built once at module scope) ────────────────
const DESKTOP_ACTION_COLOR_MAP = Object.fromEntries(
  DESKTOP_QUICK_ACTIONS.map((a) => [a.href, a.color]),
);

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Mobile header component ─────────────────────────────────────────────────
function MobileHeader({ initials, avatarUrl, onLogout }: { initials: string; avatarUrl?: string | null; onLogout: () => void }) {
  return (
    <div
      className="lg:hidden flex items-center justify-between px-4 pt-3 pb-2"
      style={{ background: TOKEN.pageBg }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
        Dashboard
      </span>
      <div className="flex items-center gap-2">
        {/* Avatar — links to profile for avatar upload */}
        <Link
          href="/admin/profile"
          aria-label="View profile"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: '#fff',
            fontWeight: 600,
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            textDecoration: 'none',
          }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              fill
              priority
              style={{ objectFit: 'cover' }}
              sizes="32px"
            />
          ) : (
            initials
          )}
        </Link>
        {/* Notification bell */}
        <Link
          href="/admin/notifications"
          aria-label="Notifications"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </Link>
        {/* Logout icon */}
        <button
          onClick={onLogout}
          aria-label="Logout"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="rgba(248,113,113,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data, isLoading: loading } = useAggregatedDashboard();
  const stats = data?.stats;

  const firstName = user?.name?.split(' ')[0] ?? 'Admin';
  const initials = (user?.name ?? 'A')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const totalStudents = stats?.totalStudents ?? 0;
  const activeStudents = stats?.activeStudents ?? 0;
  const testsThisWeek = stats?.testsThisWeek ?? 0;
  const avgScore = stats?.avgScore ?? 0;

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  // ── Mobile layout ────────────────────────────────────────────────────────
  const MobileView = (
    <div
      className="lg:hidden flex flex-col"
      style={{ background: TOKEN.pageBg, minHeight: '100%', paddingBottom: 80 }}
    >
      <MobileHeader initials={initials} avatarUrl={user?.avatar_url} onLogout={handleLogout} />

      <div style={{ padding: '12px 16px 0' }}>

        {/* ── Greeting banner ─────────────────────────────────────────────── */}
        <div
          style={{
            background: '#1e3a5f',
            borderRadius: 14,
            border: '0.5px solid rgba(59,130,246,0.25)',
            padding: 18,
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>
            {getGreeting()},
          </p>
          <p style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 4 }}>
            {firstName}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
            Here&apos;s what&apos;s happening today.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(52,211,153,0.15)',
                color: '#34d399',
                border: '1px solid rgba(52,211,153,0.2)',
              }}
            >
              {activeStudents} active now
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(251,191,36,0.12)',
                color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              {testsThisWeek} tests this week
            </span>
          </div>
        </div>

        {/* ── Overview label ───────────────────────────────────────────────── */}
        <p style={TOKEN.sectionLabel}>Overview</p>

        {/* ── 2×2 Stats grid ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {/* Total Students */}
          <div
            style={{
              background: TOKEN.cardSurface,
              borderRadius: TOKEN.cardRadius,
              padding: 16,
              border: `0.5px solid ${TOKEN.cardBorder}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(59,130,246,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <svg width="16" height="16" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p style={{ fontSize: 28, fontWeight: 500, color: '#fff', lineHeight: 1, marginBottom: 4 }}>
              {totalStudents}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Total Students</p>
          </div>

          {/* Active Today */}
          <div
            style={{
              background: TOKEN.cardSurface,
              borderRadius: TOKEN.cardRadius,
              padding: 16,
              border: `0.5px solid ${TOKEN.cardBorder}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(52,211,153,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <svg width="16" height="16" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p style={{ fontSize: 28, fontWeight: 500, color: '#34d399', lineHeight: 1, marginBottom: 4 }}>
              {activeStudents}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Active Today</p>
          </div>

          {/* Tests This Week */}
          <div
            style={{
              background: TOKEN.cardSurface,
              borderRadius: TOKEN.cardRadius,
              padding: 16,
              border: `0.5px solid ${TOKEN.cardBorder}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(251,191,36,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <svg width="16" height="16" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p style={{ fontSize: 28, fontWeight: 500, color: '#fbbf24', lineHeight: 1, marginBottom: 4 }}>
              {testsThisWeek}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Tests This Week</p>
          </div>

          {/* Avg Score */}
          <div
            style={{
              background: TOKEN.cardSurface,
              borderRadius: TOKEN.cardRadius,
              padding: 16,
              border: `0.5px solid ${TOKEN.cardBorder}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(167,139,250,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <svg width="16" height="16" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p style={{ fontSize: 28, fontWeight: 500, color: '#a78bfa', lineHeight: 1, marginBottom: 4 }}>
              {avgScore}%
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Avg Score</p>
            {/* Progress bar */}
            <div
              style={{
                height: 3,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(avgScore, 100)}%`,
                  background: '#a78bfa',
                  borderRadius: 99,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <p style={TOKEN.sectionLabel}>Quick actions</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              style={{
                background: TOKEN.cardSurface,
                borderRadius: TOKEN.cardRadius,
                padding: '14px 10px',
                textAlign: 'center',
                border: `0.5px solid ${TOKEN.cardBorder}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: action.badgeBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  color: action.iconColor,
                }}
              >
                {action.icon}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: action.iconColor,
                  lineHeight: 1.2,
                }}
              >
                {action.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Recent activity ──────────────────────────────────────────────── */}
        <p style={TOKEN.sectionLabel}>Recent activity</p>
        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div
            style={{
              background: TOKEN.cardSurface,
              borderRadius: TOKEN.cardRadius,
              border: `0.5px solid ${TOKEN.cardBorder}`,
              overflow: 'hidden',
            }}
          >
            {stats.recentActivity.slice(0, 10).map((activity: any, index: number) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  borderBottom: index < Math.min(stats.recentActivity.length, 10) - 1
                    ? `0.5px solid ${TOKEN.cardBorder}`
                    : undefined,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    marginTop: 5,
                    flexShrink: 0,
                    background: activity.user_type === 'admin' ? '#60a5fa' : '#34d399',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>{activity.action}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div
            style={{
              background: TOKEN.cardSurface,
              borderRadius: TOKEN.cardRadius,
              border: `0.5px solid ${TOKEN.cardBorder}`,
              padding: '32px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <svg width="20" height="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              No recent activity
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
              Events will appear here as you use the platform
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Desktop layout (unchanged visual style) ──────────────────────────────
  const DesktopView = (
    <PageWrapper title="Dashboard Overview">
      {/* Welcome banner */}
      <div
        className="rounded-xl p-5 mb-6 text-white"
        style={{ background: 'linear-gradient(135deg, var(--color-sidebar-bg) 0%, var(--color-primary) 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70 font-medium">{getGreeting()},</p>
            <h2 className="text-xl font-bold mt-0.5">{firstName} 👋</h2>
            <p className="text-sm text-white/60 mt-1">
              Here&apos;s what&apos;s happening at your institution today.
            </p>
          </div>
          <div className="hidden sm:block opacity-20">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Students', value: totalStudents, accentColor: '#2563EB', bgColor: '#EFF6FF', textColor: '#1D4ED8', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
          { label: 'Active Today', value: activeStudents, accentColor: '#16A34A', bgColor: '#F0FDF4', textColor: '#15803D', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: 'Tests This Week', value: testsThisWeek, accentColor: '#D97706', bgColor: '#FFFBEB', textColor: '#B45309', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
          { label: 'Avg Score', value: `${avgScore}%`, accentColor: '#7C3AED', bgColor: '#F5F3FF', textColor: '#6D28D9', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 dark:bg-slate-800 dark:border-slate-700"
          >
            <div className="h-1 w-full" style={{ backgroundColor: card.accentColor }} />
            <div className="p-5 flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: card.bgColor, color: card.textColor }}
              >
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate dark:text-slate-400">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none dark:text-slate-100">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card title="Quick Actions" subtitle="Shortcuts to common tasks" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors text-center ${DESKTOP_ACTION_COLOR_MAP[action.href] ?? ''}`}
              >
                {action.icon}
                <span className="text-xs font-semibold leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" subtitle="Latest events in your institution" className="lg:col-span-2">
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-1">
              {stats.recentActivity.slice(0, 10).map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 dark:border-slate-700">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: activity.user_type === 'admin' ? 'var(--color-primary)' : '#16A34A' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate dark:text-slate-100">{activity.action}</p>
                    <p className="text-xs text-gray-400 mt-0.5 dark:text-slate-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={activity.user_type === 'admin' ? 'info' : 'success'} className="shrink-0">
                    {activity.user_type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-10 h-10 text-gray-300 mb-3 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-slate-500">No recent activity to show</p>
              <p className="text-xs text-gray-300 mt-1 dark:text-slate-500">Activity will appear here as you use the platform</p>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );

  return (
    <>
      {MobileView}
      <div className="hidden lg:block">{DesktopView}</div>
    </>
  );
}