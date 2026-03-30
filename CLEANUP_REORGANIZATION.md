# EdTech Platform - Cleanup and Reorganization Guide

## Overview

This document outlines the cleanup and reorganization tasks to optimize the EdTech platform with a clean 12-table schema, structured backend, and 3-role frontend.

## Current Issues

### 1. Duplicate Files

- `schema_complete.sql` (root) - Duplicated at `/backend/src/db/migrations/schema_complete.sql`
- Both files are identical (1306 lines)
- Should be consolidated into single location

### 2. Multiple Schema Files

Three SQL schema files:
- `schema_complete.sql` - Main schema (22 tables)
- `backend/migrations/super_admin_tables.sql` - Super admin extensions (2 tables + modifications)
- Need: Single unified schema file

### 3. Documentation Redundancy

Multiple documentation files with overlapping content:
- `README.md` - General overview
- `SUPER_ADMIN_IMPLEMENTATION.md` - Super admin implementation
- `SUPER_ADMIN_SETUP.md` - Super admin setup
- Should be consolidated

### 4. Table Count Issue

Goal: 12 tables
Current: 22 + 2 = 24 tables
Solution: Consolidate related tables (see MIGRATION_GUIDE.md)

## Cleanup Tasks

### Task 1: Remove Duplicate Schema Files

**Action:**
- Remove `schema_complete.sql` from root
- Keep only `backend/src/db/migrations/schema_complete.sql`
- Or better: Create new unified schema file

**Files to remove:**
- `/home/engine/project/schema_complete.sql` (duplicate)

### Task 2: Create Unified Schema

**Action:**
- Create `schema_v3.sql` with optimized 12-table structure
- This combines all tables into a clean, unified schema
- Already created as `schema_optimized.sql`

### Task 3: Consolidate Documentation

**Action:**
- Create comprehensive `README.md` with all setup instructions
- Create separate docs for specific features
- Remove redundant documentation files

**Proposed structure:**
```
/docs
  ├── SETUP.md              # Complete setup guide
  ├── MIGRATION_GUIDE.md    # Schema migration guide
  ├── API.md                # API documentation
  └── ARCHITECTURE.md       # System architecture
README.md                   # Quick start and overview
```

### Task 4: Backend Reorganization

**Action:**
- Review and reorganize backend structure
- Ensure controllers follow consistent patterns
- Update imports after schema changes

**Current structure:**
```
backend/src/
  ├── controllers/
  │   ├── admin/
  │   ├── student/
  │   └── superAdmin/
  ├── middleware/
  ├── routes/
  └── types/
```

**This structure is good - no changes needed.**

### Task 5: Frontend Reorganization

**Action:**
- Ensure 3-role frontend is properly structured
- Update types after schema changes
- Ensure consistent patterns across routes

**Current structure:**
```
frontend/src/app/
  ├── (admin)/              # Admin route group
  ├── (student)/            # Student route group
  └── (super-admin)/        # Super admin route group
```

**This structure is good - no changes needed.**

## Schema Optimization Details

### Table Consolidation Strategy

#### 1. Settings Consolidation

**Before:**
- `institute_config` - Institute branding and contact
- `settings` - Key-value settings
- `super_admin_settings` - Platform-wide settings

**After:**
- `settings` - Unified settings with `category` field:
  - `'branding'` - Platform branding (colors, logo)
  - `'institute'` - Institute contact info
  - `'platform'` - Platform configuration
  - `'features'` - Feature flags

#### 2. Course Structure Simplification

**Before:**
- `courses` - Course details
- `modules` - Course modules
- `subjects` - Module subjects

**After:**
- `courses` - Course details with `modules` (JSONB array):
  ```json
  [
    {
      "name": "Module 1",
      "description": "Introduction",
      "order_index": 0,
      "subjects": [
        {
          "name": "HTML Basics",
          "description": "Introduction to HTML",
          "order_index": 0
        }
      ]
    }
  ]
  ```

#### 3. Results and Assignments Merge

**Before:**
- `results` - Test results
- `test_assignments` - Test assignments to students

**After:**
- `results` - Combined with assignment fields:
  - `assignment_status` - 'pending', 'in_progress', 'completed'
  - `start_time` - When student started
  - `end_time` - When student ended

#### 4. Payments and Receipts Merge

**Before:**
- `payments` - Payment records
- `receipts` - Receipt details

