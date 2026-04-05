import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

const GALLERY_SLOTS = 12;

/** Validates a URL is an HTTPS URL — prevents mixed-content and SSRF leakage. */
function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

interface GalleryLabelRow {
  title: string;
  subtitle: string;
  season_tag: string | null;
}

interface SubmissionRow {
  id: string;
  title: string;
  thumbnail_url: string;
  medium_url: string;
  is_pinned: boolean;
  slot_order: number | null;
  approved_at: string | null;
  student_id: string;
  users: { name: string } | null;
}

interface ResultRow {
  student_id: string;
  score: number | null;
}

export interface SlotItem {
  id: string;
  title: string;
  thumbnail_url: string;
  medium_url: string;
  student_first_name: string;
  rank: number;
}

/**
 * GET /api/public/gallery
 *
 * Returns up to 12 approved gallery submissions plus the gallery label.
 * Pinned items come first (by slot_order), then ranked by total score,
 * then by approved_at descending. Result is padded to exactly 12 slots
 * with null for empty positions.
 *
 * Sensitive fields (student_id, email, internal paths) are NEVER exposed.
 * thumbnail_url and medium_url are validated to be HTTPS before serving.
 * Cache-Control header signals 30-min public caching with stale-while-revalidate.
 */
export const getPublicGallery = async (_req: Request, res: Response): Promise<void> => {
  try {
    // ── 1. Fetch gallery label ────────────────────────────────────────────
    const { data: labelRows, error: labelError } = await supabaseAdmin
      .from('gallery_label')
      .select('title, subtitle, season_tag')
      .limit(1);

    if (labelError) throw labelError;

    const labelRow = (labelRows as GalleryLabelRow[] | null)?.[0];
    const label: GalleryLabelRow = labelRow ?? {
      title: 'Hall of Fame',
      subtitle: 'Celebrating our brightest students',
      season_tag: null,
    };

    // ── 2. Fetch approved submissions joined with users ───────────────────
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('gallery_submissions')
      .select(
        'id, title, thumbnail_url, medium_url, is_pinned, slot_order, approved_at, student_id, users(name)'
      )
      .eq('status', 'approved');

    if (submissionsError) throw submissionsError;

    const typedSubmissions = (submissions ?? []) as SubmissionRow[];

    if (typedSubmissions.length === 0) {
      res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=60');
      res.json({
        success: true,
        data: {
          label: { title: label.title, subtitle: label.subtitle, season_tag: label.season_tag },
          slots: Array(GALLERY_SLOTS).fill(null) as null[],
        },
      });
      return;
    }

    // ── 3. Compute ranks via results aggregation ──────────────────────────
    const studentIds = typedSubmissions.map((s) => s.student_id);

    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select('student_id, score')
      .in('student_id', studentIds);

    if (resultsError) throw resultsError;

    const scoreMap: Record<string, number> = {};
    ((results ?? []) as ResultRow[]).forEach((r) => {
      scoreMap[r.student_id] = (scoreMap[r.student_id] ?? 0) + (r.score ?? 0);
    });

    // Build a sorted rank list (descending score → ascending rank number)
    const uniqueStudentIds = [...new Set(studentIds)];
    const ranked = uniqueStudentIds
      .map((id) => ({ id, score: scoreMap[id] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    const rankMap: Record<string, number> = {};
    ranked.forEach((entry, idx) => {
      rankMap[entry.id] = idx + 1;
    });

    // ── 4. Sort: pinned by slot_order first, then by rank, then approved_at ─
    const sorted = typedSubmissions.sort((a, b) => {
      // Pinned items come first
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      // Both pinned: lower slot_order wins
      if (a.is_pinned && b.is_pinned) {
        const aOrder = a.slot_order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.slot_order ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
      }
      // By rank (ascending rank number = higher score)
      const rankDiff = (rankMap[a.student_id] ?? 999) - (rankMap[b.student_id] ?? 999);
      if (rankDiff !== 0) return rankDiff;
      // Tiebreak: more recently approved first
      return (b.approved_at ?? '').localeCompare(a.approved_at ?? '');
    });

    // ── 5. Take up to 12, build SlotItem array, pad to exactly 12 ─────────
    const topItems = sorted.slice(0, GALLERY_SLOTS);

    const slotItems: (SlotItem | null)[] = topItems.map((s) => {
      const thumbnailUrl = isHttpsUrl(s.thumbnail_url) ? s.thumbnail_url : null;
      const mediumUrl = isHttpsUrl(s.medium_url) ? s.medium_url : null;

      if (!thumbnailUrl || !mediumUrl) return null;

      const rawName = s.users?.name ?? 'Student';
      const firstName = rawName.split(' ')[0] ?? rawName;

      return {
        id: s.id,
        title: s.title,
        thumbnail_url: thumbnailUrl,
        medium_url: mediumUrl,
        student_first_name: firstName,
        rank: rankMap[s.student_id] ?? 0,
      };
    });

    // Pad to exactly GALLERY_SLOTS with nulls
    while (slotItems.length < GALLERY_SLOTS) {
      slotItems.push(null);
    }

    // ── 6. Set cache headers and respond ──────────────────────────────────
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=60');
    res.json({
      success: true,
      data: {
        label: { title: label.title, subtitle: label.subtitle, season_tag: label.season_tag },
        slots: slotItems,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[PublicGallery] Error fetching gallery:', message);
    res.status(500).json({ success: false, error: 'Failed to load gallery' });
  }
};
