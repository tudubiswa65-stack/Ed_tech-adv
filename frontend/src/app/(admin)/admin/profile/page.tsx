'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { validateAvatarFile } from '@/lib/avatarValidation';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  branch_id: string | null;
  created_at: string;
}

export default function AdminProfilePage() {
  const { refreshUser, updateUserAvatar } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/profile');
      const data = res.data?.data ?? res.data;
      setProfile(data);
      setEditName(data?.name ?? '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await apiClient.put('/admin/profile', { name: editName.trim() });
      setProfile((p) => p ? { ...p, name: editName.trim() } : p);
      await refreshUser();
      toastSuccess('Profile updated successfully.');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toastError('Failed to update profile. Please try again.');
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
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await apiClient.post('/admin/profile/avatar', formData);
      const newUrl = res.data?.data?.avatar_url;
      if (newUrl) {
        // The backend returns a signed URL (unique per generation), so no
        // cache-busting is needed — every signed URL has a distinct token.
        setProfile((p) => p ? { ...p, avatar_url: newUrl } : p);
        updateUserAvatar(newUrl);
        toastSuccess('Profile photo updated successfully.');
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toastError('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const roleLabel = (role: string) =>
    role === 'super_admin' ? 'Super Admin' : role === 'branch_admin' ? 'Branch Admin' : 'Admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <PageWrapper title="My Profile">
      <div className="max-w-xl space-y-6">
        {/* Avatar card */}
        <Card>
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name ?? 'Avatar'}
                    fill
                    priority
                    className="object-cover rounded-full"
                    sizes="96px"
                  />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 flex items-center justify-center shadow hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                title="Change profile photo"
                aria-label="Change profile photo"
              >
                {uploading ? (
                  <svg className="w-4 h-4 animate-spin text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                aria-hidden="true"
              />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{profile?.name}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">{profile?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {profile?.role ? roleLabel(profile.role) : ''}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Click the camera icon to update your profile photo
            </p>
          </div>
        </Card>

        {/* Edit name card */}
        <Card title="Edit Profile">
          <div className="p-4 space-y-4">
            <Input
              label="Display Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter your name"
            />
            <div className="flex justify-end">
              <Button onClick={handleSaveName} disabled={saving || editName.trim() === profile?.name}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
