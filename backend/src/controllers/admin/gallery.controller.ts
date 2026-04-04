import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import { getUserBranchId } from '../../utils/branchFilter';
import { processAndWatermark } from '../../utils/imageProcessor';

const WATERMARK_TEXT = 'EduPro Platform';
const GALLERY_BUCKET = 'gallery';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  return value.slice(0, max);
}

// ── GET /api/admin/gallery/label ─────────────────────────────────────────────

export const getGalleryLabel = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gallery_label')
      .select('id, title, subtitle, season_tag, updated_at')
      .limit(1);

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : null;
    res.json({ success: true, data: row ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AdminGallery] getGalleryLabel error:', message);
    res.status(500).json({ success: false, error: 'Failed to fetch gallery label' });
  }
};

// ── PUT /api/admin/gallery/label ─────────────────────────────────────────────

export const updateGalleryLabel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, subtitle, season_tag } = req.body as Record<string, unknown>;

    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ success: false, error: 'title is required and must be a string' });
      return;
    }
    if (typeof subtitle !== 'string' || subtitle.trim().length === 0) {
      res.status(400).json({ success: false, error: 'subtitle is required and must be a string' });
      return;
    }
    if (title.length > 100) {
      res.status(400).json({ success: false, error: 'title must be 100 characters or fewer' });
      return;
    }
    if (subtitle.length > 100) {
      res.status(400).json({ success: false, error: 'subtitle must be 100 characters or fewer' });
      return;
    }
    if (season_tag !== undefined && season_tag !== null && typeof season_tag !== 'string') {
      res.status(400).json({ success: false, error: 'season_tag must be a string or null' });
      return;
    }
    if (typeof season_tag === 'string' && season_tag.length > 50) {
      res.status(400).json({ success: false, error: 'season_tag must be 50 characters or fewer' });
      return;
    }

    // Upsert: update the single existing row, or insert one if the table is empty.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('gallery_label')
      .select('id')
      .limit(1);

    if (fetchError) throw fetchError;

    const existingRow = Array.isArray(existing) ? existing[0] : null;
    const normalizedTag = season_tag === '' ? null : (truncate(season_tag, 50) ?? null);

    if (existingRow?.id) {
      const { error: updateError } = await supabaseAdmin
        .from('gallery_label')
        .update({
          title: title.trim(),
          subtitle: subtitle.trim(),
          season_tag: normalizedTag,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRow.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAdmin.from('gallery_label').insert({
        title: title.trim(),
        subtitle: subtitle.trim(),
        season_tag: normalizedTag,
        updated_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
    }

    res.json({ success: true, data: { title: title.trim(), subtitle: subtitle.trim(), season_tag: normalizedTag } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AdminGallery] updateGalleryLabel error:', message);
    res.status(500).json({ success: false, error: 'Failed to update gallery label' });
  }
};

// ── GET /api/admin/gallery/submissions ───────────────────────────────────────

export const listGallerySubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status = 'all' } = req.query as { status?: string };
    const branchId = getUserBranchId(req.user);

    let query = supabaseAdmin
      .from('gallery_submissions')
      .select(
        'id, title, description, thumbnail_url, medium_url, status, is_pinned, slot_order, submitted_at, approved_at, student_id, users(name, branch_id)'
      )
      .order('submitted_at', { ascending: false });

    if (status !== 'all' && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Apply branch filtering in memory (branch_admin sees only their branch's students)
    let rows = (data ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      thumbnail_url: string;
      medium_url: string;
      status: string;
      is_pinned: boolean;
      slot_order: number | null;
      submitted_at: string;
      approved_at: string | null;
      student_id: string;
      users: { name: string; branch_id: string | null } | null;
    }>;

    if (branchId) {
      rows = rows.filter((r) => r.users?.branch_id === branchId);
    }

    const submissions = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      thumbnail_url: r.thumbnail_url,
      status: r.status,
      is_pinned: r.is_pinned,
      slot_order: r.slot_order,
      submitted_at: r.submitted_at,
      approved_at: r.approved_at,
      student_first_name: r.users?.name?.split(' ')[0] ?? 'Unknown',
    }));

    res.json({ success: true, data: submissions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AdminGallery] listGallerySubmissions error:', message);
    res.status(500).json({ success: false, error: 'Failed to list gallery submissions' });
  }
};

// ── POST /api/admin/gallery/submissions ──────────────────────────────────────

