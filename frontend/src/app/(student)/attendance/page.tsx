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

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ── design tokens ─────────────────────────────────────────────────────────────

const BG = '#0f172a';
const CARD = '#1e293b';
const CARD_BORDER = '0.5px solid rgba(255,255,255,0.06)';
const DIVIDER = '0.5px solid rgba(255,255,255,0.04)';
const TEXT_MUTED = 'rgba(255,255,255,0.35)';
const GREEN = '#34d399';
const RED = '#f87171';
const BLUE = '#60a5fa';

const cardBase: React.CSSProperties = {
  background: CARD,
  border: CARD_BORDER,
  borderRadius: 12,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: TEXT_MUTED,
};

// ── pill style helper ─────────────────────────────────────────────────────────

function getPillStyle(status: string): React.CSSProperties {
  if (status === 'present')
    return { background: 'rgba(52,211,153,0.12)', color: GREEN, border: '1px solid rgba(52,211,153,0.2)' };
  if (status === 'absent')
    return { background: 'rgba(248,113,113,0.12)', color: RED, border: '1px solid rgba(248,113,113,0.2)' };
  // late / excused — amber fallback
  return { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' };
}

const pillBase: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  padding: '4px 12px',
  borderRadius: 20,
  flexShrink: 0,
};

// ── skeleton block ────────────────────────────────────────────────────────────

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.06)',
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
    <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: 'center', padding: '16px 0', margin: 0 }}>
      Could not load data.{' '}
      <button
        onClick={onRetry}
        style={{ color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
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

  // attendance status label
  const rateStatus = attendanceRate >= 80 ? 'Good' : attendanceRate >= 60 ? 'Fair' : 'Poor';
  const rateStatusStyle: React.CSSProperties =
    rateStatus === 'Good'
      ? { background: 'rgba(52,211,153,0.1)', color: GREEN, border: '1px solid rgba(52,211,153,0.2)' }
      : rateStatus === 'Fair'
      ? { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
      : { background: 'rgba(248,113,113,0.1)', color: RED, border: '1px solid rgba(248,113,113,0.2)' };

  // month/year badge — use most recent record date or today
  const badgeDate =
    attendance.length > 0
      ? new Date(attendance[attendance.length - 1].date)
      : new Date();
  const monthYearLabel = fmtMonthYear(badgeDate);

  // session counter — auto-increment per unique date
  const sessionCounters: Record<string, number> = {};
  const recordsWithSession = attendance.map((rec) => {
    const dateKey = rec.date.slice(0, 10);
    sessionCounters[dateKey] = (sessionCounters[dateKey] || 0) + 1;
    return { ...rec, sessionNum: sessionCounters[dateKey] };
  });

  // avatar
  const userName = user?.name ?? '';
  const initials = userName ? getInitials(userName) : '?';
  const avatarColor = userName ? getAvatarColor(userName) : '#3b82f6';

  // ── layout wrapper ───────────────────────────────────────────────────────────

  const outer: React.CSSProperties = {
    minHeight: '100%',
    background: BG,
    padding: '24px 20px 40px',
    maxWidth: 1100,
    width: '100%',
    margin: '0 auto',
  };

  const avatarEl = user?.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar_url}
      alt={userName}
      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: CARD_BORDER, flexShrink: 0 }}
    />
  ) : (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: avatarColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 600,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );

  // ── loading state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={outer}>
        <style>{`
          @keyframes att-pulse{0%,100%{opacity:1}50%{opacity:.4}}
          .att-stats{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:14px}
          .att-top{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:14px}
          @media(min-width:640px){.att-stats{grid-template-columns:1fr 1fr 1fr}}
          @media(min-width:900px){.att-top{grid-template-columns:1fr 1fr}}
        `}</style>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Skeleton style={{ width: 120, height: 14 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Skeleton style={{ width: 72, height: 24, borderRadius: 20 }} />
            <Skeleton style={{ width: 36, height: 36, borderRadius: '50%' }} />
          </div>
        </div>
        {/* stats row */}
        <div className="att-stats">
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
        </div>
        {/* rate card + log top section */}
        <div className="att-top">
          <Skeleton style={{ height: 112, borderRadius: 12 }} />
          <Skeleton style={{ height: 112, borderRadius: 12 }} />
        </div>
        {/* log */}
        <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            <Skeleton style={{ width: 80, height: 10 }} />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '13px 14px', borderBottom: DIVIDER }}>
              <div>
                <Skeleton style={{ width: 100, height: 13, marginBottom: 6 }} />
                <Skeleton style={{ width: 60, height: 10 }} />
              </div>
              <Skeleton style={{ width: 64, height: 22, borderRadius: 20 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────────

  return (
    <div style={outer}>
      <style>{`
        @keyframes att-pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .att-stats{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:14px}
        .att-top{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:14px}
        @media(min-width:640px){.att-stats{grid-template-columns:1fr 1fr 1fr}}
        @media(min-width:900px){.att-top{grid-template-columns:1fr 1fr}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)', margin: 0 }}>My Attendance</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.2)',
              color: BLUE,
              fontSize: 11,
              borderRadius: 20,
              padding: '4px 10px',
              fontWeight: 500,
            }}
          >
            {monthYearLabel}
          </span>
          {avatarEl}
        </div>
      </div>

      {/* ── STATS ROW — 1 col mobile → 3 col desktop ── */}
      <div className="att-stats">
        {/* Total */}
        <div style={{ ...cardBase, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px' }}>
          <span style={{ ...sectionLabel, marginBottom: 8 }}>Total</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalClasses}</span>
          <span style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>classes</span>
        </div>

        {/* Present */}
        <div style={{ ...cardBase, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px' }}>
          <span style={{ ...sectionLabel, marginBottom: 8 }}>Present</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: GREEN, lineHeight: 1 }}>{presentCount}</span>
          <span style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>days</span>
        </div>

        {/* Absent */}
        <div style={{ ...cardBase, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px' }}>
          <span style={{ ...sectionLabel, marginBottom: 8 }}>Absent</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: RED, lineHeight: 1 }}>{absentCount}</span>
          <span style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>days</span>
        </div>
      </div>

      {/* ── ATTENDANCE RATE CARD ── */}
      <div style={{ ...cardBase, padding: '18px 20px', marginBottom: 14 }}>
        {/* top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>Attendance rate</span>
          <span style={{ fontSize: 22, fontWeight: 500, color: GREEN }}>{Math.round(attendanceRate)}%</span>
        </div>
        {/* progress bar */}
        <div
          style={{
            height: 8,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${attendanceRate}%`,
              background: GREEN,
              borderRadius: 8,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        {/* legend row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>
              Present {presentCount}/{totalClasses}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>
              Absent {absentCount}/{totalClasses}
            </span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span
              style={{
                ...rateStatusStyle,
                fontSize: 11,
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              {rateStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ── SESSION LOG ── */}
      <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
        {/* column header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            padding: '12px 20px',
            borderBottom: '0.5px solid rgba(255,255,255,0.05)',
          }}
        >
          <span style={{ ...sectionLabel }}>Date</span>
          <span style={{ ...sectionLabel }}>Status</span>
        </div>

        {error ? (
          <div style={{ padding: '20px 20px' }}>
            <RetryMessage onRetry={fetchAttendance} />
          </div>
        ) : attendance.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0 }}>No attendance records yet.</p>
          </div>
        ) : (
          recordsWithSession.map((record, idx) => {
            const pill = getPillStyle(record.status);
            const isAbsent = record.status === 'absent';
            const isLast = idx === recordsWithSession.length - 1;

            return (
              <div
                key={record.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  padding: '15px 20px',
                  borderBottom: isLast ? 'none' : DIVIDER,
                  background: isAbsent ? 'rgba(248,113,113,0.04)' : 'transparent',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: '0 0 3px' }}>
                    {fmtDate(record.date)}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                    Session {record.sessionNum}
                  </p>
                </div>
                <span style={{ ...pill, ...pillBase, textTransform: 'capitalize' }}>
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
