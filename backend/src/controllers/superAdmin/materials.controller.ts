import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { getSignedDownloadUrl, isLegacySupabaseUrl } from '../../lib/fileService';
import { AuthRequest } from '../../types';

// Super Admin: read-only access to all materials across all branches
export const getAllMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, branchId, courseId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id, title, description, url, file_name, file_type, file_size, is_active,
        is_published, created_at, updated_at, course_id, branch_id,
        courses ( id, name ),
        branches ( id, name ),
        uploaded_by_admin:users!study_materials_uploaded_by_fkey ( id, name )
      `, { count: 'exact' });

    if (branchId) query = query.eq('branch_id', branchId as string);
    if (courseId) query = query.eq('course_id', courseId as string);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data: {
        materials: data,
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil((count || 0) / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Super admin get materials error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
};

// Super Admin: get signed URL for a specific material
export const getMaterialSignedUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: material, error } = await supabaseAdmin
      .from('study_materials')
      .select('url, title')
      .eq('id', id)
      .single();

    if (error || !material) {
      res.status(404).json({ success: false, error: 'Material not found' });
      return;
    }

    if (!material.url) {
      res.status(400).json({ success: false, error: 'Material has no file' });
      return;
    }

    let signedUrl: string;

    if (isLegacySupabaseUrl(material.url)) {
      const rawMatch = (material.url as string).match(/\/storage\/v1\/object\/(?:public|sign)\/materials\/(.+)$/);
      const filePath = rawMatch ? rawMatch[1].split('?')[0] : null;
      if (!filePath) {
        res.status(400).json({ success: false, error: 'Cannot parse legacy URL' });
        return;
      }
      const { data: sd, error: sdErr } = await supabaseAdmin.storage
        .from('materials')
        .createSignedUrl(filePath, 3600);
      if (sdErr || !sd?.signedUrl) {
        res.status(500).json({ success: false, error: 'Failed to generate signed URL' });
        return;
      }
      signedUrl = sd.signedUrl;
    } else {
      signedUrl = await getSignedDownloadUrl(material.url, 3600);
    }

    res.json({
      success: true,
      data: {
        signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        materialTitle: material.title,
      },
    });
  } catch (error) {
    console.error('Super admin get signed URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate signed URL' });
  }
};
