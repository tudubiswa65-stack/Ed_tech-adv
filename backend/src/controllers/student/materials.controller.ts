import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { getSignedDownloadUrl, isLegacySupabaseUrl } from '../../lib/fileService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all available study materials for student — filtered by enrolled courses
export const getStudyMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { courseId, search } = req.query;

    // Get enrolled course IDs for this student
    let enrolledCourseIds: string[] = [];
    const enrollQ = supabaseAdmin
      .from('enrollments')
      .select('course_id')
      .eq('user_id', studentId)
      .eq('status', 'active');
    const { data: enrollments } = await enrollQ;
    enrolledCourseIds = enrollments?.map((e) => e.course_id).filter(Boolean) ?? [];

    if (enrolledCourseIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Filter to a specific enrolled course if provided
    let targetCourseIds = enrolledCourseIds;
    if (courseId && typeof courseId === 'string') {
      if (!enrolledCourseIds.includes(courseId)) {
        return res.status(403).json({ success: false, error: 'Access denied to this course materials' });
      }
      targetCourseIds = [courseId];
    }

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id, title, description, url, file_name, file_type, file_size,
        created_at, course_id,
        courses ( id, name )
      `)
      .in('course_id', targetCourseIds);

    // Support both is_active and is_published for compatibility
    query = query.or('is_active.eq.true,is_published.eq.true');

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get study materials error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch study materials' });
  }
};

// Get material by ID with access check + signed URL
export const getMaterialById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    // Get enrolled course IDs
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('course_id')
      .eq('user_id', studentId)
      .eq('status', 'active');
    const enrolledCourseIds = enrollments?.map((e) => e.course_id).filter(Boolean) ?? [];

    let byIdQuery = supabaseAdmin
      .from('study_materials')
      .select(`
        id, title, description, url, file_name, file_type, file_size,
        created_at, course_id,
        courses ( id, name )
      `)
      .eq('id', id)
      .or('is_active.eq.true,is_published.eq.true');

    if (instituteId) {
      byIdQuery = byIdQuery.eq('institute_id', instituteId);
    }

    const { data, error } = await byIdQuery.single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    // Verify student is enrolled in the material's course
    if (data.course_id && !enrolledCourseIds.includes(data.course_id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Log material view (non-fatal)
    supabaseAdmin
      .from('material_views')
      .insert({ material_id: id, student_id: studentId })
      .then(() => {})
      .catch(() => {});

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch material' });
  }
};

// Get signed URL for a material — verifies enrollment before issuing
export const getStudentMaterialSignedUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    // Get enrolled course IDs
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('course_id')
      .eq('user_id', studentId)
      .eq('status', 'active');
    const enrolledCourseIds = enrollments?.map((e) => e.course_id).filter(Boolean) ?? [];

    let matQ = supabaseAdmin
      .from('study_materials')
      .select('url, title, course_id')
      .eq('id', id)
      .or('is_active.eq.true,is_published.eq.true');

    if (instituteId) matQ = matQ.eq('institute_id', instituteId);

    const { data: material, error: fetchError } = await matQ.single();

    if (fetchError || !material) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    // Verify enrollment
    if (material.course_id && !enrolledCourseIds.includes(material.course_id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!material.url) {
      return res.status(400).json({ success: false, error: 'Material has no file' });
    }

    let signedUrl: string;

    if (isLegacySupabaseUrl(material.url)) {
      const rawMatch = (material.url as string).match(/\/storage\/v1\/object\/(?:public|sign)\/materials\/(.+)$/);
      const filePath = rawMatch ? rawMatch[1].split('?')[0] : null;
      if (!filePath) {
        return res.status(400).json({ success: false, error: 'Cannot parse legacy URL' });
      }
      const { data: sd, error: sdErr } = await supabaseAdmin.storage
        .from('materials')
        .createSignedUrl(filePath, 3600);
      if (sdErr || !sd?.signedUrl) {
        return res.status(500).json({ success: false, error: 'Failed to generate signed URL' });
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
    console.error('Get student signed URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate signed URL' });
  }
};

// Get materials by subject (legacy)
export const getMaterialsBySubject = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    const instituteId = req.user?.instituteId;

    let subjectMatsQuery = supabaseAdmin
      .from('study_materials')
      .select(`id, title, description, url, file_size, created_at`)
      .eq('subject_id', subjectId)
      .or('is_active.eq.true,is_published.eq.true');
    if (instituteId) {
      subjectMatsQuery = subjectMatsQuery.eq('institute_id', instituteId);
    }
    subjectMatsQuery = subjectMatsQuery.order('created_at', { ascending: false });
    const { data, error } = await subjectMatsQuery;

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get materials by subject error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
};

// Get recently viewed materials
export const getRecentlyViewed = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('material_views')
      .select(`
        viewed_at,
        study_materials (
          id, title, url, file_type,
          courses ( name )
        )
      `)
      .eq('student_id', studentId)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const formattedData = data?.map(v => {
      const mat = v.study_materials as { id: string; title: string; url?: string; file_type?: string; courses?: { name: string } } | null;
      if (!mat) return null;
      return { ...mat, viewedAt: v.viewed_at };
    }).filter(Boolean) || [];

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recently viewed' });
  }
};

// Get student's enrolled courses (for filter dropdown)
export const getMySubjects = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select('course_id, courses ( id, name )')
      .eq('user_id', studentId)
      .eq('status', 'active');

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const courses = data?.map(e => e.courses).filter(Boolean) ?? [];
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Get my subjects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
};

export default {
  getStudyMaterials,
  getMaterialById,
  getMaterialsBySubject,
  getRecentlyViewed,
  getMySubjects,
  getStudentMaterialSignedUrl,
};