**After:**
- `payments` - Combined with receipt fields:
  - `receipt_number` - Unique receipt number
  - `issued_by` - Admin who issued receipt
  - `receipt_signature` - Cryptographic signature

#### 5. Study Materials with View Tracking

**Before:**
- `study_materials` - Materials
- `material_views` - View tracking

**After:**
- `study_materials` - Combined with view tracking:
  - `view_count` - Total views
  - `last_viewed_at` - Last view timestamp
  - `viewed_by` - JSONB array of `{student_id, viewed_at}`

#### 6. Unified Notifications

**Before:**
- `notifications` - System notifications
- `notification_reads` - Read tracking
- `complaints` - Student complaints
- `complaint_replies` - Complaint replies
- `feedback` - User feedback
- `audit_logs` - Audit trail

**After:**
- `notifications` - Unified with `type` field:
  - `'notification'` - System notifications
  - `'complaint'` - Complaints (with `complaint_status`)
  - `'feedback'` - Feedback (with `rating`)
  - `'audit'` - Audit logs (with `action`, `entity_type`, `entity_id`)
  - `read_by` - JSONB array of `{student_id, read_at}`
  - `read_count` - Total read count

## Role-Based Access Control

### Three Roles

1. **super_admin**
   - Platform-wide access
   - Manage all branches
   - View all data globally
   - Configure platform settings

2. **branch_admin**
   - Branch-specific access
   - Manage branch data only
   - View branch students/courses/tests
   - Configure branch settings

3. **student**
   - Personal access only
   - View own data
   - Take assigned tests
   - View own results

### Frontend Route Groups

```
/frontend/src/app/
├── (admin)/                  # admin + branch_admin
│   └── admin/
│       ├── dashboard/
│       ├── students/
│       ├── courses/
│       ├── tests/
│       └── ...
├── (student)/                # student
│   └── (pages)
│       ├── dashboard/
│       ├── tests/
│       ├── results/
│       └── ...
└── (super-admin)/            # super_admin
    └── super-admin/
        ├── dashboard/
        ├── branches/
        ├── payments/
        └── ...
```

### Backend Middleware

```typescript
// Require admin (admin or branch_admin)
export const requireAdmin = (req, res, next) => {
  if (!['admin', 'branch_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Require super admin only
export const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Branch data filtering for branch_admin
// Automatically filter by branch_id
```

## Implementation Plan

### Phase 1: Schema Optimization

- [x] Create optimized 12-table schema
- [x] Document table consolidation strategy
- [ ] Create migration script
- [ ] Test migration on staging

### Phase 2: Backend Updates

- [ ] Update controllers for new schema
- [ ] Update middleware for 3-role system
- [ ] Update types
- [ ] Test all API endpoints

### Phase 3: Frontend Updates

- [ ] Update type definitions
- [ ] Update components for new schema
- [ ] Update API calls
- [ ] Test all user flows

### Phase 4: Documentation

- [x] Create migration guide
- [x] Create cleanup/reorganization guide
- [ ] Update README with new schema
- [ ] Create API documentation

### Phase 5: Deployment

- [ ] Backup production database
- [ ] Apply migration
- [ ] Deploy updated backend
- [ ] Deploy updated frontend
- [ ] Verify all functionality

## Benefits

1. **Clean Schema**: 12 tables vs 24 tables
2. **Better Performance**: Fewer joins, simpler queries
3. **Easier Maintenance**: Less code to maintain
4. **Clear Architecture**: 3-role system with clear boundaries
5. **Improved Scalability**: Optimized for growth
6. **Better Developer Experience**: Clearer structure

## Risk Mitigation

1. **Backup Before Migration**: Always backup before schema changes
2. **Staging Testing**: Test thoroughly on staging first
3. **Rollback Plan**: Have rollback plan ready
4. **Incremental Migration**: Migrate in phases if possible
5. **Monitor After Deployment**: Watch for issues after deployment

## Next Steps

1. Review `schema_optimized.sql`
2. Review `MIGRATION_GUIDE.md`
3. Create migration script
4. Test on staging environment
5. Plan production migration timeline
6. Execute migration during maintenance window
7. Monitor and verify

## Questions?

Refer to:
- `schema_optimized.sql` - New 12-table schema
- `MIGRATION_GUIDE.md` - Detailed migration instructions
- Backend controller files - Implementation examples
- Frontend type files - Type definitions
