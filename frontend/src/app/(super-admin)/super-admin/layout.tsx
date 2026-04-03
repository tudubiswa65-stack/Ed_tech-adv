'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

const pageTitles: Record<string, string> = {
  '/super-admin': 'Dashboard',
  '/super-admin/branches': 'Branch Management',
  '/super-admin/payments': 'Payments & Revenue',
  '/super-admin/courses': 'Course Management',
  '/super-admin/tests': 'Tests',
  '/super-admin/students': 'Student Management',
  '/super-admin/notifications': 'Notifications',
  '/super-admin/complaints': 'Complaints',
  '/super-admin/feedback': 'Feedback',
  '/super-admin/settings': 'Global Settings',
  '/super-admin/audit-logs': 'Audit Logs',
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/admin/login');
      } else if (user.role !== 'super_admin') {
        router.push('/unauthorized');
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

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const title = pageTitles[pathname] ?? 'Super Admin Dashboard';
  const isDashboard = pathname === '/super-admin';

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      {/* Sidebar — visible only on desktop (lg+) */}
      <div className="hidden lg:block shrink-0">
        <SuperAdminSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {/* On mobile the dashboard page renders its own header; hide Navbar there */}
        <div className={isDashboard ? 'hidden lg:block' : ''}>
          <Navbar title={title} onMenuClick={() => {}} />
        </div>
        {/* Dashboard page controls its own mobile padding; other pages keep p-6 */}
        <main className={`flex-1 overflow-auto pb-16 lg:pb-6 ${isDashboard ? 'p-0 lg:p-6' : 'p-6'}`}>
          {children}
        </main>
      </div>
      {/* Mobile bottom navigation — hidden on desktop */}
      <MobileBottomNav role="super_admin" />
    </div>
  );
}
