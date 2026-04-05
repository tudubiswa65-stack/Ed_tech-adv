import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAllCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      branch_id,
      status,
      level
    } = req.query;

    let query = supabaseAdmin
      .from('courses')
      .select(`
        *,
        branches (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply filters
    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (level) {
      query = query.eq('level', level);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch courses' });
      return;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
};

export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        branches (
          id,
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !course) {
      res.status(404).json({ success: false, error: 'Course not found' });
      return;
    }

    // Get enrolled students count
    const { count: enrolledCount } = await supabaseAdmin
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id);

    // Get modules
    const { data: modules } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    res.json({
      success: true,
      data: {
        ...course,
        enrolledCount: enrolledCount || 0,
        modules: modules || []
      }
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch course' });
  }
};

export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      title,
      description,
      price,
      duration_value,
      duration_unit,
      duration_hours,
      start_date,
      end_date,
      last_enrollment_date,
      thumbnail,
      thumbnail_url,
      instructor,
      terms_and_conditions,
      category,
      level,
      status,
      is_active,
      is_published,
      branch_id,
    } = req.body;

    if (!name && !title) {
      res.status(400).json({ success: false, error: 'Course name or title is required' });
      return;
    }

    if (!branch_id) {
      res.status(400).json({ success: false, error: 'Branch is required' });
      return;
    }

    const insertData: Record<string, unknown> = {
      name: name || title,
      title: title || name,
      branch_id,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      status: status || 'active',
    };

    if (description !== undefined) insertData.description = description;
    if (thumbnail !== undefined) insertData.thumbnail = thumbnail;
    else if (thumbnail_url !== undefined) insertData.thumbnail = thumbnail_url;
    if (instructor !== undefined) insertData.instructor = instructor;
    if (terms_and_conditions !== undefined) insertData.terms_and_conditions = terms_and_conditions;
    if (category !== undefined) insertData.category = category;

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({ success: false, error: 'Invalid price. Must be a non-negative number.' });
        return;
      }
      insertData.price = parsedPrice;
    }

    if (duration_value !== undefined) {
      const parsed = Number(duration_value);
      if (isNaN(parsed) || parsed < 0) {
        res.status(400).json({ success: false, error: 'Invalid duration_value. Must be a non-negative number.' });
        return;
      }
      insertData.duration_value = parsed;
    }
    if (duration_unit !== undefined) {
      const validUnits = ['days', 'weeks', 'months', 'years'];
      if (!validUnits.includes(duration_unit as string)) {
        res.status(400).json({ success: false, error: `Invalid duration_unit. Must be one of: ${validUnits.join(', ')}` });
        return;
      }
      insertData.duration_unit = duration_unit;
    }
    if (duration_hours !== undefined) {
      const parsed = Number(duration_hours);
      if (!isNaN(parsed) && parsed >= 0) insertData.duration_hours = parsed;
    }

    if (start_date !== undefined) insertData.start_date = start_date;
    if (end_date !== undefined) insertData.end_date = end_date;
    if (last_enrollment_date !== undefined) insertData.last_enrollment_date = last_enrollment_date;

    if (level !== undefined) {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (!validLevels.includes(level as string)) {
        res.status(400).json({ success: false, error: `Invalid level. Must be one of: ${validLevels.join(', ')}` });
        return;
      }
      insertData.level = level;
    }

    if (is_published !== undefined) insertData.is_published = Boolean(is_published);

    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ success: false, error: 'Failed to create course' });
      return;
    }

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, error: 'Failed to create course' });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      title,
      description,
      price,
      duration_value,
      duration_unit,
      duration_hours,
      start_date,
      end_date,
      last_enrollment_date,
      thumbnail,
      thumbnail_url,
      instructor,
      terms_and_conditions,
      category,
      level,
      status,
      is_active,
      is_published,
    } = req.body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (name) { updateData.name = name; updateData.title = updateData.title ?? name; }
    if (title) { updateData.title = title; updateData.name = updateData.name ?? title; }
    if (description !== undefined) updateData.description = description;
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active;
      updateData.status = is_active ? 'active' : 'inactive';
    }
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    else if (thumbnail_url !== undefined) updateData.thumbnail = thumbnail_url;
    if (instructor !== undefined) updateData.instructor = instructor;
    if (terms_and_conditions !== undefined) updateData.terms_and_conditions = terms_and_conditions;
    if (category !== undefined) updateData.category = category;

    if (status && ['active', 'inactive', 'draft'].includes(status as string)) {
      updateData.status = status;
      updateData.is_active = status === 'active';
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({ success: false, error: 'Invalid price. Must be a non-negative number.' });
        return;
      }
      updateData.price = parsedPrice;
    }

    if (duration_value !== undefined) {
      const parsed = Number(duration_value);
      if (isNaN(parsed) || parsed < 0) {
        res.status(400).json({ success: false, error: 'Invalid duration_value. Must be a non-negative number.' });
        return;
      }
      updateData.duration_value = parsed;
    }
    if (duration_unit !== undefined) {
      const validUnits = ['days', 'weeks', 'months', 'years'];
      if (!validUnits.includes(duration_unit as string)) {
        res.status(400).json({ success: false, error: `Invalid duration_unit. Must be one of: ${validUnits.join(', ')}` });
        return;
      }
      updateData.duration_unit = duration_unit;
    }
    if (duration_hours !== undefined) {
      const parsed = Number(duration_hours);
      if (!isNaN(parsed) && parsed >= 0) updateData.duration_hours = parsed;
    }

    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (last_enrollment_date !== undefined) updateData.last_enrollment_date = last_enrollment_date;

    if (level !== undefined) {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (!validLevels.includes(level as string)) {
        res.status(400).json({ success: false, error: `Invalid level. Must be one of: ${validLevels.join(', ')}` });
        return;
      }
      updateData.level = level;
    }

    if (is_published !== undefined) updateData.is_published = Boolean(is_published);

    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ success: false, error: 'Failed to update course' });
      return;
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ success: false, error: 'Failed to delete course' });
      return;
    }

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
};

export const assignToBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { branch_ids } = req.body;

    if (!branch_ids || !Array.isArray(branch_ids)) {
      res.status(400).json({ success: false, error: 'Branch IDs array is required' });
      return;
    }

    // Get the original course
    const { data: originalCourse } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalCourse) {
      res.status(404).json({ success: false, error: 'Course not found' });
      return;
    }

    // Create copies for each branch
    const promises = branch_ids.map(branch_id => {
      return supabaseAdmin
        .from('courses')
        .insert({
          name: originalCourse.name,
          description: originalCourse.description,
          level: originalCourse.level,
          duration: originalCourse.duration,
          duration_unit: originalCourse.duration_unit,
          price: originalCourse.price,
          branch_id,
          is_active: originalCourse.is_active,
          status: originalCourse.status
        });
    });

    await Promise.all(promises);

    res.json({
      success: true,
      message: `Course assigned to ${branch_ids.length} branches successfully`
    });
  } catch (error) {
    console.error('Error assigning course to branches:', error);
    res.status(500).json({ success: false, error: 'Failed to assign course to branches' });
  }
};

export const toggleCourseStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('is_active')
      .eq('id', id)
      .single();

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found' });
      return;
    }

    const newStatus = !course.is_active;

    const { data, error } = await supabaseAdmin
      .from('courses')
      .update({
        is_active: newStatus,
        status: newStatus ? 'active' : 'inactive'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling course status:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle course status' });
      return;
    }

    res.json({
      success: true,
      data,
      message: `Course ${newStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling course status:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle course status' });
  }
};

export const getCourseAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id } = req.query;

    let query = supabaseAdmin
      .from('courses')
      .select('id, name, branch_id, status');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data: courses } = await query;

    if (!courses) {
      res.json({ success: true, data: { total: 0, active: 0, inactive: 0 } });
      return;
    }

    // Get enrollment stats for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const { count } = await supabaseAdmin
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        return {
          ...course,
          enrollmentCount: count || 0
        };
      })
    );

    const total = coursesWithStats.length;
    const active = coursesWithStats.filter(c => c.status === 'active').length;
    const inactive = coursesWithStats.filter(c => c.status === 'inactive').length;
    const totalEnrollments = coursesWithStats.reduce((sum, c) => sum + c.enrollmentCount, 0);

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        totalEnrollments,
        courses: coursesWithStats
      }
    });
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch course analytics' });
  }
};
