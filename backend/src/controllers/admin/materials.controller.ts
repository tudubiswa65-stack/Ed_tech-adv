import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all study materials with filtering
export const getMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const {
      page = 1,
      limit = 20,
      subjectId,
      courseId,
      type,
      search
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        is_published,
        created_at,
        updated_at,
        subjects (
          id,
          name,
          modules (
            id,
            name,
            courses (
              id,
              name
            )
          )
        ),
        created_by_admin (
          id,
          name
        )
      `, { count: 'exact' });

    // Only filter by institute_id when available (single-tenant setups omit it)
    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    // Apply filters
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      materials: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

// Get material by ID
export const getMaterialById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    let materialQuery = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        content,
        is_published,
        created_at,
        updated_at,
        subject_id,
        subjects (
          id,
          name,
          modules (
            id,
            name,
            courses (
              id,
              name
            )
          )
        ),
        created_by_admin (
          id,
          name
        )
      `)
      .eq('id', id);
    if (instituteId) {
      materialQuery = materialQuery.eq('institute_id', instituteId);
    }
    const { data, error } = await materialQuery.single();

    if (error) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

// Create new study material
export const createMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const adminId = req.user?.id;
    const {
      title,
      description,
      type,
      subjectId,
      url,
      fileUrl,
      fileSize,
      content,
      isPublished = false
    } = req.body;

    if (!title || !subjectId || !type) {
      return res.status(400).json({ error: 'Title, subject, and type are required' });
    }

    // Support both url and fileUrl field names
    const fileUrlValue = url || fileUrl;

    // Resolve course_id from the subject → module → course chain so that
    // material_count on the courses page stays accurate and student RLS works.
    let courseId: string | null = null;
    const { data: subjectRow } = await supabaseAdmin
      .from('subjects')
      .select('module_id, modules(course_id)')
      .eq('id', subjectId)
      .single();
    if (subjectRow?.modules) {
      const mod = subjectRow.modules as { course_id?: string } | null;
      courseId = mod?.course_id ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .insert({
        institute_id: instituteId || null,
        title,
        description,
        type,
        subject_id: subjectId,
        course_id: courseId,
        url: fileUrlValue,
        file_size: fileSize,
        content,
        is_published: isPublished,
        created_by: adminId
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      institute_id: instituteId,
      user_id: adminId,
      user_type: 'admin',
      action: 'create_material',
      details: { material_id: data.id, title }
    });

    res.status(201).json(data);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
};

// Update study material
export const updateMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;
    const {
      title,
      description,
      type,
      subjectId,
      url,
      fileUrl,
      fileSize,
      content,
      isPublished
    } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (subjectId !== undefined) updateData.subject_id = subjectId;
    // Support both url and fileUrl field names
    const fileUrlValue = url !== undefined ? url : fileUrl;
    if (fileUrlValue !== undefined) updateData.url = fileUrlValue;
    if (fileSize !== undefined) updateData.file_size = fileSize;
    if (content !== undefined) updateData.content = content;
    if (isPublished !== undefined) updateData.is_published = isPublished;

    let updateQuery = supabaseAdmin
      .from('study_materials')
      .update(updateData)
      .eq('id', id);
    if (instituteId) {
      updateQuery = updateQuery.eq('institute_id', instituteId);
    }
    const { data, error } = await updateQuery.select().single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

// Delete study material
export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    let deleteQuery = supabaseAdmin
      .from('study_materials')
      .delete()
      .eq('id', id);
    if (instituteId) {
      deleteQuery = deleteQuery.eq('institute_id', instituteId);
    }
    const { error } = await deleteQuery;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};

// Toggle publish status
export const togglePublish = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    // Get current status
    let fetchQuery = supabaseAdmin
      .from('study_materials')
      .select('is_published')
      .eq('id', id);
    if (instituteId) {
      fetchQuery = fetchQuery.eq('institute_id', instituteId);
    }
    const { data: material, error: fetchError } = await fetchQuery.single();

    if (fetchError || !material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Toggle status
    let toggleQuery = supabaseAdmin
      .from('study_materials')
      .update({ is_published: !material.is_published, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (instituteId) {
      toggleQuery = toggleQuery.eq('institute_id', instituteId);
    }
    const { data, error } = await toggleQuery.select().single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ error: 'Failed to toggle publish status' });
  }
};

// Get materials by subject
export const getMaterialsBySubject = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    const instituteId = req.user?.instituteId;

    let subjectQuery = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        type,
        url,
        file_size,
        is_published
      `)
      .eq('subject_id', subjectId)
      .eq('is_published', true);
    if (instituteId) {
      subjectQuery = subjectQuery.eq('institute_id', instituteId);
    }
    subjectQuery = subjectQuery.order('created_at', { ascending: false });
    const { data, error } = await subjectQuery;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get materials by subject error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

// Generate a signed URL for a material's file
export const getSignedMaterialUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    // Get the material to find its URL
    let materialQuery = supabaseAdmin
      .from('study_materials')
      .select('url, title')
      .eq('id', id);
    if (instituteId) {
      materialQuery = materialQuery.eq('institute_id', instituteId);
    }
    const { data: material, error: fetchError } = await materialQuery.single();

    if (fetchError || !material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    if (!material.url) {
      return res.status(400).json({ error: 'Material has no file URL' });
    }

    // Generate signed URL (valid for 1 hour)
    // Assumes URL is in format: https://[project].supabase.co/storage/v1/object/public/...
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('materials')
      .createSignedUrl(material.url.replace(/^.*\/storage\/v1\/object\/public\//, ''), 3600);

    if (signedError) {
      console.error('Signed URL generation error:', signedError);
      return res.status(500).json({ error: 'Failed to generate signed URL' });
    }

    res.json({
      signedUrl: signedData?.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      materialTitle: material.title,
    });
  } catch (error) {
    console.error('Get signed URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
};