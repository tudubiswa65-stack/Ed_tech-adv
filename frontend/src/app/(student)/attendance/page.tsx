'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

interface Attendance {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period?: string;
  session?: string;
}

interface DateGroup {
  label: string;
  present: number;
  total: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLOR_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLOR_PALETTE[Math.abs(h) % AVATAR_COLOR_PALETTE.length];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function fmtShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── design tokens ─────────────────────────────────────────────────────────────

const BG = '#0f1117';
const CARD_BG = '#1a1d27';
const BORDER = '0.5px solid #2d3044';
const DIVIDER = '0.5px solid #1e2133';
const TEXT_PRIMARY = '#f1f3f7';
const TEXT_MUTED = '#6b7280';
const TEXT_BODY = '#c9cdd6';
const GREEN = '#34d399';
const RED = '#ef4444';

const card: React.CSSProperties = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 16,
};

// ── pill style helper ─────────────────────────────────────────────────────────

function getPillStyle(status: string): React.CSSProperties {
  if (status === 'present') return { background: '#052e16', color: GREEN, border: '0.5px solid #34d39940' };
  if (status === 'absent')  return { background: '#2d0707', color: RED,   border: '0.5px solid #ef444440' };
  return { background: '#1c1508', color: '#f59e0b', border: '0.5px solid #f59e0b40' };
}

// ── skeleton block ────────────────────────────────────────────────────────────

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 8,
        animation: 'att-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// ── retry message ─────────────────────────────────────────────────────────────

function RetryMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: 'center', padding: '16px 0' }}>
      Could not load data.{' '}
      <button
        onClick={onRetry}
        style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
      >
        Tap to retry.
      </button>
    </p>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await apiClient.get('/student/attendance');
      setAttendance(response.data.data || []);
    } catch (err) {
      console.error('Failed to load attendance', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // ── derived stats ────────────────────────────────────────────────────────────

  const totalClasses = attendance.length;
  const presentCount = attendance.filter((r) => r.status === 'present').length;
  const absentCount = attendance.filter((r) => r.status === 'absent').length;
  const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

  // circular ring
  const RADIUS = 28;
  const CIRC = 2 * Math.PI * RADIUS;
  const dashOffset = CIRC * (1 - attendanceRate / 100);

  // weekly snapshot grouping
  const dateGroupMap = attendance.reduce<Record<string, DateGroup>>((acc, rec) => {
    const label = fmtShort(rec.date);
    if (!acc[label]) acc[label] = { label, present: 0, total: 0 };
    acc[label].total++;
    if (rec.status === 'present') acc[label].present++;
    return acc;
  }, {});
  const dateGroups = Object.values(dateGroupMap);

  // avatar
  const userName = user?.name ?? '';
  const initials = userName ? getInitials(userName) : '?';
  const avatarColor = userName ? getAvatarColor(userName) : '#3b82f6';

  // ── layout wrapper ───────────────────────────────────────────────────────────

  const outer: React.CSSProperties = {
    minHeight: '100%',
    background: BG,
    padding: '20px 16px 32px',
    maxWidth: 420,
    margin: '0 auto',
  };

  // ── loading state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={outer}>
        <style>{`@keyframes att-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <Skeleton style={{ width: 130, height: 11, marginBottom: 8 }} />
            <Skeleton style={{ width: 160, height: 22 }} />
          </div>
          <Skeleton style={{ width: 40, height: 40, borderRadius: '50%' }} />
        </div>
        {/* stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Skeleton style={{ flex: 1, height: 80, borderRadius: 16 }} />
          <Skeleton style={{ flex: 1, height: 80, borderRadius: 16 }} />
          <Skeleton style={{ flex: 1, height: 80, borderRadius: 16 }} />
        </div>
        {/* snapshot */}
        <Skeleton style={{ height: 96, borderRadius: 16, marginBottom: 16 }} />
        {/* log rows */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '14px 16px', borderBottom: DIVIDER }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton style={{ width: 110, height: 14 }} />
                <Skeleton style={{ width: 64, height: 22, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────────

  return (
    <div style={outer}>
      <style>{`@keyframes att-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 500, margin: '0 0 4px' }}>
            Student Dashboard
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: TEXT_PRIMARY, margin: 0 }}>My Attendance</h1>
        </div>
        {user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={userName}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: BORDER, flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {/* Total */}
        <div style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px' }}>
          <span style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1 }}>{totalClasses}</span>
          <span style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 5 }}>classes</span>
        </div>

        {/* Present / Absent */}
        <div style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px' }}>
          <span style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Present</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: GREEN, lineHeight: 1 }}>{presentCount}</span>
          <span style={{ fontSize: 10, color: RED, marginTop: 5 }}>{absentCount} absent</span>
        </div>

        {/* Rate ring */}
        <div style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px' }}>
          <span style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rate</span>
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="28" cy="28" r={RADIUS} fill="none" stroke="#2d3044" strokeWidth="5" />
              <circle
                cx="28"
                cy="28"
                r={RADIUS}
                fill="none"
                stroke={GREEN}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: TEXT_PRIMARY,
              }}
            >
              {Math.round(attendanceRate)}%
            </div>
          </div>
        </div>
      </div>

      {/* ── WEEKLY SNAPSHOT ── */}
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px', fontWeight: 600 }}>
          Weekly Snapshot
        </p>
        {error ? (
          <RetryMessage onRetry={fetchAttendance} />
        ) : dateGroups.length === 0 ? (
          <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: 'center', padding: '8px 0', margin: 0 }}>
            No attendance records yet.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {dateGroups.map((grp) => {
              const ratio = grp.total > 0 ? grp.present / grp.total : 0;
              const barColor = ratio > 0.5 ? GREEN : RED;
              return (
                <div key={grp.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48, flex: '0 0 auto' }}>
                  <div style={{ width: '100%', height: 6, background: '#2d3044', borderRadius: 99, marginBottom: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${ratio * 100}%`, background: barColor, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2 }}>{grp.label}</span>
                  <span style={{ fontSize: 10, color: barColor, fontWeight: 600 }}>
                    {grp.present}/{grp.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CLASS LOG ── */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {/* card header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: DIVIDER,
          }}
        >
          <span style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Class Log
          </span>
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>{attendance.length} entries</span>
        </div>

        {error ? (
          <div style={{ padding: '20px 16px' }}>
            <RetryMessage onRetry={fetchAttendance} />
          </div>
        ) : attendance.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0 }}>No attendance records yet.</p>
          </div>
        ) : (
          attendance.map((record, idx) => {
            const pill = getPillStyle(record.status);

            const session = record.period || record.session;

            return (
              <div
                key={record.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: idx < attendance.length - 1 ? DIVIDER : 'none',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, color: TEXT_BODY, margin: session ? '0 0 2px' : 0 }}>{fmtFull(record.date)}</p>
                  {session && <p style={{ fontSize: 11, color: TEXT_MUTED, margin: 0 }}>{session}</p>}
                </div>
                <span
                  style={{
                    ...pill,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 99,
                    textTransform: 'capitalize',
                    flexShrink: 0,
                  }}
                >
                  {capitalize(record.status)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
