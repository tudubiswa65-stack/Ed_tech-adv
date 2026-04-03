'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(6deg); }
          66% { transform: translateY(8px) rotate(-4deg); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(110px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
        }
        @keyframes pulse404 {
          0%, 100% { text-shadow: 0 0 20px #facc15, 0 0 60px #facc15, 0 0 100px #f59e0b; }
          50% { text-shadow: 0 0 40px #facc15, 0 0 100px #facc15, 0 0 160px #f59e0b; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes bgPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .star { animation: twinkle var(--dur, 3s) var(--delay, 0s) infinite ease-in-out; }
        .astronaut { animation: float 6s ease-in-out infinite; }
        .orbiter { animation: orbit 8s linear infinite; }
        .text-404 { animation: pulse404 2.5s ease-in-out infinite; }
        .slide-up { animation: slideUp 0.8s ease-out forwards; }
        .bounce-text { animation: bounce 2s ease-in-out infinite; }
        .shimmer-btn {
          background: linear-gradient(90deg, #facc15 0%, #fef08a 40%, #facc15 80%);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }
      `}</style>

      <div className="relative w-screen h-screen overflow-hidden bg-[#04060f] flex flex-col items-center justify-center text-white select-none">

        {/* ── Stars background ── */}
        {[
          { top: '8%',  left: '12%', size: 2, dur: '2.1s', delay: '0s'   },
          { top: '15%', left: '35%', size: 1, dur: '3.4s', delay: '0.7s' },
          { top: '5%',  left: '60%', size: 3, dur: '2.8s', delay: '0.3s' },
          { top: '22%', left: '80%', size: 2, dur: '4s',   delay: '1s'   },
          { top: '40%', left: '5%',  size: 2, dur: '3.1s', delay: '0.5s' },
          { top: '55%', left: '90%', size: 3, dur: '2.5s', delay: '1.2s' },
          { top: '70%', left: '20%', size: 1, dur: '3.9s', delay: '0.2s' },
          { top: '80%', left: '50%', size: 2, dur: '2.2s', delay: '0.9s' },
          { top: '90%', left: '75%', size: 3, dur: '3.6s', delay: '0.4s' },
          { top: '65%', left: '65%', size: 1, dur: '2.7s', delay: '1.5s' },
          { top: '30%', left: '48%', size: 2, dur: '4.2s', delay: '0.6s' },
          { top: '48%', left: '30%', size: 1, dur: '3.3s', delay: '1.1s' },
        ].map((s, i) => (
          <span
            key={i}
            className="star absolute rounded-full bg-white"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              ['--dur' as string]: s.dur,
              ['--delay' as string]: s.delay,
            }}
          />
        ))}

        {/* ── Glowing nebula blobs ── */}
        <div className="absolute w-72 h-72 rounded-full bg-indigo-900/30 blur-3xl top-10 left-10 pointer-events-none" style={{ animation: 'bgPulse 5s ease-in-out infinite' }} />
        <div className="absolute w-64 h-64 rounded-full bg-yellow-900/20 blur-3xl bottom-16 right-16 pointer-events-none" style={{ animation: 'bgPulse 4s ease-in-out infinite 1.5s' }} />

        {/* ── Orbiting planet / moon ── */}
        <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="orbiter w-5 h-5 rounded-full bg-gradient-to-br from-sky-300 to-blue-600 shadow-[0_0_12px_#38bdf8]" />
        </div>

        {/* ── Astronaut ── */}
        <div className="astronaut absolute top-[12%] right-[10%] text-5xl md:text-6xl pointer-events-none" aria-hidden="true">
          🧑‍🚀
        </div>

        {/* ── 404 ── */}
        <h1
          className="text-404 font-black tracking-tight text-yellow-400 leading-none z-10"
          style={{ fontSize: 'clamp(6rem, 20vw, 14rem)' }}
        >
          404
        </h1>

        {/* ── Main message ── */}
        <div className="slide-up z-10 text-center px-6 mt-2" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <h2
            className="font-bold text-white leading-tight"
            style={{ fontSize: 'clamp(1.25rem, 4vw, 2.5rem)' }}
          >
            We are still waiting&nbsp;
            <span className="text-yellow-400">when&nbsp;You&nbsp;Find&nbsp;Us</span>
          </h2>
        </div>

        {/* ── Sub-text ── */}
        <p
          className="slide-up z-10 mt-4 text-gray-400 text-center max-w-md px-6"
          style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', animationDelay: '0.3s', opacity: 0 }}
        >
          The page you&rsquo;re looking for has drifted into deep space.&nbsp;
          Let&rsquo;s get you back on course. 🚀
        </p>

        {/* ── Floating emoji row ── */}
        <div className="bounce-text z-10 mt-6 flex gap-4 text-3xl" aria-hidden="true">
          <span style={{ animationDelay: '0s'    }}>🌌</span>
          <span style={{ animationDelay: '0.4s'  }}>⭐</span>
          <span style={{ animationDelay: '0.8s'  }}>🌠</span>
        </div>

        {/* ── CTA buttons ── */}
        <div
          className="slide-up z-10 flex flex-wrap justify-center gap-3 mt-8"
          style={{ animationDelay: '0.5s', opacity: 0 }}
        >
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200"
          >
            ← Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="shimmer-btn px-6 py-2.5 rounded-xl font-bold text-sm text-black transition-all duration-200 hover:scale-105"
          >
            Go to Dashboard →
          </Link>
        </div>

      </div>
    </>
  );
}