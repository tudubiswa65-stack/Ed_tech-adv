'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useInstitute } from '@/hooks/useInstitute';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { studentQueryKeys } from '@/hooks/queries/useStudentQueries';
import { adminQueryKeys, ADMIN_NOTIF_VIEWED_AT_KEY } from '@/hooks/queries/useAdminQueries';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  feature?: keyof ReturnType<typeof useInstitute>['features'];
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { label: 'My Profile', href: '/admin/profile', icon: 'profile' },
  { label: 'Branches', href: '/admin/branches', icon: 'branches' },
  { label: 'Students', href: '/admin/students', icon: 'students' },
  { label: 'Courses', href: '/admin/courses', icon: 'courses' },
  { label: 'Attendance', href: '/admin/attendance', icon: 'attendance' },
  { label: 'Tests', href: '/admin/tests', icon: 'tests' },
  { label: 'Results', href: '/admin/results', icon: 'results' },
  { label: 'Payments', href: '/admin/payments', icon: 'payments' },
  { label: 'Study Materials', href: '/admin/materials', icon: 'materials', feature: 'studyMaterial' },
  { label: 'Notifications', href: '/admin/notifications', icon: 'notifications' },
  { label: 'Complaints', href: '/admin/complaints', icon: 'complaints', feature: 'complaints' },
  { label: 'Feedback', href: '/admin/feedback', icon: 'feedback', feature: 'feedback' },
  { label: 'Gallery', href: '/admin/gallery', icon: 'gallery' },
  { label: 'Settings', href: '/admin/settings', icon: 'settings' },
];

const studentNavItems: NavItem[] = [
  { label: 'Profile', href: '/dashboard', icon: 'profile' },
  { label: 'My Tests', href: '/tests', icon: 'tests' },
  { label: 'Results', href: '/results', icon: 'results' },
  { label: 'Attendance', href: '/attendance', icon: 'attendance' },
  { label: 'Leaderboard', href: '/leaderboard', icon: 'leaderboard' },
  { label: 'Payments', href: '/payments', icon: 'payments' },
  { label: 'Courses', href: '/courses', icon: 'courses' },
  { label: 'Study Material', href: '/materials', icon: 'materials', feature: 'studyMaterial' },
  { label: 'Notifications', href: '/notifications', icon: 'notifications' },
  { label: 'Complaints', href: '/complaints', icon: 'complaints', feature: 'complaints' },
  { label: 'Feedback', href: '/feedback', icon: 'feedback', feature: 'feedback' },
];

interface SidebarProps {
  role: 'admin' | 'student';
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ role, isOpen = false, onClose = () => {} }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const config = useInstitute();
  const { user, logout } = useAuth();
  const isBranchAdmin = user?.role === 'branch_admin';
  const navItems = role === 'admin' ? adminNavItems : studentNavItems;
  const [imgError, setImgError] = useState(false);

  // Reset image error state whenever the avatar URL changes
  useEffect(() => {
    setImgError(false);
  }, [user?.avatar_url]);

  const handleLogout = async () => {
    await logout();
    router.push(role === 'admin' ? '/admin/login' : '/login');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.feature && !config.features[item.feature]) {
      return false;
    }
    // Branch admins cannot manage branches or settings — hide those items
    if (isBranchAdmin && (item.href.startsWith('/admin/branches') || item.href.startsWith('/admin/settings'))) {
      return false;
    }
    return true;
  });

  const isStudent = role === 'student';

  // Notification badge count — shares the same React Query cache with Navbar
  const { data: notifBadgeCount = 0 } = useQuery({
    queryKey: isStudent
      ? studentQueryKeys.unreadCount()
      : [...adminQueryKeys.all, 'notifications-count'],
    queryFn: async () => {
      if (isStudent) {
        const r = await apiClient.get('/student/notifications/unread-count');
        const d = (r.data as any)?.success ? (r.data as any).data : r.data;
        return (d?.unreadCount ?? 0) as number;
      }
      if (typeof window === 'undefined') return 0;
      const since = localStorage.getItem(ADMIN_NOTIF_VIEWED_AT_KEY);
      if (!since) {
        localStorage.setItem(ADMIN_NOTIF_VIEWED_AT_KEY, new Date().toISOString());
        return 0;
      }
      const r = await apiClient.get(
        `/admin/notifications/count?since=${encodeURIComponent(since)}`
      );
      const d = (r.data as any)?.success ? (r.data as any).data : r.data;
      return (d?.count ?? 0) as number;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const getIcon = (icon: string) => {
    const icons: Record<string, JSX.Element> = {
      dashboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      students: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      courses: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      tests: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      results: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      materials: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      notifications: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      complaints: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      feedback: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      settings: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      profile: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      branches: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      attendance: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      payments: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      leaderboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      gallery: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    };
    return icons[icon] || icons.dashboard;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: 'var(--color-sidebar-bg)', color: 'var(--color-sidebar-text)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <Link href={role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center space-x-3">
              <Image
                src={config.logoUrl}
                alt={config.name}
                width={32}
                height={32}
                className="h-8 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-sm font-semibold leading-tight truncate">{config.name}</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
            <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Menu</p>
            <ul className="space-y-0.5 px-2">
              {filteredNavItems.map((item) => {
                const isActive =
                  item.href === (role === 'admin' ? '/admin' : '/dashboard')
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`relative flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                        isActive
                          ? 'text-white font-medium bg-white/10'
                          : 'text-white/65 hover:text-white hover:bg-white/8'
                      } dark:bg-slate-800`}
                      onClick={onClose}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                          style={{ backgroundColor: 'var(--color-primary-light)' }}
                        />
                      )}
                      {getIcon(item.icon)}
                      <span>{item.label}</span>
                      {item.icon === 'notifications' && notifBadgeCount > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                          {notifBadgeCount > 99 ? '99+' : notifBadgeCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User profile footer */}
          {user && (
            <div className="p-4 border-t border-white/10">
              <Link
                href={role === 'admin' ? '/admin/profile' : '/dashboard'}
                className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity"
                title="View profile"
                onClick={onClose}
              >
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                >
                  {user.avatar_url && !imgError ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name ?? 'Avatar'}
                      width={32}
                      height={32}
                      priority
                      className="object-cover w-full h-full"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    user.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-white/50 truncate capitalize">{user.role?.replace('_', ' ')}</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                aria-label="Logout"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}