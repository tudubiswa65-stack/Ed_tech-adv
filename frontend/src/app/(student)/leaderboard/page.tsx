'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentLeaderboard } from '@/hooks/queries/useStudentQueries';

interface LeaderboardEntry {
  id?: string;
  student_id: string;
  student_name: string;
  branch_name?: string;
  avatar_url?: string | null;
  total_score: number;
  rank: number;
}

const RANK_STYLES = {
  1: {
    border: 'border-yellow-400',
    glow: 'shadow-[0_0_14px_4px_rgba(234,179,8,0.45)]',
    text: 'text-yellow-400',
    platform: 'bg-gradient-to-b from-yellow-500 to-yellow-700',
    badge: 'bg-yellow-500',
    podiumH: 'h-20',
  },
  2: {
    border: 'border-slate-300',
    glow: 'shadow-[0_0_14px_4px_rgba(203,213,225,0.35)]',
    text: 'text-slate-300',
    platform: 'bg-gradient-to-b from-slate-400 to-slate-600',
    badge: 'bg-slate-400',
    podiumH: 'h-14',
  },
  3: {
    border: 'border-orange-400',
    glow: 'shadow-[0_0_14px_4px_rgba(251,146,60,0.35)]',
    text: 'text-orange-400',
    platform: 'bg-gradient-to-b from-orange-500 to-orange-700',
    badge: 'bg-orange-500',
    podiumH: 'h-10',
  },
} as const;

const CROWN = { 1: '👑', 2: '🥈', 3: '🥉' } as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function levelFromScore(score: number): number {
  return Math.floor(score / 200) + 1;
}

function PlayerAvatar({
  name,
  avatarUrl,
  className = '',
  sizes = '64px',
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  sizes?: string;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  return (
    <div
      className={`rounded-full bg-indigo-700 flex items-center justify-center font-bold text-white flex-shrink-0 overflow-hidden relative ${className}`}
    >
      {avatarUrl && !imgError ? (
        <Image
          src={avatarUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={sizes}
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const rank = entry.rank as 1 | 2 | 3;
  const s = RANK_STYLES[rank];
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl mb-1 leading-none">{CROWN[rank]}</span>

      <PlayerAvatar
        name={entry.student_name}
        avatarUrl={entry.avatar_url}
        className={`w-16 h-16 border-4 ${s.border} ${s.glow} bg-indigo-800 text-lg`}
        sizes="64px"
      />

      <div
        className={`mt-2 w-7 h-7 rounded-full ${s.badge} flex items-center justify-center text-white text-xs font-bold`}
      >
        {rank}
      </div>

      <p className="text-white font-bold text-sm mt-1 text-center w-20 truncate">
        {entry.student_name}
      </p>
      <p className={`${s.text} text-xs font-semibold mt-0.5`}>
        {entry.total_score.toLocaleString()} pts
      </p>

      <div className={`${s.platform} ${s.podiumH} w-20 mt-3 rounded-t-xl flex items-start justify-center pt-1`}>
        <span className="text-white/80 font-bold text-base">{rank}</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();

  // React Query hook — leaderboard cached 2 min
  const { data: leaderboard = [], isLoading: loading } = useStudentLeaderboard();

  const top3 = leaderboard
    .filter((e) => e.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  const rest = leaderboard.filter((e) => e.rank > 3);

  // Podium display order: 2nd (left), 1st (centre, tallest), 3rd (right)
  const podiumOrder = [2, 1, 3]
    .map((r) => top3.find((e) => e.rank === r))
    .filter(Boolean) as LeaderboardEntry[];

  const currentUserEntry = user
    ? leaderboard.find((e) => e.student_id === user.id)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e2e] via-[#0c1035] to-[#0d1340] pb-28">
      {/* Header */}
      <div className="text-center pt-8 pb-2">
        <h1 className="text-2xl font-bold text-white tracking-wide">🏆 Leaderboard</h1>
        <p className="text-slate-400 text-sm mt-1">Top performers this season</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <p className="text-center text-slate-400 py-24">No rankings available yet</p>
      ) : (
        <>
          {/* Podium */}
          {podiumOrder.length > 0 && (
            <div className="flex flex-row items-end justify-center gap-3 sm:gap-6 px-4 py-6">
              {podiumOrder.map((entry) => (
                <PodiumCard key={entry.student_id} entry={entry} />
              ))}
            </div>
          )}

          {/* Ranks 4+ */}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2 px-4 mt-2">
              {rest.map((entry) => (
                <div
                  key={entry.student_id}
                  className="flex items-center gap-3 bg-[#131740] rounded-2xl px-4 py-3 border border-white/5"
                >
                  <span className="text-sm text-gray-400 font-bold w-6 text-center shrink-0">
                    {entry.rank}
                  </span>

                  <PlayerAvatar
                    name={entry.student_name}
                    avatarUrl={entry.avatar_url}
                    className="w-10 h-10 text-sm"
                    sizes="40px"
                  />

                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-white font-bold text-sm truncate">
                      {entry.student_name}
                    </span>
                    <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-semibold shrink-0">
                      LVL {levelFromScore(entry.total_score)}
                    </span>
                  </div>

                  <span className="text-white text-xs font-bold uppercase tracking-wide shrink-0">
                    SCORE: {entry.total_score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sticky current-user bar */}
      {currentUserEntry && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1a1f52]/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 flex items-center gap-3 z-50">
          <PlayerAvatar
            name={currentUserEntry.student_name}
            avatarUrl={currentUserEntry.avatar_url}
            className="w-10 h-10 text-sm ring-2 ring-indigo-400"
            sizes="40px"
          />
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold leading-none mb-0.5">
              YOUR RANK: #{currentUserEntry.rank}
            </p>
            <p className="text-white font-bold text-sm truncate">
              {currentUserEntry.student_name}
            </p>
          </div>
          <span className="text-white text-xs font-bold uppercase tracking-wide shrink-0">
            {currentUserEntry.total_score.toLocaleString()} pts
          </span>
        </div>
      )}
    </div>
  );
}
