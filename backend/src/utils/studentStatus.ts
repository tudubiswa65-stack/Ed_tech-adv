/**
 * Resolve the effective account status for a student record.
 *
 * Supports both the new `status` column (ACTIVE / INACTIVE / SUSPENDED)
 * and the legacy `is_active` boolean column so the platform remains
 * backward-compatible while the database migration is applied.
 */
export function resolveStudentStatus(student: {
  status?: string | null;
  is_active?: boolean | null;
}): 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' {
  if (student.status === 'SUSPENDED') return 'SUSPENDED';
  if (student.status === 'INACTIVE') return 'INACTIVE';
  if (student.status === 'ACTIVE') return 'ACTIVE';

  // Fall back to legacy is_active boolean
  return student.is_active ? 'ACTIVE' : 'INACTIVE';
}

/**
 * Returns true if the student is allowed to access the platform.
 */
export function isStudentActive(student: {
  status?: string | null;
  is_active?: boolean | null;
}): boolean {
  return resolveStudentStatus(student) === 'ACTIVE';
}
