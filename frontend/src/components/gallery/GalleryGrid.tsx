'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

export interface SlotItem {
  id: string;
  title: string;
  thumbnail_url: string;
  medium_url: string;
  student_first_name: string;
  rank: number;
}

interface GalleryGridProps {
  slots: (SlotItem | null)[];
}

// ── Empty slot placeholder ───────────────────────────────────────────────────
function EmptySlot() {
  return (
    <div className="aspect-square rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
      <span className="text-3xl select-none" aria-hidden="true">🏆</span>
      <span className="text-xs text-slate-500 font-medium">Coming Soon</span>
    </div>
  );
}

// ── Filled slot card ─────────────────────────────────────────────────────────
function FilledSlot({ item, onOpen }: { item: SlotItem; onOpen: (item: SlotItem) => void }) {
  return (
    <button
      type="button"
      className="group relative aspect-square rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      onClick={() => onOpen(item)}
      aria-label={`Open ${item.title} by ${item.student_first_name}`}
    >
      <Image
        src={item.thumbnail_url}
        alt={item.title}
        fill
        sizes="300px"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
        <p className="text-white text-sm font-bold truncate">{item.student_first_name}</p>
        <span className="inline-block mt-0.5 bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full w-fit">
          Rank #{item.rank}
        </span>
      </div>
    </button>
  );
}

// ── Lightbox modal ───────────────────────────────────────────────────────────
function Lightbox({ item, onClose }: { item: SlotItem; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Lightbox: ${item.title}`}
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Medium image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.medium_url}
          alt={item.title}
          className="w-full object-contain max-h-[60vh]"
        />

        {/* Caption */}
        <div className="p-4">
          <h2 className="text-white font-bold text-lg">{item.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-300 text-sm">{item.student_first_name}</span>
            <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              Rank #{item.rank}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main GalleryGrid ─────────────────────────────────────────────────────────
export default function GalleryGrid({ slots }: GalleryGridProps) {
  const [activeSlot, setActiveSlot] = useState<SlotItem | null>(null);

  const handleOpen = useCallback((item: SlotItem) => {
    setActiveSlot(item);
  }, []);

  const handleClose = useCallback(() => {
    setActiveSlot(null);
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-4 pb-16">
        {slots.map((slot, idx) =>
          slot ? (
            <FilledSlot key={slot.id} item={slot} onOpen={handleOpen} />
          ) : (
            <EmptySlot key={`empty-${idx}`} />
          )
        )}
      </div>

      {activeSlot && <Lightbox item={activeSlot} onClose={handleClose} />}
    </>
  );
}
