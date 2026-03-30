# EdTech Platform - Schema Migration Guide

## Overview

This guide explains how to migrate from the previous 24-table schema to the optimized 12-table schema.

## Schema Changes Summary

### Table Consolidation (24 → 12 tables)

| Previous Tables | Consolidated To | How |
|----------------|-----------------|-----|
| `institute_config` | `settings` | Use `category='institute'` |
| `settings` | `settings` | Unified with institute_config |
| `super_admin_settings` | `settings` | Use `category='platform'` or `'features'` |
| `modules` | `courses.modules` | JSONB array |
| `subjects` | `courses.modules` | Nested in JSONB |
| `test_assignments` | `results` | Added `assignment_status`, `start_time`, `end_time` |
| `receipts` | `payments` | Added `receipt_number`, `issued_by`, `receipt_signature` |
| `material_views` | `study_materials` | Added `view_count`, `last_viewed_at`, `viewed_by` (JSONB) |
| `complaints` | `notifications` | Use `type='complaint'` |
| `complaint_replies` | `notifications` | New notification for each reply |
| `feedback` | `notifications` | Use `type='feedback'` |
| `audit_logs` | `notifications` | Use `type='audit'` |
| `notification_reads` | `notifications` | Use `read_by` (JSONB array), `read_count` |

### Final 12 Tables

1. **settings** - All configuration (institute, platform, features, branding)
2. **branches** - Multi-branch support
3. **users** - Unified user table for all 3 roles
4. **courses** - Courses with modules as JSONB
5. **enrollments** - Student enrollments
6. **attendance** - Attendance records
7. **tests** - Test definitions
8. **questions** - Test questions
9. **results** - Results + test assignments
10. **payments** - Payments + receipts
11. **study_materials** - Materials + view tracking
12. **notifications** - Unified for notifications, complaints, feedback, audit logs

## Migration Steps

### Step 1: Backup Existing Data

```bash
# Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Review the New Schema

Review `schema_optimized.sql` to understand the new structure.

### Step 3: Create Migration Script

Create a migration script to migrate data from old schema to new schema.

### Step 4: Test Migration

Test the migration on a staging environment first.

### Step 5: Apply Migration

Apply the migration to production during a maintenance window.

### Step 6: Update Application Code

Update backend controllers and frontend components to work with the new schema.

### Step 7: Verify

Verify that all functionality works correctly after migration.

## Backend Code Changes Required

### Settings Controller

**Old:**
```typescript
// Multiple tables for settings
await supabase.from('institute_config').select('*');
await supabase.from('settings').select('*');
await supabase.from('super_admin_settings').select('*');
```

**New:**
```typescript
// Single settings table
await supabase.from('settings').select('*').eq('category', 'branding');
await supabase.from('settings').select('*').eq('category', 'institute');
await supabase.from('settings').select('*').eq('category', 'features');
await supabase.from('settings').select('*').eq('category', 'platform');
```

### Courses Controller

**Old:**
```typescript
// Separate modules table
await supabase.from('courses').select('*, modules(*)');
```

**New:**
```typescript
// Modules as JSONB
await supabase.from('courses').select('*');
// Access modules as course.modules (JSONB array)
```

### Results Controller

**Old:**
```typescript
// Separate test_assignments table
await supabase.from('results').select('*, test_assignments(*)');
```

**New:**
```typescript
// Results includes assignment fields
await supabase.from('results').select('*');
// Access as result.assignment_status, result.start_time, result.end_time
```

### Payments Controller

**Old:**
```typescript
// Separate receipts table
await supabase.from('receipts').select('*');
```

**New:**
```typescript
// Payments includes receipt fields
await supabase.from('payments').select('*');
// Access as payment.receipt_number, payment.receipt_signature
```

### Study Materials Controller

**Old:**
```typescript
// Separate material_views table
await supabase.from('material_views').insert({...});
await supabase.from('study_materials').select('*');
```

**New:**
```typescript
// View tracking in study_materials
const { data: material } = await supabase.from('study_materials')
  .select('viewed_by')
  .eq('id', materialId)
  .single();

// Update view tracking
const viewedBy = material.viewed_by || [];
viewedBy.push({ student_id, viewed_at: new Date().toISOString() });

await supabase.from('study_materials')
  .update({
    view_count: viewedBy.length,
    last_viewed_at: new Date().toISOString(),
    viewed_by: viewedBy
  })
  .eq('id', materialId);
