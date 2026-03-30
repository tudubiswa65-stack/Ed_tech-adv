# 3-Role System Quick Reference

## Overview

The EdTech platform uses a three-tier role-based access control system to provide appropriate permissions and data access to different user types.

## Roles

### 1. Super Admin

**Description**: Platform-wide administrator with full access to all data and settings.

**Access Level**: Global (all branches, all data)

**Permissions**:
- View and manage all branches
- View all students across all branches
- View and manage all courses globally
- View all payments across all branches
- Configure platform-wide settings
- View audit logs
- Override branch admin decisions
- Create and manage super admin accounts

**Frontend Routes**: `/super-admin/*`

**Backend Routes**: `/api/super-admin/*`

**Middleware**: `requireSuperAdmin()`

**Example Use Cases**:
- Creating new branches
- Viewing platform-wide analytics
- Configuring branding and features
- Reviewing audit logs
- Managing branch admins
- Platform-wide reports

---

### 2. Branch Admin

**Description**: Branch-level administrator with access to their assigned branch only.

**Access Level**: Branch-specific (single branch)

**Permissions**:
- View and manage students in their branch
- View and manage courses in their branch
- Create and manage tests
- Track student attendance
- View and manage payments in their branch
- Send notifications to branch students
- View branch-specific analytics
- Manage study materials

**Frontend Routes**: `/admin/*`

**Backend Routes**: `/api/admin/*`

**Middleware**: `requireAdmin()` (includes branch_admin)

**Data Filtering**: Automatically filtered by `branch_id`

**Example Use Cases**:
- Enrolling students in courses
- Creating and grading tests
- Tracking attendance
- Managing course materials
- Viewing branch reports
- Communicating with students

---

### 3. Student

**Description**: Regular users who take courses and tests.

**Access Level**: Personal (own data only)

**Permissions**:
- View enrolled courses
- Take assigned tests
- View own results
- View own attendance
- Access study materials
- View own payments
- Submit complaints and feedback
- View notifications

**Frontend Routes**: All student routes (no prefix)

**Backend Routes**: `/api/student/*`

**Middleware**: `authMiddleware()` (only requires authentication)

**Data Filtering**: Automatically filtered by `student_id`

**Example Use Cases**:
- Viewing course materials
- Taking scheduled tests
- Checking test results
- Viewing attendance records
- Submitting complaints
- Providing feedback

---

## Access Control Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication                          │
│                  (JWT + httpOnly cookie)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Role Check                               │
│              (extract role from JWT)                        │
└─────────────────┬───────────────────────────┬─────────────┘
                  │                           │
    ┌─────────────┼─────────────┐             │
    │             │             │             │
    ▼             ▼             ▼             ▼
┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  SUPER │   │  BRANCH  │   │ STUDENT  │   │  ADMIN   │
│  ADMIN │   │  ADMIN   │   │          │   │          │
│        │   │          │   │          │   │          │
│Global  │   │  Branch  │   │ Personal │   │  Branch  │
│  data  │   │   data   │   │   data   │   │   data   │
└────────┘   └──────────┘   └──────────┘   └──────────┘
    │             │             │             │
    ▼             ▼             ▼             ▼
