'use client';

import { useAuth } from '@/hooks/useAuth';
import { useInstitute } from '@/hooks/useInstitute';

interface NavbarProps {
  title: string;
  onMenuClick: () => void;
}

export default function Navbar({ title, onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const config = useInstitute();
  const adminRoles = ['admin', 'super_admin', 'branch_admin'];

  const handleLogout = async () => {
    await logout();
    window.location.href = user?.role && adminRoles.includes(user.role) ? '/admin/login' : '/';
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
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left – hamburger + page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base md:text-lg font-semibold text-gray-800">{title}</h1>
        </div>

        {/* Right – notification bell + user */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* User info */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:block text-right leading-tight">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-400">{roleLabel}</p>
            </div>
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-offset-1 text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: 'var(--color-primary)', outlineColor: 'var(--color-primary-light)' }}
            >
              {initials}
            </div>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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