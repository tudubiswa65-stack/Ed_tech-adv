'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { apiClient } from '@/lib/apiClient';
import { validateAvatarFile } from '@/lib/avatarValidation';

interface NavbarProps {
  title: string;
  onMenuClick: () => void;
}

export default function Navbar({ title, onMenuClick }: NavbarProps) {
  const { user, logout, updateUserAvatar } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { error: toastError, success: toastSuccess } = useToast();
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminRoles = ['admin', 'super_admin', 'branch_admin'];

  // Reset image error state whenever the avatar URL changes (e.g. after upload)
  useEffect(() => {
    setImgError(false);
  }, [user?.avatar_url]);

  const handleLogout = async () => {
    await logout();
    window.location.href = user?.role && adminRoles.includes(user.role) ? '/admin/login' : '/login';
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const isAdmin = user?.role && adminRoles.includes(user.role);
      const endpoint = isAdmin ? '/admin/profile/avatar' : '/student/profile/avatar';
      const res = await apiClient.post(endpoint, formData);
      const newUrl = res.data?.data?.avatar_url;
      if (newUrl) {
        // updateUserAvatar clears the stale localStorage cache and stores the
        // new signed URL so subsequent page loads reuse it for 50 minutes.
        updateUserAvatar(newUrl);
      }
      toastSuccess('Profile photo updated successfully.');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toastError('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  const roleLabel =
    user?.role === 'super_admin'
      ? 'Super Admin'
      : user?.role === 'admin'
      ? 'Admin'
      : user?.role === 'branch_admin'
      ? 'Branch Admin'
      : 'Student';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left – hamburger + page title */}
        <div className="flex items-center gap-3">
          {/* Hamburger hidden on mobile — bottom nav handles mobile navigation */}
          <h1 className="text-base md:text-lg font-semibold text-gray-800 dark:text-slate-100">{title}</h1>
        </div>

        {/* Right – theme toggle + notification bell + user */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-700"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Notification bell */}
          <button
            className="relative p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-700"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />

          {/* User info */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:block text-right leading-tight">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{user?.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-400">{roleLabel}</p>
            </div>
            {/* Avatar - clickable to upload */}
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-offset-1 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60"
              style={{ outlineColor: 'var(--color-primary-light)' }}
              title="Click to change profile photo"
              aria-label="Change profile photo"
            >
              {uploading ? (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : user?.avatar_url && !imgError ? (
                <Image
                  src={user.avatar_url}
                  alt={user.name ?? 'Avatar'}
                  fill
                  priority
                  className="object-cover"
                  sizes="32px"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {initials}
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
              aria-hidden="true"
            />
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}