```

### Notifications Controller

**Old:**
```typescript
// Separate tables for different types
await supabase.from('notifications').insert({...});
await supabase.from('complaints').insert({...});
await supabase.from('feedback').insert({...});
await supabase.from('audit_logs').insert({...});
await supabase.from('notification_reads').insert({...});
```

**New:**
```typescript
// Unified notifications table
await supabase.from('notifications').insert({
  type: 'notification',
  target_audience: 'students',
  title: 'Test Alert',
  message: 'New test available'
});

// Complaint
await supabase.from('notifications').insert({
  type: 'complaint',
  category: 'technical',
  title: 'Issue with payment',
  message: 'Payment not processing',
  student_id,
  complaint_status: 'open'
});

// Feedback
await supabase.from('notifications').insert({
  type: 'feedback',
  title: 'Course Feedback',
  message: 'Great course!',
  rating: 5,
  student_id
});

// Audit log
await supabase.from('notifications').insert({
  type: 'audit',
  action: 'CREATE',
  entity_type: 'user',
  entity_id: userId,
  new_value: userData,
  created_by: adminId
});

// Mark as read
const { data: notif } = await supabase.from('notifications')
  .select('read_by')
  .eq('id', notificationId)
  .single();

const readBy = notif.read_by || [];
readBy.push({ student_id, read_at: new Date().toISOString() });

await supabase.from('notifications')
  .update({
    read_count: readBy.length,
    read_by: readBy
  })
  .eq('id', notificationId);
```

## Frontend Code Changes Required

### Types Update

Update `frontend/src/types/index.ts` to reflect the new schema:

```typescript
// Settings
export interface Setting {
  id: string;
  key: string;
  value: any;
  category: 'branding' | 'features' | 'platform' | 'institute';
  description?: string;
}

// Course with modules as JSONB
export interface Course {
  id: string;
  name: string;
  title?: string;
  description?: string;
  // ... other fields
  modules: Module[];  // JSONB array
}

export interface Module {
  name: string;
  description?: string;
  subjects?: Subject[];
  order_index?: number;
}

// Result with assignment fields
export interface Result {
  // ... existing fields
  assignment_status?: string;
  start_time?: string;
  end_time?: string;
}

// Payment with receipt fields
export interface Payment {
  // ... existing fields
  receipt_number?: string;
  receipt_signature?: string;
  issued_by?: string;
}

// Study material with view tracking
export interface StudyMaterial {
  // ... existing fields
  view_count?: number;
  last_viewed_at?: string;
  viewed_by?: { student_id: string; viewed_at: string }[];
}

// Unified notification
export interface Notification {
  id: string;
  type: 'notification' | 'complaint' | 'feedback' | 'audit';
  category?: string;
  title: string;
  message: string;
  // Complaint-specific
  complaint_status?: 'open' | 'in_progress' | 'resolved';
  assigned_to?: string;
  // Feedback-specific
  rating?: number;
  // Audit-specific
  action?: string;
  entity_type?: string;
  entity_id?: string;
  // Read tracking
  read_by?: { student_id: string; read_at: string }[];
  read_count?: number;
  // ... other fields
}
```

### Component Updates

Update components to handle the new schema structure.

### API Calls Update

Update API calls to use the new schema.

## Benefits of Migration

1. **Simplicity**: 50% reduction in table count (24 → 12)
2. **Performance**: Fewer joins required
3. **Maintainability**: Easier to understand and maintain
4. **Flexibility**: JSONB fields allow flexible data structures
5. **Scalability**: Better performance at scale
6. **Consistency**: Unified approach to similar data

## Rollback Plan

If issues occur after migration:

1. Stop application
2. Restore from backup
3. Verify data integrity
4. Restart application

## Testing Checklist

- [ ] All CRUD operations work
- [ ] Authentication and authorization work
- [ ] Role-based access control works
- [ ] Dashboard data displays correctly
- [ ] Student enrollment works
- [ ] Test creation and submission works
- [ ] Results display correctly
- [ ] Payments work
- [ ] Receipts generate correctly
- [ ] Notifications work
- [ ] Complaints work
- [ ] Feedback works
- [ ] Audit logs work
- [ ] Study materials work
- [ ] Attendance works

## Support

For issues during migration, refer to:
- The optimized schema: `schema_optimized.sql`
- Backend controller updates
- Frontend type definitions
