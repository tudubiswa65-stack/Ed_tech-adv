'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button, Spinner, Modal, Input } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { validateAvatarFile } from '@/lib/avatarValidation';

interface Profile {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  is_active: boolean;
}

interface Performance {
  totalTests: number;
  passed: number;
  failed: number;
  avgScore: number;
  highestScore: number;
  accuracy: number | null;
  avgTimeTakenSeconds: number | null;
  streak: number;
}

interface LeaderboardInfo {
  rank: number | null;
  totalPoints: number;
  totalStudents: number;
  rankBadge: string | null;
}

interface RecentTest {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: 'passed' | 'failed' | 'pending';
  submitted_at: string;
  tests: { id: string; title: string } | null;
}

interface TodayTest {
  id: string;
  tests: { id: string; title: string; courses: { name: string } | null } | null;
}

interface DashboardData {
  profile: Profile | null;
  performance: Performance;
  leaderboard: LeaderboardInfo;
  recentTests: RecentTest[];
  todayTests: TodayTest[];
  upcomingTests: TodayTest[];
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function StudentProfileDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const { updateUserAvatar } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/student/dashboard');
      const payload = response.data.success && response.data.data
        ? response.data.data
        : response.data;
      setData(payload);
      if (payload?.profile) {
        setFormData({
          name: payload.profile.name || '',
          phone: payload.profile.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.put('/student/profile', formData);
      setData((prev) =>
        prev && prev.profile
          ? { ...prev, profile: { ...prev.profile, ...formData } }
          : prev
      );
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toastError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toastError('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toastError('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/student/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toastSuccess('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toastError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toastError(validation.error ?? 'Invalid file.');
      return;
    }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await apiClient.post('/student/profile/avatar', formData);
      const newUrl = res.data?.data?.avatar_url;
      if (newUrl) {
        setData((prev) =>
          prev && prev.profile ? { ...prev, profile: { ...prev.profile, avatar_url: newUrl } } : prev
        );
        updateUserAvatar(newUrl);
        toastSuccess('Profile photo updated successfully.');
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toastError('Failed to upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const { profile, performance, leaderboard, recentTests, todayTests, upcomingTests } = data || {
    profile: null,
    performance: { totalTests: 0, passed: 0, failed: 0, avgScore: 0, highestScore: 0, accuracy: null, avgTimeTakenSeconds: null, streak: 0 },
    leaderboard: { rank: null, totalPoints: 0, totalStudents: 0, rankBadge: null },
    recentTests: [],
    todayTests: [],
    upcomingTests: [],
  };

  // SVG progress ring helpers
  const RING_R = 24;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

  // Section label style token
  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
    margin: '0 0 10px 0',
  };

  // Card surface token
  const cardSurface: React.CSSProperties = {
    background: '#1e293b',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh' }}>
      {/* Hidden file input for avatar upload */}
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleAvatarUpload}
        aria-hidden="true"
      />

      {/* ── Profile Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '20px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Avatar with camera overlay */}
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 26, fontWeight: 700,
              overflow: 'hidden', position: 'relative',
            }}>
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name ?? 'Avatar'}
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              ) : (
                profile?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'S'
              )}
            </div>
            <button
              onClick={() => avatarFileRef.current?.click()}
              disabled={avatarUploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: '50%',
                background: '#1e3a5f', border: '2px solid #60a5fa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: avatarUploading ? 'not-allowed' : 'pointer', opacity: avatarUploading ? 0.6 : 1,
              }}
              title="Change profile photo"
              aria-label="Change profile photo"
            >
              {avatarUploading ? (
                <svg style={{ width: 10, height: 10, color: '#60a5fa', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg style={{ width: 11, height: 11, color: '#60a5fa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* Name / Email / Status / Member-since */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 500, color: '#ffffff', margin: 0, lineHeight: 1.3 }} className="truncate">
              {profile?.name || '—'}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }} className="truncate">
              {profile?.email || '—'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                background: profile?.is_active ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                color: profile?.is_active ? '#34d399' : '#f87171',
                padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500,
                border: `1px solid ${profile?.is_active ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}>
                {profile?.is_active ? 'Active' : 'Inactive'}
              </span>
              {profile?.roll_number && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{profile.roll_number}</span>
              )}
            </div>
            {profile?.created_at && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, marginBottom: 0 }}>
                Member since {formatDate(profile.created_at)}
              </p>
            )}
          </div>

          {/* Edit & Password buttons (stacked) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                background: 'rgba(96,165,250,0.15)', color: '#60a5fa',
                border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8,
                padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              style={{
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Password
            </button>
          </div>
        </div>
      </div>

      {/* ── Page Sections ── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Performance Stats ── */}
        <section>
          <p style={sectionLabel}>Performance Overview</p>

          {/* Block 1: Total Tests / Passed / Failed — 3-column */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'Total Tests', value: performance.totalTests, color: '#60a5fa' },
              { label: 'Passed', value: performance.passed, color: '#34d399' },
              { label: 'Failed', value: performance.failed, color: '#f87171' },
            ].map((s) => (
              <div key={s.label} style={{ ...cardSurface, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Block 2: Avg Score / Accuracy / Best Score / Avg Time — grouped 2×2 card */}
          <div style={{ ...cardSurface, padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>

              {/* Avg Score with blue progress bar */}
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Avg Score</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa', margin: 0 }}>{performance.avgScore}%</p>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 6 }}>
                  <div style={{ width: `${Math.min(performance.avgScore, 100)}%`, height: '100%', background: '#60a5fa', borderRadius: 3 }} />
                </div>
              </div>

              {/* Accuracy with purple progress bar */}
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Accuracy</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa', margin: 0 }}>
                  {performance.accuracy !== null ? `${performance.accuracy}%` : '—'}
                </p>
                {performance.accuracy !== null && (
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 6 }}>
                    <div style={{ width: `${Math.min(performance.accuracy, 100)}%`, height: '100%', background: '#a78bfa', borderRadius: 3 }} />
                  </div>
                )}
              </div>

              {/* Best Score */}
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Best Score</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', margin: 0 }}>{performance.highestScore}%</p>
              </div>

              {/* Avg Time */}
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Avg Time</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                  {performance.avgTimeTakenSeconds !== null ? formatSeconds(performance.avgTimeTakenSeconds) : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Leaderboard Ranking ── */}
        <section>
          <p style={sectionLabel}>Leaderboard Ranking</p>
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '3px solid #60a5fa',
            padding: '16px',
            position: 'relative',
          }}>
            {leaderboard.rank !== null ? (
              <>
                {/* Gold pill badge */}
                {leaderboard.rankBadge && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: '#fbbf24', color: '#0f172a',
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999,
                  }}>
                    {leaderboard.rankBadge}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                  <p style={{ fontSize: 36, fontWeight: 800, color: '#60a5fa', margin: 0, lineHeight: 1 }}>
                    #{leaderboard.rank}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                    of {leaderboard.totalStudents} students · {leaderboard.totalPoints} pts
                  </p>
                </div>
                <button
                  onClick={() => router.push('/leaderboard')}
                  style={{
                    width: '100%', background: 'transparent',
                    border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa',
                    borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  View full leaderboard →
                </button>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Complete a test to appear on the leaderboard.
              </p>
            )}
          </div>
        </section>

        {/* ── Today's Tests ── */}
        {todayTests.length > 0 && (
          <section>
            <p style={sectionLabel}>Today&apos;s Tests</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTests.map((item) => (
                <div key={item.id} style={{
                  ...cardSurface,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ color: 'white', fontWeight: 500, margin: 0, fontSize: 14 }}>{item.tests?.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{item.tests?.courses?.name}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/tests/${item.tests?.id}`)}
                    style={{
                      background: '#60a5fa', color: '#0f172a', border: 'none',
                      borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Recent Test Card ── */}
        <section>
          <p style={sectionLabel}>Recent Test</p>
          {recentTests.length > 0 ? (() => {
            const recent = recentTests[0];
            const pct = Math.round(recent.percentage);
            const filled = (pct / 100) * RING_CIRCUMFERENCE;
            const statusColor = recent.status === 'passed' ? '#34d399' : recent.status === 'failed' ? '#f87171' : '#fbbf24';
            const statusBg = recent.status === 'passed' ? 'rgba(52,211,153,0.15)' : recent.status === 'failed' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)';
            const statusBorder = recent.status === 'passed' ? 'rgba(52,211,153,0.3)' : recent.status === 'failed' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)';
            return (
              <div style={{ ...cardSurface, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, paddingRight: 12 }}>
                    <p style={{ color: 'white', fontWeight: 500, margin: 0, fontSize: 14 }}>{recent.tests?.title || '—'}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#60a5fa', margin: '6px 0 2px' }}>
                      {recent.score}/{recent.total_marks}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{formatDate(recent.submitted_at)}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    <span style={{
                      background: statusBg, color: statusColor,
                      padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500,
                      border: `1px solid ${statusBorder}`,
                    }}>
                      {recent.status.charAt(0).toUpperCase() + recent.status.slice(1)}
                    </span>
                    {/* Circular SVG progress ring */}
                    <svg width="60" height="60" viewBox="0 0 60 60" aria-label={`${pct}% score`} role="img">
                      <circle cx="30" cy="30" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                      <circle
                        cx="30" cy="30" r={RING_R} fill="none" stroke="#60a5fa" strokeWidth="5"
                        strokeDasharray={`${filled} ${RING_CIRCUMFERENCE}`}
                        strokeLinecap="round"
                        transform="rotate(-90 30 30)"
                      />
                      <text x="30" y="35" textAnchor="middle" style={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                        {pct}%
                      </text>
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/results')}
                  style={{
                    marginTop: 14, width: '100%', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                    borderRadius: 8, padding: '9px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  View all results →
                </button>
              </div>
            );
          })() : (
            <div style={{ ...cardSurface, padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No tests completed yet.</p>
            </div>
          )}
        </section>

        {/* ── Upcoming Tests ── */}
        {upcomingTests.length > 0 && (
          <section>
            <p style={sectionLabel}>Upcoming Tests</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingTests.map((item) => (
                <div key={item.id} style={{
                  ...cardSurface,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ color: 'white', fontWeight: 500, margin: 0, fontSize: 14 }}>{item.tests?.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{item.tests?.courses?.name}</p>
                  </div>
                  <span style={{
                    background: 'rgba(96,165,250,0.15)', color: '#60a5fa',
                    padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500,
                    border: '1px solid rgba(96,165,250,0.3)',
                  }}>
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Enter phone number"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}