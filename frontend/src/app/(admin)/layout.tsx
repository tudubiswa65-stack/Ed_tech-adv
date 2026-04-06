'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/profile': 'My Profile',
  '/admin/students': 'Student Management',
  '/admin/courses': 'Course Management',
  '/admin/tests': 'Tests & Exams',
  '/admin/results': 'Results & Analytics',
  '/admin/materials': 'Study Materials',
  '/admin/notifications': 'Notifications',
  '/admin/complaints': 'Complaints',
  '/admin/feedback': 'Feedback',
  '/admin/settings': 'Settings',
  '/admin/payments': 'Payments & Revenue',
  '/admin/branches': 'Branch Management',
  '/admin/attendance': 'Attendance Management',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleMobileLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const isLoginPage = pathname === '/admin/login';
  const adminRoles = ['admin', 'branch_admin'];

  useEffect(() => {
    if (!isLoginPage && !isLoading) {
      if (!user) {
        router.push('/admin/login');
      } else if (user.role === 'super_admin') {
        router.push('/super-admin');
      } else if (!adminRoles.includes(user.role)) {
        router.push('/');
      }
    }
  }, [user, isLoading, router, pathname, isLoginPage]);

  // Login page renders without the admin shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || !adminRoles.includes(user.role)) {
    return null;
  }

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith('/admin/results/') ? 'Result Details' : 'Admin Dashboard');

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0f1e' }}>
      {/* Sidebar — visible only on desktop (lg+) */}
      <div className="hidden lg:block shrink-0">
        <Sidebar role="admin" />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar visible on desktop only; mobile uses per-page headers + bottom nav */}
        <div className="hidden lg:block">
          <Navbar title={title} onMenuClick={() => {}} />
        </div>
        {/* Slim dark mobile header shown on pages other than the dashboard
            (the dashboard page renders its own custom mobile header) */}
        {pathname !== '/admin' && (
          <div
            className="lg:hidden flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: '#0d1527', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
              {title}
            </span>
            <button
              onClick={handleMobileLogout}
              aria-label="Logout"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 8,
                padding: '5px 8px',
                cursor: 'pointer',
                gap: 4,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
        {/* pb-16 prevents content from hiding behind the mobile bottom nav */}
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">{children}</main>
      </div>
      {/* Mobile bottom navigation — hidden on desktop */}
      <MobileBottomNav role={user.role as 'admin' | 'branch_admin'} />
    </div>
  );
}