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
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
    <div className="min-h-screen flex bg-gray-50/80 dark:bg-slate-900">
      {/* Sidebar — visible only on desktop (lg+) */}
      <div className="hidden lg:block shrink-0">
        <Sidebar role="admin" />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} onMenuClick={() => {}} />
        {/* pb-16 prevents content from hiding behind the mobile bottom nav */}
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">{children}</main>
      </div>
      {/* Mobile bottom navigation — hidden on desktop */}
      <MobileBottomNav role={user.role as 'admin' | 'branch_admin'} />
    </div>
  );
}