import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';
import { getUserBranchId } from '../../utils/branchFilter';

/** Builds a stable, unambiguous key for a (student, course, date) triple. */
function attendanceKey(studentId: string, courseId: string | null | undefined, date: string): string {
  return JSON.stringify([studentId, courseId ?? null, date]);
}

export const getAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, student_id, course_id } = req.query;

    // branch_admin is restricted to their own branch
    const adminBranchId = getUserBranchId(req.user);
    const requestedBranchId = req.query.branch_id as string | undefined;
    const effectiveBranchId = adminBranchId ?? requestedBranchId;

    let query = supabaseAdmin.from('attendance').select('*, users!student_id(name)');

    if (date) query = query.eq('date', date);
    if (student_id) query = query.eq('student_id', student_id);
    if (effectiveBranchId) query = query.eq('branch_id', effectiveBranchId);
    if (course_id) query = query.eq('course_id', course_id);

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get students filtered by course and branch for attendance marking
 * This endpoint returns active students that match the specified filters
 */
export const getStudentsForAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course_id, date } = req.query;

    // branch_admin is restricted to their own branch
    const adminBranchId = getUserBranchId(req.user);
    const requestedBranchId = req.query.branch_id as string | undefined;
    const effectiveBranchId = adminBranchId ?? requestedBranchId;

    // Build the query for active students (supports both new status and legacy is_active)
    let query = supabaseAdmin
      .from('students')
      .select('id, name, email, roll_number, course_id, branch_id, courses(name), branches(name)')
      .or('status.eq.ACTIVE,is_active.eq.true');

    // Apply filters
    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (effectiveBranchId) {
      query = query.eq('branch_id', effectiveBranchId);
    }

    // Order by name for consistent display
    const { data: students, error: studentsError } = await query.order('name', { ascending: true });

    if (studentsError) {
      res.status(400).json({ error: studentsError.message });
      return;
    }

    // If date is provided, check existing attendance records for that date
    let attendanceMap: Map<string, any> = new Map();
    if (date) {
      let attendanceQuery = supabaseAdmin
        .from('attendance')
        .select('id, student_id, status, notes, recorded_by, created_at')
        .eq('date', date);

      if (course_id) {
        attendanceQuery = attendanceQuery.eq('course_id', course_id);
      }

      if (effectiveBranchId) {
        attendanceQuery = attendanceQuery.eq('branch_id', effectiveBranchId);
      }

      const { data: existingAttendance } = await attendanceQuery;
      
      // Create a map of student_id to attendance record
      existingAttendance?.forEach(record => {
        attendanceMap.set(record.student_id, record);
      });
    }

    // Enrich student data with attendance status if date provided
    const enrichedStudents = (students || []).map(student => {
      const attendanceRecord = attendanceMap.get(student.id);
      return {
        ...student,
        attendance_status: attendanceRecord ? attendanceRecord.status : null,
        attendance_id: attendanceRecord ? attendanceRecord.id : null,
        attendance_notes: attendanceRecord ? attendanceRecord.notes : null,
        attendance_recorded_by: attendanceRecord ? attendanceRecord.recorded_by : null,
        attendance_recorded_at: attendanceRecord ? attendanceRecord.created_at : null,
      };
    });

    res.json({ 
      data: enrichedStudents,
      meta: {
        total: enrichedStudents.length,
        course_id: course_id || null,
        branch_id: effectiveBranchId || null,
        date: date || null,
        already_marked: enrichedStudents.filter((s: any) => s.attendance_status !== null).length,
      }
    });
  } catch (error: any) {
    console.error('Get students for attendance error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { records } = req.body; // Array of { student_id, branch_id, course_id, date, status }

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ error: 'No attendance records provided' });
      return;
    }

    // Attendance may only be marked for today's date (server UTC date)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hasInvalidDate = records.some((r: any) => r.date !== today);
    if (hasInvalidDate) {
      res.status(400).json({ error: "Attendance can only be marked for today's date" });
      return;
    }

    const admin_id = req.user?.id;
    const adminBranchId = getUserBranchId(req.user);

    // Deduplicate: if the same student appears more than once in the batch, keep the last entry
    const deduped = new Map<string, any>();
    for (const record of records) {
      if (!record.student_id) continue;
      const key = attendanceKey(record.student_id, record.course_id, record.date);
      deduped.set(key, record);
    }
    const uniqueRecords = Array.from(deduped.values());

    if (uniqueRecords.length === 0) {
      res.status(400).json({ error: 'No valid attendance records provided' });
      return;
    }

    const studentIds = uniqueRecords.map((r: any) => r.student_id);

    // Pre-check: find any existing attendance records for these students on today's date.
    // This prevents duplicate inserts that bypass the DB unique constraint
    // (e.g. when course_id is NULL and the DB hasn't yet been migrated to NULLS NOT DISTINCT).
    let existingQuery = supabaseAdmin
      .from('attendance')
      .select('id, student_id, course_id, status')
      .eq('date', today)
      .in('student_id', studentIds);

    if (adminBranchId) {
      existingQuery = existingQuery.eq('branch_id', adminBranchId);
    }

    const { data: existingRecords, error: existingError } = await existingQuery;
    if (existingError) throw existingError;

    // Build a set of student+course combinations that already have attendance today
    const alreadyMarked = new Set<string>(
      (existingRecords || []).map((r: any) => attendanceKey(r.student_id, r.course_id, today))
    );

    // Strict lock: once attendance is recorded for a student on today's date it cannot
    // be overwritten.  Only brand-new records are accepted.
    const newRecords: any[] = [];
    const skippedRecords: any[] = [];

    for (const record of uniqueRecords) {
      const key = attendanceKey(record.student_id, record.course_id, record.date);
      if (alreadyMarked.has(key)) {
        skippedRecords.push(record);
      } else {
        newRecords.push(record);
      }
    }

    // If every submitted record is already marked, reject the request outright
    if (newRecords.length === 0) {
      res.status(409).json({
        error: "Attendance has already been marked for all submitted students today. Re-marking is not allowed.",
        meta: { inserted: 0, skipped: skippedRecords.length },
      });
      return;
    }

    const formattedRecords = newRecords.map((record: any) => ({
      ...record,
      // branch_admin: override branch_id with their own to prevent cross-branch writes
      ...(adminBranchId ? { branch_id: adminBranchId } : {}),
      recorded_by: admin_id,
    }));

    // Insert only new records — no upsert/update of existing attendance.
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .insert(formattedRecords)
      .select();

    if (error) throw error;

    res.status(201).json({
      data,
      meta: {
        inserted: newRecords.length,
        skipped: skippedRecords.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // branch_admin may only update attendance records belonging to their branch
    const adminBranchId = getUserBranchId(req.user);
    if (adminBranchId) {
      const { data: existing } = await supabaseAdmin
        .from('attendance')
        .select('branch_id')
        .eq('id', id)
        .single();
      if (!existing || existing.branch_id !== adminBranchId) {
        res.status(403).json({ error: 'Access denied: attendance record belongs to a different branch' });
        return;
      }
      // Prevent changing the branch_id
      delete updates.branch_id;
    }

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
