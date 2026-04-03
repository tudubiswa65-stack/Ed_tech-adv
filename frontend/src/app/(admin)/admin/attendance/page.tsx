'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Button, Modal, Badge, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  users?: { name: string };
}

interface StudentWithAttendance {
  id: string;
  name: string;
  email: string;
  roll_number?: string;
  course_id?: string;
  branch_id?: string;
  courses?: { name: string } | null;
  branches?: { name: string } | null;
  attendance_status: string | null;
  attendance_id: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markData, setMarkData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Tracks which students already have attendance recorded for the selected date/course
  const [alreadyMarkedIds, setAlreadyMarkedIds] = useState<Set<string>>(new Set());

  const isToday = selectedDate === today;

  const toast = useToast();

  useEffect(() => {
    Promise.all([fetchBranches(), fetchCourses()]);
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedBranch, selectedCourse, selectedDate]);

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/admin/branches');
      setBranches(response.data.data || []);
    } catch {
      toast.error('Failed to load branches');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get<{ courses: Course[] }>('/admin/courses');
      setCourses(response.data.courses || []);
    } catch {
      toast.error('Failed to load courses');
    }
  };

  const fetchStudentsForAttendance = async () => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedBranch) params.set('branch_id', selectedBranch);
      if (selectedCourse) params.set('course_id', selectedCourse);

      const response = await apiClient.get<{ data: StudentWithAttendance[] }>(
        `/admin/attendance/students-listing?${params}`
      );
      const studentList = response.data.data || [];
      setStudents(studentList);

      // Pre-fill mark data from existing attendance records
      const initialMarkData: Record<string, string> = {};
      const markedIds = new Set<string>();
      studentList.forEach((s: StudentWithAttendance) => {
        initialMarkData[s.id] = s.attendance_status ?? 'present';
        if (s.attendance_status !== null) {
          markedIds.add(s.id);
        }
      });
      setMarkData(initialMarkData);
      setAlreadyMarkedIds(markedIds);
    } catch {
      toast.error('Failed to load students for attendance');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedBranch) params.set('branch_id', selectedBranch);
      if (selectedCourse) params.set('course_id', selectedCourse);

      const response = await apiClient.get(`/admin/attendance?${params}`);
      setAttendance(response.data.data || []);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMarkModal = async () => {
    await fetchStudentsForAttendance();
    setShowMarkModal(true);
  };

  const handleMarkAll = (status: string) => {
    const all: Record<string, string> = { ...markData };
    // Only update students whose attendance has NOT been marked yet (unlocked)
    students.forEach((s) => {
      if (!alreadyMarkedIds.has(s.id)) {
        all[s.id] = status;
      }
    });
    setMarkData(all);
  };

  const handleMarkAttendance = async () => {
    setSaving(true);
    try {
      // Only submit records for students whose attendance has NOT yet been marked today
      const records = Object.entries(markData)
        .filter(([studentId]) => !alreadyMarkedIds.has(studentId))
        .map(([studentId, status]) => ({
          student_id: studentId,
          branch_id: selectedBranch || undefined,
          course_id: selectedCourse || undefined,
          date: selectedDate,
          status,
        }));

      if (records.length === 0) {
        toast.error('Attendance is already marked for all students. Re-marking is not allowed.');
        return;
      }

      await apiClient.post('/admin/attendance', { records });
      toast.success('Attendance saved successfully');
      setShowMarkModal(false);
      fetchAttendance();
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'student',
      label: 'Student Name',
      render: (row: AttendanceRecord) => row.users?.name || 'Unknown',
    },
    {
      key: 'date',
      label: 'Date',
      render: (row: AttendanceRecord) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: AttendanceRecord) => (
        <Badge
          variant={
            row.status === 'present' ? 'success' : row.status === 'absent' ? 'danger' : 'warning'
          }
        >
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Attendance Management"
      actions={
        <Button onClick={handleOpenMarkModal} disabled={!isToday} title={!isToday ? 'Attendance can only be marked for today' : undefined}>
          Mark Attendance
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Branch</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-slate-500"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Course</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-slate-500"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-slate-500"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {!isToday && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
          ⚠️ Viewing records for a different date. Attendance can only be marked for today.
        </div>
      )}

      <Table
        columns={columns}
        data={attendance}
        loading={loading}
        emptyMessage="No attendance records for the selected filters"
      />

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title={`Mark Attendance – ${new Date(selectedDate).toLocaleDateString()}`}
        size="lg"
      >
        {studentsLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            No students found for the selected filters.
          </div>
        ) : (
          <>
            {/* Banner when attendance already exists for some/all students */}
            {alreadyMarkedIds.size > 0 && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
                🔒 Attendance is <strong>locked</strong> for {alreadyMarkedIds.size} student(s) — already marked today and cannot be changed.
                {alreadyMarkedIds.size === students.length && (
                  <span className="block mt-1 font-semibold">All students have been marked. No further action is needed.</span>
                )}
              </div>
            )}

            {/* Bulk actions */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Mark All:</span>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')}>✅ Present</Button>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')}>❌ Absent</Button>
              <Button size="sm" variant="outline" onClick={() => handleMarkAll('late')}>⏰ Late</Button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-700">
                <thead className="bg-gray-50 sticky top-0 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-slate-400">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-slate-400">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-slate-400">Recorded</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-800 dark:divide-slate-700">
                  {students.map((student) => (
                    <tr key={student.id} className={markData[student.id] === 'present' ? 'bg-green-50 dark:bg-green-900/10' : markData[student.id] === 'absent' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-slate-100">{student.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{student.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                        {student.courses?.name || '–'}
                      </td>
                      <td className="px-4 py-3">
                        {alreadyMarkedIds.has(student.id) ? (
                          <select
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-100 text-gray-400 cursor-not-allowed dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500"
                            value={markData[student.id] || 'present'}
                            disabled
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="excused">Excused</option>
                          </select>
                        ) : (
                          <select
                            className="border border-gray-300 rounded-lg px-2 py-1 text-sm dark:border-slate-500"
                            value={markData[student.id] || 'present'}
                            onChange={(e) => setMarkData({ ...markData, [student.id]: e.target.value })}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="excused">Excused</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {alreadyMarkedIds.has(student.id) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5 dark:bg-red-900/30 dark:text-red-300">
                            🔒 Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-slate-500">
                            New
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-400 dark:text-slate-500">
              {students.length} student(s) found •{' '}
              {Object.values(markData).filter((v) => v === 'present').length} present •{' '}
              {Object.values(markData).filter((v) => v === 'absent').length} absent
              {alreadyMarkedIds.size > 0 && ` • ${alreadyMarkedIds.size} locked (already marked)`}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowMarkModal(false)}>Cancel</Button>
          <Button
            onClick={handleMarkAttendance}
            disabled={saving || students.length === 0 || alreadyMarkedIds.size === students.length}
            title={alreadyMarkedIds.size === students.length ? 'Attendance is already marked for all students' : undefined}
          >
            {saving ? 'Saving…' : 'Save Attendance'}
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
