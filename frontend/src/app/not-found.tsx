'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start p-8 dark:bg-slate-800">
      <div className="text-center max-w-md mb-8">
        <div className="mb-8">
          <div className="relative">
            <span className="text-[180px] font-bold text-gray-100 dark:text-slate-700">404</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="h-32 w-32 text-primary-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-slate-100">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-4 dark:text-slate-300">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          While you wait, play a game! 🎮
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>

      <div className="w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-600">
        <iframe
          src="/pun-shooter.html"
          title="PUN SHOOTER: Word Attack! — Play while you wait"
          className="w-full"
          style={{ height: '85vh', minHeight: '500px', border: 'none' }}
          allow="autoplay"
        />
      </div>
    </div>
  );
}