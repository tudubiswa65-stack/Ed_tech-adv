# Super Admin Control Panel - Quick Setup Guide

## Overview

This guide will help you set up and deploy the Super Admin Control Panel for the EdTech Platform.

## Prerequisites

- PostgreSQL 14+ database (Supabase recommended)
- Node.js 18+
- npm or yarn
- Git

## Installation Steps

### 1. Apply Database Migration

Run the SQL migration to add super admin tables:

```bash
cd backend
psql $DATABASE_URL -f migrations/super_admin_tables.sql
```

Or use the Supabase SQL Editor to run `backend/migrations/super_admin_tables.sql`.

### 2. Create Super Admin User

After migration, create a super admin user in your database:

```sql
-- Option 1: Direct SQL insert (you'll need to bcrypt hash the password)
INSERT INTO users (name, email, password_hash, role, status, is_active)
VALUES (
  'Super Admin',
  'superadmin@yourdomain.com',
  '$2a$12$YourBcryptHashedPasswordHere',
  'super_admin',
  'ACTIVE',
  true
);

-- Option 2: Use the API after admin login
POST /api/auth/admin/login
{
  "email": "admin@example.com",
  "password": "your_password"
}
-- Then use JWT token to create super admin user
```

### 3. Backend Setup

```bash
cd backend
npm install
npm run build
npm run dev
```

The backend will be available at `http://localhost:5000`

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 5. Access Super Admin Panel

1. Navigate to `http://localhost:3000`
2. Login with your super admin credentials
3. The system will automatically redirect to `/super-admin/dashboard`

## Configuration

### Environment Variables

Ensure these environment variables are set in your `.env` file:

