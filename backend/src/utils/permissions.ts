export const ALL_PERMISSIONS = [
  'add_course',
  'edit_course',
  'delete_course',
  'add_student',
  'edit_student',
  'delete_student',
  'broadcast_message',
  'send_direct_message',
  'manage_notice_board',
  'manage_fees',
  'issue_receipts',
  'view_reports',
  'export_data',
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_GROUPS: { label: string; permissions: PermissionKey[] }[] = [
  { label: 'Courses', permissions: ['add_course', 'edit_course', 'delete_course'] },
  { label: 'Students', permissions: ['add_student', 'edit_student', 'delete_student'] },
  {
    label: 'Communication',
    permissions: ['broadcast_message', 'send_direct_message', 'manage_notice_board'],
  },
  { label: 'Finance', permissions: ['manage_fees', 'issue_receipts'] },
  { label: 'Reports', permissions: ['view_reports', 'export_data'] },
];

export const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = Object.fromEntries(
  ALL_PERMISSIONS.map((p) => [p, false])
) as Record<PermissionKey, boolean>;
