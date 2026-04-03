'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', width: '100vw', height: '100vh', position: 'relative' }}>
        {/* Full-screen shooter game */}
        <iframe
          src="/pun-shooter.html"
          title="PUN SHOOTER: Word Attack! — Play while you wait"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay"
        />

        {/* Compact overlay banner at the top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          padding: '0.5rem 1rem',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', flexShrink: 0 }}>Critical Error</span>
            <span style={{ fontSize: '0.875rem', color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Something went critically wrong — take it out on some words! 🎮
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={reset}
              style={{
                padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none',
                borderRadius: '0.5rem', cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                background: '#f87171', color: '#000', borderRadius: '0.5rem',
                textDecoration: 'none',
              }}
            >
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}