/super-admin   /admin        /student      /admin
   /*           /*           /*            /*
```

## Middleware Implementation

### Super Admin Check

```typescript
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }

  next();
};
```

### Admin Check (includes branch_admin)

```typescript
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'branch_admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};
```

### Branch Data Filtering (for branch_admin)

```typescript
// In controller, automatically filter by branch_id
const branchId = req.user.role === 'branch_admin' ? req.user.branch_id : undefined;

const query = supabase
  .from('students')
  .select('*')
  .eq('is_active', true);

if (branchId) {
  query.eq('branch_id', branchId);
}

const { data, error } = await query;
```

## Frontend Route Groups

### (admin) - Admin and Branch Admin

```
frontend/src/app/(admin)/admin/
├── dashboard/
├── students/
├── courses/
├── tests/
├── results/
├── payments/
├── attendance/
├── materials/
├── notifications/
├── complaints/
├── feedback/
└── settings/
```

**Layout**: Checks for admin or branch_admin role

**Auth Guard**:
```typescript
if (user.role !== 'admin' && user.role !== 'branch_admin') {
  redirect('/login');
}
```

### (student) - Students Only

```
frontend/src/app/(student)/
├── dashboard/
├── courses/
├── tests/
├── results/
├── materials/
├── attendance/
├── payments/
├── notifications/
├── complaints/
├── feedback/
├── profile/
└── leaderboard/
```

**Layout**: Checks for student role

**Auth Guard**:
```typescript
if (user.role !== 'student') {
  redirect('/login');
}
```

### (super-admin) - Super Admin Only

```
frontend/src/app/(super-admin)/super-admin/
├── dashboard/
├── branches/
├── students/
├── courses/
├── payments/
├── notifications/
├── complaints/
├── feedback/
├── settings/
└── audit-logs/
```

**Layout**: Checks for super_admin role

**Auth Guard**:
```typescript
if (user.role !== 'super_admin') {
  redirect('/login');
}
```

## Data Access Matrix

| Entity | Super Admin | Branch Admin | Student |
|--------|-------------|--------------|----------|
| All Branches | ✅ | ❌ | ❌ |
| Branch Students (own branch) | ✅ | ✅ | ❌ |
| Own Data | ✅ | ✅ | ✅ |
| All Courses | ✅ | ❌ | ❌ |
| Branch Courses | ✅ | ✅ | Enrolled |
| All Tests | ✅ | ❌ | ❌ |
| Branch Tests | ✅ | ✅ | Assigned |
| All Payments | ✅ | ❌ | ❌ |
| Branch Payments | ✅ | ✅ | Own |
| Platform Settings | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | Own | ❌ |
| Create Branch Admin | ✅ | ❌ | ❌ |
| Create Student | ✅ | ✅ | ❌ |

## Common Patterns

### Checking User Role

```typescript
// Frontend
const { user } = useAuth();

if (user.role === 'super_admin') {
  // Super admin only
} else if (user.role === 'branch_admin') {
  // Branch admin only
} else if (user.role === 'student') {
  // Student only
}
```

### Filtering Data by Role

```typescript
// Backend controller
export const getStudents = async (req: AuthRequest, res: Response) => {
  const { role, branch_id, id } = req.user!;

  let query = supabase.from('users').select('*').eq('role', 'student');

  // Branch admins see only their branch
  if (role === 'branch_admin') {
    query = query.eq('branch_id', branch_id);
  }

  // Students see only themselves
  if (role === 'student') {
    query = query.eq('id', id);
  }

  // Super admins see all (no additional filter)

  const { data, error } = await query;
  // ...
};
```

### Conditional Rendering

```typescript
// Frontend component
{user.role === 'super_admin' && (
  <SuperAdminOnlyComponent />
)}

{(user.role === 'admin' || user.role === 'branch_admin') && (
  <AdminComponent />
)}

{user.role === 'student' && (
  <StudentComponent />
)}
```

## Security Best Practices

1. **Always verify on server side**: Never rely solely on frontend checks
2. **Use middleware**: Apply role checks at route level
3. **Filter by ID**: Always filter by user ID for personal data
4. **Filter by Branch**: Branch admins should only see their branch
5. **Log access**: Log sensitive operations for audit trails
6. **Use JWT**: Secure token-based authentication
7. **httpOnly cookies**: Store tokens securely
8. **Regular audits**: Review permissions regularly

## Testing Role-Based Access

### Test Scenarios

1. **Super Admin**:
   - ✓ Can view all branches
   - ✓ Can create branch admin
   - ✓ Can view all students
   - ✓ Cannot access student routes

2. **Branch Admin**:
   - ✓ Can view own branch students
   - ✓ Cannot view other branches
   - ✓ Can create tests in own branch
   - ✓ Cannot access super admin routes

3. **Student**:
   - ✓ Can view own data
   - ✓ Cannot view other students
   - ✓ Can take assigned tests
   - ✓ Cannot access admin routes

## Migration Notes

When migrating to the 3-role system:

1. **Review existing users**: Ensure all users have valid roles
2. **Update middleware**: Apply new role checks
3. **Update routes**: Add proper middleware to all routes
4. **Update frontend**: Implement role-based routing
5. **Test thoroughly**: Verify access controls for all roles
6. **Audit logs**: Enable audit logging for sensitive operations

## Support

For issues with role-based access:
- Check middleware implementation
- Verify JWT payload contains role
- Check database user roles
- Review route permissions
- Check frontend route groups