export const uploadGallerySubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // ── Validate file ──────────────────────────────────────────────────────
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Image file is required' });
      return;
    }
    if (!ALLOWED_MIMETYPES.has(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: 'Only JPEG, PNG, and WebP images are accepted',
      });
      return;
    }
    if (req.file.size > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({ success: false, error: 'Image must be 10 MB or smaller' });
      return;
    }

    // ── Validate body ──────────────────────────────────────────────────────
    const { student_id, title, description } = req.body as Record<string, unknown>;

    if (typeof student_id !== 'string' || student_id.trim().length === 0) {
      res.status(400).json({ success: false, error: 'student_id is required' });
      return;
    }
    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ success: false, error: 'title is required' });
      return;
    }

    const fileId = uuidv4();
    const originalBuffer = req.file.buffer;

    // ── Process images ─────────────────────────────────────────────────────
    const [thumbnailBuffer, mediumBuffer] = await Promise.all([
      processAndWatermark(originalBuffer, 300, 300, WATERMARK_TEXT),
      processAndWatermark(originalBuffer, 800, 600, WATERMARK_TEXT),
    ]);

    // ── Upload to Supabase storage ─────────────────────────────────────────
    const thumbnailPath = `thumbnails/${fileId}.webp`;
    const mediumPath = `mediums/${fileId}.webp`;

    const [thumbUpload, mediumUpload] = await Promise.all([
      supabaseAdmin.storage
        .from(GALLERY_BUCKET)
        .upload(thumbnailPath, thumbnailBuffer, { contentType: 'image/webp', upsert: false }),
      supabaseAdmin.storage
        .from(GALLERY_BUCKET)
        .upload(mediumPath, mediumBuffer, { contentType: 'image/webp', upsert: false }),
    ]);

    if (thumbUpload.error) throw thumbUpload.error;
    if (mediumUpload.error) throw mediumUpload.error;

    const { data: thumbPublic } = supabaseAdmin.storage
      .from(GALLERY_BUCKET)
      .getPublicUrl(thumbnailPath);
    const { data: mediumPublic } = supabaseAdmin.storage
      .from(GALLERY_BUCKET)
      .getPublicUrl(mediumPath);

    // ── Insert DB record ───────────────────────────────────────────────────
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('gallery_submissions')
      .insert({
        student_id: student_id.trim(),
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
        thumbnail_url: thumbPublic.publicUrl,
        medium_url: mediumPublic.publicUrl,
        status: 'approved',
        approved_by: req.user?.id ?? null,
        approved_at: new Date().toISOString(),
      })
      .select('id, title, status, submitted_at')
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ success: true, data: inserted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AdminGallery] uploadGallerySubmission error:', message);
    res.status(500).json({ success: false, error: 'Failed to upload gallery submission' });
  }
};

// ── PATCH /api/admin/gallery/submissions/:id ──────────────────────────────────

export const updateGallerySubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if ('status' in body) {
      if (body.status !== 'approved' && body.status !== 'rejected') {
        res.status(400).json({ success: false, error: "status must be 'approved' or 'rejected'" });
        return;
      }
      updates.status = body.status;
      if (body.status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = req.user?.id ?? null;
      }
    }

    if ('is_pinned' in body) {
      if (typeof body.is_pinned !== 'boolean') {
        res.status(400).json({ success: false, error: 'is_pinned must be a boolean' });
        return;
      }
      updates.is_pinned = body.is_pinned;
    }

    if ('slot_order' in body) {
      if (body.slot_order !== null && typeof body.slot_order !== 'number') {
        res.status(400).json({ success: false, error: 'slot_order must be a number or null' });
        return;
      }
      updates.slot_order = body.slot_order;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields provided for update' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('gallery_submissions')
      .update(updates)
      .eq('id', id)
      .select('id, title, status, is_pinned, slot_order')
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AdminGallery] updateGallerySubmission error:', message);
    res.status(500).json({ success: false, error: 'Failed to update gallery submission' });
  }
};

// ── DELETE /api/admin/gallery/submissions/:id ─────────────────────────────────

export const deleteGallerySubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Fetch paths before deleting so we can clean up storage
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('gallery_submissions')
      .select('thumbnail_url, medium_url')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!row) {
      res.status(404).json({ success: false, error: 'Submission not found' });
      return;
    }

    // Delete DB record first
    const { error: deleteError } = await supabaseAdmin
      .from('gallery_submissions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Best-effort storage cleanup — failures are logged but do not fail the request
    try {
      const extractPath = (url: string): string | null => {
        try {
          const u = new URL(url);
          // Supabase public URL format: /storage/v1/object/public/<bucket>/<path>
          const match = u.pathname.match(/\/storage\/v1\/object\/public\/gallery\/(.+)$/);
          return match ? match[1] : null;
        } catch {
          return null;
        }
      };

      const thumbPath = extractPath(row.thumbnail_url);
      const mediumPath = extractPath(row.medium_url);
      const paths = [thumbPath, mediumPath].filter((p): p is string => p !== null);

      if (paths.length > 0) {
        await supabaseAdmin.storage.from(GALLERY_BUCKET).remove(paths);
      }
    } catch (storageErr) {
      console.warn('[AdminGallery] Storage cleanup failed for submission', id, storageErr);
    }

    res.json({ success: true, data: { id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AdminGallery] deleteGallerySubmission error:', message);
    res.status(500).json({ success: false, error: 'Failed to delete gallery submission' });
  }
};
