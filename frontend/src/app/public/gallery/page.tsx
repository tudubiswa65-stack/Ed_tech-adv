// ISR: regenerate this page at most once every 30 minutes
export const revalidate = 1800;

import GalleryHero from '@/components/gallery/GalleryHero';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import type { SlotItem } from '@/components/gallery/GalleryGrid';

interface GalleryLabel {
  title: string;
  subtitle: string;
  season_tag: string | null;
}

interface GalleryData {
  label: GalleryLabel;
  slots: (SlotItem | null)[];
}

async function fetchGalleryData(): Promise<GalleryData> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${backendUrl}/api/public/gallery`, {
      // next.js fetch cache — honour the revalidate export
      next: { revalidate: 1800 },
    });
    if (!res.ok) {
      console.error(`[PublicGallery] API returned ${res.status}`);
      return defaultData();
    }
    const json = await res.json();
    if (!json.success || !json.data) return defaultData();
    return json.data as GalleryData;
  } catch (err) {
    console.error('[PublicGallery] Failed to fetch gallery data:', err);
    return defaultData();
  }
}

function defaultData(): GalleryData {
  return {
    label: {
      title: 'Hall of Fame',
      subtitle: 'Celebrating our brightest students',
      season_tag: null,
    },
    slots: Array(12).fill(null) as null[],
  };
}

export default async function PublicGalleryPage() {
  const data = await fetchGalleryData();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e2e] via-[#0c1035] to-[#0d1340]">
      <GalleryHero
        title={data.label.title}
        subtitle={data.label.subtitle}
        seasonTag={data.label.season_tag}
      />
      <GalleryGrid slots={data.slots} />
    </div>
  );
}
