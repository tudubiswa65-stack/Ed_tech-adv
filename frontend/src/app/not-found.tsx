'use client';

import Link from 'next/link';

export default function NotFound() {
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
          <span className="text-2xl font-bold text-yellow-400 shrink-0">404</span>
          <span className="text-sm text-gray-300 truncate">
            Page not found — shoot some words while you&apos;re here! 🎮
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-xs font-semibold bg-yellow-400 text-black hover:bg-yellow-300 rounded-lg transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}