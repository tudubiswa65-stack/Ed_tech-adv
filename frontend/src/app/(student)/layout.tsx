'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const STATIC_TITLES: Record<string, string> = {
  '/dashboard': 'My Profile',
  '/tests': 'My Tests',
  '/courses': 'Courses',
  '/materials': 'Study Materials',
  '/notifications': 'Notifications',
  '/complaints': 'Complaints',
  '/feedback': 'Feedback',
  '/results': 'My Results',
};

function getPageTitle(pathname: string): string {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];
  if (pathname.match(/^\/tests\/[^/]+\/take$/)) return 'Take Test';
  if (pathname.match(/^\/tests\/[^/]+$/)) return 'Test Details';
  if (pathname.match(/^\/results\/[^/]+$/)) return 'Result Details';
  return 'Student Dashboard';
}

export default function StudentRootLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const studentRoles = ['student'];

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (!studentRoles.includes(user.role)) {
        if (user.role === 'super_admin') {
          router.push('/super-admin');
        } else {
          router.push('/admin');
        }
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || !studentRoles.includes(user.role)) {
    return null;
  }

  const title = getPageTitle(pathname);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
      {/* Sidebar — visible only on desktop (lg+) */}
      <div className="hidden lg:block shrink-0">
        <Sidebar role="student" />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} onMenuClick={() => {}} />
        {/* pb-16 prevents content from hiding behind the mobile bottom nav */}
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">{children}</main>
      </div>
      {/* Mobile bottom navigation — hidden on desktop */}
      <MobileBottomNav role="student" />
    </div>
  );
}