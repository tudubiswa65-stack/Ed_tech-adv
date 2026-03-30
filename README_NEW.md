# EdTech White-Label Platform

A comprehensive, multi-tenant educational platform with support for multiple branches, role-based access control, and a complete learning management system.

## Features

### Core Functionality
- **Multi-Institute Support**: Complete data isolation per institute
- **Multi-Branch Management**: Admins can manage multiple campus branches
- **Role-Based Access Control**: Three-tier system (super_admin, branch_admin, student)
- **White-Label Ready**: Customizable branding, colors, and logos
- **Payment Processing**: Integrated payment tracking with receipts
- **Test Management**: Create, schedule, and manage assessments
- **Attendance Tracking**: Daily attendance monitoring
- **Study Materials**: Upload and organize course materials
- **Analytics & Reporting**: Comprehensive dashboards and reports

### User Roles

#### Super Admin
- Platform-wide administration
- Manage all branches globally
- View all data across the platform
- Configure platform settings
- View audit logs

#### Branch Admin
- Branch-specific administration
- Manage students and courses
- Create and manage tests
- Track attendance and payments
- View branch-specific analytics

#### Student
- View enrolled courses
- Take scheduled tests
- View results and analytics
- Access study materials
- Track attendance and payments

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Queue System**: Redis + BullMQ
- **Authentication**: JWT with httpOnly cookies

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15 (Alpine)
- **Cache/Queue**: Redis 7 (Alpine)
- **Deployment**: Railway-ready

## Project Structure

```
edtech-platform/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers (admin, student, superAdmin)
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── routes/         # API route definitions
│   │   ├── types/          # TypeScript types
│   │   ├── config/         # Configuration
│   │   ├── db/            # Database setup and migrations
│   │   ├── queue/         # Background job processing
│   │   └── utils/         # Helper functions
│   ├── migrations/        # Database migration files
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   │   ├── (admin)/   # Admin route group
│   │   │   ├── (student)/ # Student route group
│   │   │   └── (super-admin)/ # Super admin route group
│   │   ├── components/    # Reusable components
│   │   ├── lib/          # Utilities and API client
│   │   └── types/        # TypeScript types
│   └── package.json
├── schema_optimized.sql   # Optimized 12-table schema
├── MIGRATION_GUIDE.md    # Schema migration guide
├── docker-compose.yml     # Local development setup
└── package.json           # Root package (workspaces)
```

## Database Schema

The platform uses an optimized 12-table schema for maximum efficiency and simplicity:

1. **settings** - Unified configuration (branding, institute, platform, features)
2. **branches** - Multi-branch support
3. **users** - Unified user table for all roles
4. **courses** - Courses with modules as JSONB
5. **enrollments** - Student enrollments
6. **attendance** - Attendance records
7. **tests** - Test definitions
8. **questions** - Test questions
9. **results** - Results and test assignments
10. **payments** - Payments and receipts
11. **study_materials** - Materials and view tracking
12. **notifications** - Unified notifications, complaints, feedback, audit logs

For detailed schema information, see `schema_optimized.sql`.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (optional, for background jobs)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd edtech-platform
```

2. **Install dependencies**
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. **Set up environment variables**

Create `.env` files for both frontend and backend:

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/edtech
JWT_SECRET=your-secret-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
REDIS_URL=redis://localhost:6379
SAFE_MODE=false
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. **Set up the database**

```bash
# Create database
createdb edtech

# Apply schema
psql edtech -f schema_optimized.sql
```

5. **Start development servers**

**Option 1: Using Docker Compose (Recommended)**
```bash
docker-compose up
```

**Option 2: Manual Setup**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

6. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Default Users

The schema includes sample users with password `Password123!`:

- **Super Admin**: superadmin@edtech.com
- **Branch Admin**: branchadmin@edtech.com
- **Student**: alice@student.com

## API Documentation

### Authentication

All API endpoints (except login) require authentication via JWT token in httpOnly cookie.

### Base URL
`/api`

### Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/register` - User registration

