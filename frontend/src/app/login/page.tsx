'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const LoginForm = dynamic(() => import('@/components/auth/LoginForm'), { ssr: false });

function LoginContent() {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-800">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 dark:bg-slate-800">
      <LoginForm role="student" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-800">
        <Spinner size="lg" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
