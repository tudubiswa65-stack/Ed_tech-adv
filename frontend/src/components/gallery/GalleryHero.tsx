'use client';

export interface GalleryHeroProps {
  title: string;
  subtitle: string;
  seasonTag?: string | null;
}

export default function GalleryHero({ title, subtitle, seasonTag }: GalleryHeroProps) {
  return (
    <>
      {/* Inline keyframe animations — avoids touching globals.css */}
      <style>{`
        @keyframes gallery-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .gallery-hero-title {
          animation: gallery-fade-up 0.6s ease-out 0ms both;
        }
        .gallery-hero-subtitle {
          animation: gallery-fade-up 0.6s ease-out 200ms both;
        }
        .gallery-hero-badge {
          animation: gallery-fade-up 0.6s ease-out 400ms both;
        }
      `}</style>

      <div className="text-center py-12 px-4">
        <h1 className="gallery-hero-title text-4xl font-extrabold text-white tracking-wide">
          🖼️ {title}
        </h1>
        <p className="gallery-hero-subtitle text-slate-300 text-lg mt-2">{subtitle}</p>
        {seasonTag && (
          <span className="gallery-hero-badge inline-block bg-violet-600 text-white px-3 py-1 rounded-full text-sm mt-3 font-semibold">
            {seasonTag}
          </span>
        )}
      </div>
    </>
  );
}
