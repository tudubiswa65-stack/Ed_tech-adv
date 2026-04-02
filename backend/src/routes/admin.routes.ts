import { Router } from 'express';
import { getDashboardStats } from '../controllers/admin/dashboard.controller';
import {
  getStudents,
  getStudentById,
  createStudent,
  bulkUploadStudents,
  updateStudent,
  deleteStudent,
} from '../controllers/admin/student.controller';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../controllers/admin/branch.controller';
import {
  getAttendance,
  getStudentsForAttendance,
  markAttendance,
  updateAttendance,
} from '../controllers/admin/attendance.controller';
import {
  getPayments,
  recordPayment,
  updatePaymentStatus,
  verifyPayment,
  getPaymentReceipt,
} from '../controllers/admin/payment.controller';
import { getMyPermissions } from '../controllers/admin/permissions.controller';
import { requirePermission } from '../middleware/permissionMiddleware';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rate limiters for sensitive admin operations
const bulkUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: { error: 'Too many bulk upload attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentRecordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 payment records per minute
  message: { error: 'Too many payment recording attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin', 'branch_admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// My Permissions (for branch_admin self-check)
router.get('/my-permissions', getMyPermissions);

// Students
router.get('/students', getStudents);
router.post('/students', requirePermission('add_student'), createStudent);
router.post('/students/bulk', bulkUploadLimiter, upload.single('file'), bulkUploadStudents);
router.get('/students/:id', getStudentById);
router.put('/students/:id', requirePermission('edit_student'), updateStudent);
router.delete('/students/:id', requirePermission('delete_student'), deleteStudent);

// Branches
router.get('/branches', getBranches);
router.post('/branches', createBranch);
router.put('/branches/:id', updateBranch);
router.delete('/branches/:id', deleteBranch);

// Attendance
router.get('/attendance', getAttendance);
router.get('/attendance/students-listing', getStudentsForAttendance);
router.post('/attendance', markAttendance);
router.put('/attendance/:id', updateAttendance);

// Payments
router.get('/payments', getPayments);
router.post('/payments', paymentRecordLimiter, requirePermission('manage_fees'), recordPayment);
router.put('/payments/:id', requirePermission('issue_receipts'), updatePaymentStatus);
router.get('/payments/:id/receipt', requirePermission('issue_receipts'), getPaymentReceipt);
router.get('/payments/:id/verify', verifyPayment);

export default router;