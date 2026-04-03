'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Button, Badge, Spinner, Modal, Input } from '@/components/ui';
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

  return (
    <PageWrapper title="My Profile">
      <div className="space-y-6">

        {/* ── 1. Student Basic Information ── */}
        <Card>
          <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name ?? 'Avatar'}
                    fill
                    className="object-cover rounded-full"
                    sizes="80px"
                  />
                ) : (
                  profile?.name?.charAt(0).toUpperCase() || 'S'
                )}
              </div>
              <button
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 flex items-center justify-center shadow hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                title="Change profile photo"
                aria-label="Change profile photo"
              >
                {avatarUploading ? (
                  <svg className="w-3 h-3 animate-spin text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-gray-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate dark:text-slate-100">{profile?.name || '—'}</h2>
              <p className="text-gray-500 text-sm mt-0.5 dark:text-slate-400">{profile?.email || '—'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {profile?.roll_number && (
                  <Badge variant="info">{profile.roll_number}</Badge>
                )}
                {profile?.phone && (
                  <span className="text-sm text-gray-600 dark:text-slate-300">📞 {profile.phone}</span>
                )}
                <Badge variant={profile?.is_active ? 'success' : 'danger'}>
                  {profile?.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {performance.streak > 0 && (
                  <span className="text-sm font-medium text-orange-600">🔥 {performance.streak}-day streak</span>
                )}
              </div>
              {profile?.created_at && (
                <p className="text-xs text-gray-400 mt-1 dark:text-slate-500">Member since {formatDate(profile.created_at)}</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                Edit Profile
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </Button>
            </div>
          </div>
        </Card>

        {/* ── 2. Performance Overview ── */}
        <div>
          <h3 className="text-base font-semibold text-gray-700 mb-3 dark:text-slate-200">📊 Performance Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                { label: 'Total Tests', value: performance.totalTests, color: '' },
                { label: 'Passed', value: performance.passed, color: 'text-green-600' },
                { label: 'Failed', value: performance.failed, color: 'text-red-500' },
                { label: 'Avg Score', value: `${performance.avgScore}%`, color: '' },
                { label: 'Highest Score', value: `${performance.highestScore}%`, color: '' },
                { label: 'Streak', value: `${performance.streak} 🔥`, color: '' },
                ...(performance.accuracy !== null
                  ? [{ label: 'Accuracy', value: `${performance.accuracy}%`, color: '' }]
                  : []),
                ...(performance.avgTimeTakenSeconds !== null
                  ? [{ label: 'Avg Time', value: formatSeconds(performance.avgTimeTakenSeconds), color: '' }]
                  : []),
              ] as { label: string; value: string | number; color: string }[]
            ).map((stat) => (
              <Card key={stat.label}>
                <div className="text-center p-4">
                  <p className="text-xs text-gray-500 mb-1 dark:text-slate-400">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}
                    style={stat.color ? undefined : { color: 'var(--color-primary)' }}>
                    {stat.value}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── 3. Leaderboard Ranking ── */}
        <Card>
          <div className="p-4 md:p-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4 dark:text-slate-200">🏆 Leaderboard Ranking</h3>
            {leaderboard.rank !== null ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-extrabold" style={{ color: 'var(--color-primary)' }}>
                    #{leaderboard.rank}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">
                    of {leaderboard.totalStudents} students
                  </p>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-slate-300">Total Points:</span>
                    <span className="font-bold">{leaderboard.totalPoints} pts</span>
                  </div>
                  {leaderboard.rankBadge && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {leaderboard.rankBadge}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => router.push('/leaderboard')}>
                  View Full Leaderboard
                </Button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm dark:text-slate-400">
                Complete a test to appear on the leaderboard.
              </p>
            )}
          </div>
        </Card>

        {/* ── 4. Today's Tests (if any) ── */}
        {todayTests.length > 0 && (
          <Card>
            <div className="p-4 md:p-6">
              <h3 className="text-base font-semibold text-gray-700 mb-4 dark:text-slate-200">📝 Today's Tests</h3>
              <div className="space-y-3">
                {todayTests.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl dark:bg-slate-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{item.tests?.title}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{item.tests?.courses?.name}</p>
                    </div>
                    <Button size="sm" onClick={() => router.push(`/tests/${item.tests?.id}`)}>
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── 5. Recent Test History ── */}
        <Card>
          <div className="p-4 md:p-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4 dark:text-slate-200">🧾 Recent Test History</h3>
            {recentTests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b dark:text-slate-400">
                      <th className="pb-2 pr-4 font-medium">Test Name</th>
                      <th className="pb-2 pr-4 font-medium">Score</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {recentTests.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50 cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700"
                        onClick={() => router.push(`/results/${result.id}`)}>
                        <td className="py-3 pr-4 font-medium text-gray-900 dark:text-slate-100">
                          {result.tests?.title || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-semibold">{result.score}/{result.total_marks}</span>
                          <span className="text-gray-500 ml-1 dark:text-slate-400">({Math.round(result.percentage)}%)</span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={result.status === 'passed' ? 'success' : result.status === 'failed' ? 'danger' : 'info'}>
                            {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-500 dark:text-slate-400">
                          {formatDate(result.submitted_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6 dark:text-slate-400">No tests completed yet.</p>
            )}
            {recentTests.length > 0 && (
              <div className="mt-4 text-right">
                <Button size="sm" variant="outline" onClick={() => router.push('/results')}>
                  View All Results
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* ── Upcoming Tests ── */}
        {upcomingTests.length > 0 && (
          <Card>
            <div className="p-4 md:p-6">
              <h3 className="text-base font-semibold text-gray-700 mb-4 dark:text-slate-200">📅 Upcoming Tests</h3>
              <div className="space-y-3">
                {upcomingTests.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl dark:bg-slate-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{item.tests?.title}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{item.tests?.courses?.name}</p>
                    </div>
                    <Badge variant="info">Scheduled</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
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
    </PageWrapper>
  );
}