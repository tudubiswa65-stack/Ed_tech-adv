import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all available study materials for student
export const getStudyMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { subjectId, type, search } = req.query;

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        created_at,
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
        )
      `)
      .eq('is_published', true);

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    if (type) {
      query = query.eq('type', type);
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

// Get material by ID
export const getMaterialById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    let byIdQuery = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        content,
        created_at,
        subjects (
          id,
          name
        )
      `)
      .eq('id', id)
      .eq('is_published', true);
    if (instituteId) {
      byIdQuery = byIdQuery.eq('institute_id', instituteId);
    }
    const { data, error } = await byIdQuery.single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    // Log material view
    await supabaseAdmin.from('material_views').insert({
      material_id: id,
      student_id: studentId,
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch material' });
  }
};

// Get materials by subject
export const getMaterialsBySubject = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    const instituteId = req.user?.instituteId;

    let subjectMatsQuery = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        created_at
      `)
      .eq('subject_id', subjectId)
      .eq('is_published', true);
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
          id,
          title,
          type,
          subjects (
            name
          )
        )
      `)
      .eq('student_id', studentId)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const formattedData = data?.map(v => ({
      ...v.study_materials,
      viewedAt: v.viewed_at
    })) || [];

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recently viewed' });
  }
};

// Get student's assigned subjects (from test assignments)
export const getMySubjects = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    // Get subjects from assigned tests
    const { data, error } = await supabaseAdmin
      .from('test_assignments')
      .select(`
        tests (
          subjects (
            id,
            name,
            modules (
              name,
              courses (
                name
              )
            )
          )
        )
      `)
      .eq('student_id', studentId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Deduplicate subjects
    const subjectsMap = new Map();
    data?.forEach(assignment => {
      const subject = (assignment.tests as any)?.subjects;
      if (subject && !subjectsMap.has(subject.id)) {
        subjectsMap.set(subject.id, subject);
      }
    });

    res.json({ success: true, data: Array.from(subjectsMap.values()) });
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
};