#### Admin Endpoints (admin/branch_admin)
- Students: `/admin/students/*`
- Courses: `/admin/courses/*`
- Tests: `/admin/tests/*`
- Results: `/admin/results/*`
- Payments: `/admin/payments/*`
- Attendance: `/admin/attendance/*`
- Materials: `/admin/materials/*`
- Notifications: `/admin/notifications/*`

#### Super Admin Endpoints
- Dashboard: `/super-admin/dashboard/*`
- Branches: `/super-admin/branches/*`
- Global Students: `/super-admin/students/*`
- Global Courses: `/super-admin/courses/*`
- Global Payments: `/super-admin/payments/*`
- Settings: `/super-admin/settings/*`
- Audit Logs: `/super-admin/audit-logs/*`

#### Student Endpoints
- Dashboard: `/student/dashboard`
- Tests: `/student/tests/*`
- Results: `/student/results/*`
- Materials: `/student/materials/*`
- Profile: `/student/profile/*`

For complete API documentation, see `API.md`.

## Development

### Backend Development

```bash
cd backend
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run test      # Run tests
```

### Frontend Development

```bash
cd frontend
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run linter
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Deployment

### Railway Deployment

The platform is ready for Railway deployment:

1. **Push code to GitHub**
2. **Connect repository to Railway**
3. **Configure environment variables**
4. **Deploy**

Railway will automatically:
- Detect Node.js and install dependencies
- Set up PostgreSQL and Redis
- Build and deploy both frontend and backend

### Manual Deployment

1. **Build applications**
```bash
npm run build
```

2. **Set environment variables** on your hosting platform

3. **Deploy backend and frontend** to your hosting platform

## Architecture

### Frontend Architecture

- **Route Groups**: `(admin)`, `(student)`, `(super-admin)` for role-based separation
- **Component Organization**: Reusable components in `components/`
- **API Layer**: Centralized API client with axios interceptors
- **Auth Context**: Custom AuthProvider with JWT-based session management

### Backend Architecture

- **MVC Pattern**: Controllers organized by role
- **Route Organization**: Modular route files per domain
- **Middleware**: Auth middleware with role-based access control
- **Job Queue System**: Redis-based job queues for async processing

### Database Design

- **Normalized Schema**: Optimized 12-table structure
- **Row Level Security**: PostgreSQL RLS for data isolation
- **Indexing**: Comprehensive indexes for performance
- **JSONB Fields**: Flexible data structures where appropriate

## Security

- **JWT Authentication**: Secure httpOnly cookie-based sessions
- **Password Hashing**: bcrypt with 12 rounds
- **Role-Based Access Control**: Three-tier permission system
- **Data Isolation**: Institute and branch-level data separation
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Prevention**: Proper output sanitization
- **CORS**: Configured for allowed origins

## Performance

- **Database Indexes**: Optimized indexes on all frequently queried columns
- **Pagination**: Large datasets are paginated
- **Caching**: Redis caching for frequently accessed data
- **Background Jobs**: Async processing for non-critical tasks
- **Lazy Loading**: Frontend components load on demand

## Monitoring & Logging

- **Application Logs**: Structured logging throughout the application
- **Audit Logs**: All admin actions are logged
- **Error Tracking**: Centralized error handling
- **Performance Monitoring**: API response time tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the migration guide: `MIGRATION_GUIDE.md`

## Changelog

### Version 3.0.0 (Current)
- Optimized 12-table schema
- Unified notifications system
- Improved role-based access control
- Better performance and maintainability

### Version 2.0.0
- Added super admin role
- Multi-branch support
- Audit logging
- Enhanced notifications

### Version 1.0.0
- Initial release
- Basic EdTech functionality
- Admin and student panels

## Roadmap

- [ ] Mobile app support
- [ ] Advanced analytics dashboard
- [ ] Video conferencing integration
- [ ] Certificate generation
- [ ] Multi-language support
- [ ] Advanced reporting
- [ ] API rate limiting
- [ ] Two-factor authentication
