'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

// Unauthenticated visitors are served the public landing page (edupro.html)
// via a beforeFiles rewrite in next.config.js and never reach this component.
// This component only runs when a client-side navigation hits "/" while the
// user is already authenticated, in which case we redirect them straight to
// their role-appropriate dashboard.
function HomeContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'super_admin') {
        router.push('/super-admin');
      } else if (user.role === 'admin' || user.role === 'branch_admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Show a spinner only while the auth state is being determined.
  // Once resolved, authenticated users are redirected above; unauthenticated
  // users return null (the beforeFiles rewrite in next.config.js should prevent
  // this path from being reached via a fresh browser request, but client-side
  // navigation edge cases may still land here).
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-800">
        <Spinner size="lg" />
      </div>
    );
  }

  return null;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-800">
        <Spinner size="lg" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