```bash
# Backend
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Super Admin Settings

Access `/super-admin/settings` to configure:
- Platform branding (name, tagline, logo, colors)
- Feature flags (maintenance mode, registration)
- Platform settings (currency, timezone)
- Upload settings (max size, allowed types)

## API Endpoints

All Super Admin endpoints are prefixed with `/api/super-admin`:

### Dashboard
- GET `/dashboard/stats` - Platform overview
- GET `/dashboard/student-growth` - Monthly growth
- GET `/dashboard/revenue` - Revenue analytics
- GET `/dashboard/attendance` - Attendance trends
- GET `/dashboard/performance` - Performance metrics
- GET `/dashboard/top-branches` - Top branches

### Branches
- GET/POST `/branches` - List/create branches
- GET/PUT/DELETE `/branches/:id` - Branch CRUD
- PUT `/branches/:id/toggle-status` - Activate/deactivate
- GET `/branches/:id/details` - Detailed analytics
- POST `/branches/:id/assign-admin` - Assign admin

### Payments
- GET `/payments` - All payments
- GET `/payments/branch/:id` - Branch payments
- GET `/payments/defaulters` - Defaulter list
- PUT `/payments/:id/verify` - Verify payment
- POST `/payments/:id/receipt` - Generate receipt
- GET `/payments/analytics` - Payment analytics

### Students
- GET/POST `/students` - List/create students
- GET `/students/:id/profile` - Student profile
- GET `/students/:id/payments` - Payment history
- GET `/students/:id/attendance` - Attendance records
- PUT `/students/:id/status` - Update status
- DELETE `/students/:id` - Delete student

### Courses
- GET/POST `/courses` - List/create courses
- GET/PUT/DELETE `/courses/:id` - Course CRUD
- PUT `/courses/:id/branch-assign` - Assign to branches
- PUT `/courses/:id/toggle-status` - Toggle status
- GET `/courses/analytics` - Course analytics

### Notifications
- GET/POST `/notifications` - List/create notifications
- PUT/DELETE `/notifications/:id` - Update/delete
- GET `/notifications/stats` - Notification stats

### Complaints
- GET `/complaints` - All complaints
- GET `/complaints/:id` - Complaint details
- PUT `/complaints/:id/resolve` - Resolve complaint
- PUT `/complaints/:id/override` - Override branch admin
- GET `/complaints/stats` - Complaint statistics

### Feedback
- GET `/feedback` - All feedback
- GET `/feedback/analytics` - Feedback analytics
- GET `/feedback/branch/:id` - Branch feedback

### Settings
- GET `/settings` - All settings
- PUT `/settings/:key` - Update setting
- PUT `/settings` - Bulk update
- GET `/settings/branding` - Branding settings
- PUT `/settings/branding` - Update branding
- GET `/settings/features` - Feature flags
- POST `/settings/reset` - Reset to defaults

### Audit Logs
- GET `/audit-logs` - All logs
- GET `/audit-logs/stats` - Log statistics
- GET `/audit-logs/export` - Export logs

## Features Overview

### 1. Dashboard
- Platform-wide statistics
- Student growth charts
- Revenue analytics
- Attendance overview
- Top performing branches

### 2. Branch Management
- Full CRUD operations
- Status management
- Branch analytics
- Admin assignment

### 3. Payment Management
- Global payment view
- Branch filtering
- Defaulter tracking
- Payment verification
- Receipt generation

### 4. Student Management
- Global student list
- Detailed profiles
- Payment history
- Attendance records
- Status management

### 5. Course Management
- Global course view
- Branch assignment
- Status management
- Pricing control

### 6. Notification System
- Platform-wide notifications
- Targeted notifications
- Priority levels
- Scheduling support

### 7. Complaint Management
- Global complaint view
- Resolution workflow
- Override capability

### 8. Feedback Analytics
- Rating distribution
- Type breakdown
- Monthly trends
- Branch comparison

### 9. Global Settings
- Branding customization
- Feature flags
- Platform configuration
- Upload settings

### 10. Audit Logging
- Action tracking
- User attribution
- IP logging
- Export functionality

## Security

### Authentication
- JWT-based authentication
- Role-based access control
- Session management

### Authorization
- `requireSuperAdmin()` middleware on all endpoints
- Branch data filtering for branch admins
- Audit logging for sensitive actions

### Best Practices
1. Use strong passwords for super admin accounts
2. Enable two-factor authentication when available
3. Regularly review audit logs
4. Rotate JWT secrets periodically
5. Keep dependencies updated

## Troubleshooting

### Can't access Super Admin Panel
- Verify user has `role = 'super_admin'` in database
- Check JWT token is valid
- Ensure middleware is properly configured

### Database errors
- Verify migration was applied successfully
- Check database permissions
- Ensure all required columns exist

### API errors
- Check backend logs
- Verify environment variables
- Ensure Supabase credentials are correct

### Frontend issues
- Clear browser cache
- Check API URL configuration
- Verify npm dependencies are installed

## Development

### Running tests
```bash
cd backend
npm test
```

### Building for production
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

### Code structure
```
backend/src/
├── controllers/superAdmin/  # Super Admin controllers
├── routes/superAdmin.routes.ts  # Route definitions
├── middleware/authMiddleware.ts  # Auth middleware
└── migrations/  # SQL migrations

frontend/src/
├── app/(super-admin)/super-admin/  # Super Admin pages
└── components/super-admin/  # Shared components
```

## Support

For issues or questions:
1. Check `SUPER_ADMIN_IMPLEMENTATION.md` for detailed documentation
2. Review audit logs for debugging
3. Check browser console for frontend errors
4. Review backend logs for API errors

## Next Steps

After initial setup:
1. Create additional super admin users if needed
2. Configure platform branding
3. Set up feature flags
4. Review and customize settings
5. Monitor dashboard analytics
6. Set up automated backups

## Additional Resources

- Implementation Guide: `SUPER_ADMIN_IMPLEMENTATION.md`
- Migration Guide: `backend/migrations/README.md`
- API Documentation: Available at `/api/super-admin/*`
- Database Schema: `schema_complete.sql`

---

**Super Admin Control Panel is now ready!** 🚀
