'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen shooter game */}
      <iframe
        src="/pun-shooter.html"
        title="PUN SHOOTER: Word Attack! — Play while you wait"
        className="absolute inset-0 w-full h-full border-none"
        allow="autoplay"
      />

      {/* Compact overlay banner at the top */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-4 px-4 py-2 bg-black/60 backdrop-blur-sm text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl font-bold text-red-400 shrink-0">500</span>
          <span className="text-sm text-gray-300 truncate hidden sm:block">
            Something went wrong — blast through it with a game! 🎮
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-semibold bg-red-400 text-black hover:bg-red-300 rounded-lg transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}