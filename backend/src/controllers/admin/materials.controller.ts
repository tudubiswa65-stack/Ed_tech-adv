import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import multer from 'multer';
import { uploadFileToB2, getSignedDownloadUrl, deleteFileFromB2, isLegacySupabaseUrl } from '../../lib/fileService';
import { AuthRequest } from '../../types';
import { getUserBranchId } from '../../utils/branchFilter';

const ALLOWED_MATERIAL_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Multer instance for material file uploads (server-side only)
const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

export const materialUploadMiddleware = materialUpload.single('file');

// Upload a course material file to B2 and return its object key
export const uploadMaterialFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    if (!ALLOWED_MATERIAL_MIMES.has(req.file.mimetype)) {
      res.status(400).json({ error: 'Unsupported file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, and images.' });
      return;
    }

    if (req.file.size > MAX_FILE_SIZE) {
      res.status(400).json({ error: 'File size exceeds 50 MB limit.' });
      return;
    }

    const key = await uploadFileToB2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'materials'
    );

    res.status(201).json({ key, fileSize: req.file.size, fileName: req.file.originalname, fileType: req.file.mimetype });
  } catch (error) {
    console.error('Upload material file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Get all study materials — role-based access
export const getMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminBranchId = getUserBranchId(req.user);
    const { page = 1, limit = 20, courseId, branchId } = req.query;
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

    // Branch admin: restrict to own branch
    if (adminBranchId) {
      query = query.eq('branch_id', adminBranchId);
    }

    // Optional filters
    if (courseId) query = query.eq('course_id', courseId as string);
    if (branchId && !adminBranchId) query = query.eq('branch_id', branchId as string);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({
      materials: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

// Get single material + signed URL
export const getMaterialById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminBranchId = getUserBranchId(req.user);

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id, title, description, url, file_name, file_type, file_size, is_active,
        is_published, created_at, updated_at, course_id, branch_id,
        courses ( id, name ),
        branches ( id, name ),
        uploaded_by_admin:users!study_materials_uploaded_by_fkey ( id, name )
      `)
      .eq('id', id);

    if (adminBranchId) {
      query = query.eq('branch_id', adminBranchId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    let signedUrl: string | null = null;
    if (data.url) {
      try {
        if (isLegacySupabaseUrl(data.url)) {
          const rawMatch = (data.url as string).match(/\/storage\/v1\/object\/(?:public|sign)\/materials\/(.+)$/);
          const filePath = rawMatch ? rawMatch[1].split('?')[0] : null;
          if (filePath) {
            const { data: sd } = await supabaseAdmin.storage.from('materials').createSignedUrl(filePath, 3600);
            signedUrl = sd?.signedUrl ?? null;
          }
        } else {
          signedUrl = await getSignedDownloadUrl(data.url, 3600);
        }
      } catch {
        // signed URL generation failures are non-fatal
      }
    }

    res.json({ ...data, signedUrl, expiresAt: signedUrl ? new Date(Date.now() + 3600 * 1000).toISOString() : null });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

// Create new study material — Branch Admin only (super_admin/admin can view but this is upload)
export const createMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminBranchId = getUserBranchId(req.user);
    const adminId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { title, description, courseId, fileKey, fileName, fileType, fileSize } = req.body;

    if (!title || !courseId || !fileKey) {
      res.status(400).json({ error: 'Title, course, and file are required' });
      return;
    }

    // Determine branch_id: branch_admin uses own branch; super_admin/admin must provide it
    const branchId = adminBranchId ?? (req.body.branchId || null);

    // Verify the course belongs to this branch (for branch_admin)
    if (adminBranchId) {
      const { data: course, error: courseErr } = await supabaseAdmin
        .from('courses')
        .select('id, branch_id')
        .eq('id', courseId)
        .single();
      if (courseErr || !course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      if (course.branch_id && course.branch_id !== adminBranchId) {
        res.status(403).json({ error: 'You can only upload materials for your own branch courses' });
        return;
      }
    }

    // Fetch the course name for the notification message
    const { data: courseRow } = await supabaseAdmin
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .single();
    const courseName = courseRow?.name ?? 'the course';

    // Insert material
    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .insert({
        title,
        description: description || null,
        course_id: courseId,
        branch_id: branchId,
        url: fileKey,
        file_name: fileName || null,
        file_type: fileType || null,
        file_size: fileSize ? Number(fileSize) : null,
        uploaded_by: adminId,
        is_active: true,
        is_published: true,
        created_by: adminId,
        institute_id: instituteId || null,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Trigger notifications to enrolled students
    try {
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        // Insert one notification per enrolled student using per-student targeting
        const notifRows = enrollments.map((e: { user_id: string }) => ({
          title: 'New Study Material Available',
          message: `${title} has been added to ${courseName}.`,
          type: 'study_material',
          target_audience: 'student',
          target_id: e.user_id,
          action_url: `/materials?courseId=${courseId}`,
          branch_id: branchId,
          institute_id: instituteId || null,
          sent_at: new Date().toISOString(),
          created_by: adminId,
        }));
        await supabaseAdmin.from('notifications').insert(notifRows);
      }
    } catch (notifErr) {
      // Notification failures are non-fatal
      console.warn('[materials] Failed to send notifications:', notifErr);
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
};

interface MaterialUpdatePayload {
  title?: string;
  description?: string | null;
  is_active?: boolean;
  is_published?: boolean;
  updated_at: string;
}

// Update study material — Branch Admin only; title, description, is_active only
export const updateMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminBranchId = getUserBranchId(req.user);
    const { title, description, isActive, is_active } = req.body;

    const updateData: MaterialUpdatePayload = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    const activeValue = isActive !== undefined ? isActive : is_active;
    if (activeValue !== undefined) {
      updateData.is_active = activeValue;
      updateData.is_published = activeValue; // keep in sync
    }

    let query = supabaseAdmin
      .from('study_materials')
      .update(updateData)
      .eq('id', id);

    if (adminBranchId) {
      query = query.eq('branch_id', adminBranchId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

// Delete study material — Branch Admin (own branch) or super_admin
export const deleteMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminBranchId = getUserBranchId(req.user);

    // Fetch the material first to get its B2 key
    let fetchQuery = supabaseAdmin
      .from('study_materials')
      .select('id, url')
      .eq('id', id);

    if (adminBranchId) {
      fetchQuery = fetchQuery.eq('branch_id', adminBranchId);
    }

    const { data: material, error: fetchErr } = await fetchQuery.single();

    if (fetchErr || !material) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    // Delete from B2 first (non-fatal)
    if (material.url && !isLegacySupabaseUrl(material.url)) {
      await deleteFileFromB2(material.url);
    }

    // Delete the row
    const { error } = await supabaseAdmin
      .from('study_materials')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};

// Generate a signed URL for a material's file
export const getSignedMaterialUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminBranchId = getUserBranchId(req.user);

    let query = supabaseAdmin
      .from('study_materials')
      .select('url, title')
      .eq('id', id);

    if (adminBranchId) {
      query = query.eq('branch_id', adminBranchId);
    }

    const { data: material, error: fetchError } = await query.single();

    if (fetchError || !material) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    if (!material.url) {
      res.status(400).json({ error: 'Material has no file' });
      return;
    }

    let signedUrl: string;

    if (isLegacySupabaseUrl(material.url)) {
      const rawMatch = (material.url as string).match(/\/storage\/v1\/object\/(?:public|sign)\/materials\/(.+)$/);
      const filePath = rawMatch ? rawMatch[1].split('?')[0] : null;
      if (!filePath) {
        res.status(400).json({ error: 'Cannot parse legacy URL' });
        return;
      }
      const { data: sd, error: sdErr } = await supabaseAdmin.storage.from('materials').createSignedUrl(filePath, 3600);
      if (sdErr || !sd?.signedUrl) {
        res.status(500).json({ error: 'Failed to generate signed URL' });
        return;
      }
      signedUrl = sd.signedUrl;
    } else {
      signedUrl = await getSignedDownloadUrl(material.url, 3600);
    }

    res.json({
      signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      materialTitle: material.title,
    });
  } catch (error) {
    console.error('Get signed URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
};

// Toggle active/published status
export const togglePublish = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminBranchId = getUserBranchId(req.user);

    let fetchQ = supabaseAdmin.from('study_materials').select('is_active, is_published').eq('id', id);
    if (adminBranchId) fetchQ = fetchQ.eq('branch_id', adminBranchId);
    const { data: m, error: fe } = await fetchQ.single();

    if (fe || !m) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    const newActive = !(m.is_active ?? m.is_published);
    let updQ = supabaseAdmin
      .from('study_materials')
      .update({ is_active: newActive, is_published: newActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (adminBranchId) updQ = updQ.eq('branch_id', adminBranchId);
    const { data, error } = await updQ.select().single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
};

// Get materials by subject (legacy compatibility)
export const getMaterialsBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId } = req.params;
    const adminBranchId = getUserBranchId(req.user);

    let query = supabaseAdmin
      .from('study_materials')
      .select('id, title, url, file_size, is_active, is_published')
      .eq('subject_id', subjectId)
      .eq('is_published', true);

    if (adminBranchId) query = query.eq('branch_id', adminBranchId);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Get materials by subject error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};
