import { Router } from 'express';
import { authMiddleware, requireSuperAdmin } from '../middleware/authMiddleware';

// Dashboard controllers
import {
  getDashboardStats,
  getStudentGrowth,
  getRevenueAnalytics,
  getAttendanceTrends,
  getPerformanceAnalytics,
  getTopBranches
} from '../controllers/superAdmin/superAdminDashboard.controller';

// Branch controllers
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  toggleBranchStatus,
  getBranchDetails,
  assignBranchAdmin
} from '../controllers/superAdmin/branches.controller';

// Payment controllers
import {
  getAllPayments,
  getPaymentsByBranch,
  getDefaulters,
  verifyPayment,
  generateReceipt,
  getPaymentAnalytics
} from '../controllers/superAdmin/payments.controller';

// Student controllers
import {
  getAllStudents,
  getStudentProfile,
  getStudentPayments,
  getStudentAttendance,
  updateStudentStatus,
  createStudent,
  deleteStudent
} from '../controllers/superAdmin/students.controller';

// Course controllers
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  assignToBranches,
  toggleCourseStatus,
  getCourseAnalytics
} from '../controllers/superAdmin/courses.controller';

// Notification controllers
import {
  getAllNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  getNotificationStats
} from '../controllers/superAdmin/notifications.controller';

// Complaint controllers
import {
  getAllComplaints,
  getComplaintById,
  resolveComplaint,
  overrideBranchAdmin,
  getComplaintStats
} from '../controllers/superAdmin/complaints.controller';

// Feedback controllers
import {
  getAllFeedback,
  getFeedbackAnalytics,
  getFeedbackByBranch
} from '../controllers/superAdmin/feedback.controller';

// Settings controllers
import {
  getAllSettings,
  updateSetting,
  updateMultipleSettings,
  getBrandingSettings,
  updateBrandingSettings,
  getFeatureFlags,
  resetSettings
} from '../controllers/superAdmin/settings.controller';

// Audit controllers
import {
  getAuditLogs,
  getAuditStats,
  exportAuditLogs
} from '../controllers/superAdmin/audit.controller';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════
// DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/dashboard/stats', requireSuperAdmin, getDashboardStats);
router.get('/dashboard/student-growth', requireSuperAdmin, getStudentGrowth);
router.get('/dashboard/revenue', requireSuperAdmin, getRevenueAnalytics);
router.get('/dashboard/attendance', requireSuperAdmin, getAttendanceTrends);
router.get('/dashboard/performance', requireSuperAdmin, getPerformanceAnalytics);
router.get('/dashboard/top-branches', requireSuperAdmin, getTopBranches);

// ═══════════════════════════════════════════════════════════
// BRANCHES ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/branches', requireSuperAdmin, getAllBranches);
router.get('/branches/:id', requireSuperAdmin, getBranchById);
router.post('/branches', requireSuperAdmin, createBranch);
router.put('/branches/:id', requireSuperAdmin, updateBranch);
router.delete('/branches/:id', requireSuperAdmin, deleteBranch);
router.put('/branches/:id/toggle-status', requireSuperAdmin, toggleBranchStatus);
router.get('/branches/:id/details', requireSuperAdmin, getBranchDetails);
router.post('/branches/:id/assign-admin', requireSuperAdmin, assignBranchAdmin);

// ═══════════════════════════════════════════════════════════
// PAYMENTS ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/payments', requireSuperAdmin, getAllPayments);
router.get('/payments/branch/:branch_id', requireSuperAdmin, getPaymentsByBranch);
router.get('/payments/defaulters', requireSuperAdmin, getDefaulters);
router.put('/payments/:id/verify', requireSuperAdmin, verifyPayment);
router.post('/payments/:id/receipt', requireSuperAdmin, generateReceipt);
router.get('/payments/analytics', requireSuperAdmin, getPaymentAnalytics);

// ═══════════════════════════════════════════════════════════
// STUDENTS ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/students', requireSuperAdmin, getAllStudents);
router.get('/students/:id/profile', requireSuperAdmin, getStudentProfile);
router.get('/students/:id/payments', requireSuperAdmin, getStudentPayments);
router.get('/students/:id/attendance', requireSuperAdmin, getStudentAttendance);
router.put('/students/:id/status', requireSuperAdmin, updateStudentStatus);
router.post('/students', requireSuperAdmin, createStudent);
router.delete('/students/:id', requireSuperAdmin, deleteStudent);

// ═══════════════════════════════════════════════════════════
// COURSES ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/courses', requireSuperAdmin, getAllCourses);
router.get('/courses/:id', requireSuperAdmin, getCourseById);
router.post('/courses', requireSuperAdmin, createCourse);
router.put('/courses/:id', requireSuperAdmin, updateCourse);
router.delete('/courses/:id', requireSuperAdmin, deleteCourse);
router.put('/courses/:id/branch-assign', requireSuperAdmin, assignToBranches);
router.put('/courses/:id/toggle-status', requireSuperAdmin, toggleCourseStatus);
router.get('/courses/analytics', requireSuperAdmin, getCourseAnalytics);

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/notifications', requireSuperAdmin, getAllNotifications);
router.post('/notifications', requireSuperAdmin, createNotification);
router.put('/notifications/:id', requireSuperAdmin, updateNotification);
router.delete('/notifications/:id', requireSuperAdmin, deleteNotification);
router.get('/notifications/stats', requireSuperAdmin, getNotificationStats);

// ═══════════════════════════════════════════════════════════
// COMPLAINTS ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/complaints', requireSuperAdmin, getAllComplaints);
router.get('/complaints/:id', requireSuperAdmin, getComplaintById);
router.put('/complaints/:id/resolve', requireSuperAdmin, resolveComplaint);
router.put('/complaints/:id/override', requireSuperAdmin, overrideBranchAdmin);
router.get('/complaints/stats', requireSuperAdmin, getComplaintStats);

// ═══════════════════════════════════════════════════════════
// FEEDBACK ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/feedback', requireSuperAdmin, getAllFeedback);
router.get('/feedback/analytics', requireSuperAdmin, getFeedbackAnalytics);
router.get('/feedback/branch/:branch_id', requireSuperAdmin, getFeedbackByBranch);

// ═══════════════════════════════════════════════════════════
// SETTINGS ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/settings', requireSuperAdmin, getAllSettings);
router.put('/settings/:key', requireSuperAdmin, updateSetting);
router.put('/settings', requireSuperAdmin, updateMultipleSettings);
router.get('/settings/branding', requireSuperAdmin, getBrandingSettings);
router.put('/settings/branding', requireSuperAdmin, updateBrandingSettings);
router.get('/settings/features', requireSuperAdmin, getFeatureFlags);
router.post('/settings/reset', requireSuperAdmin, resetSettings);

// ═══════════════════════════════════════════════════════════
// AUDIT LOGS ENDPOINTS
// ═══════════════════════════════════════════════════════════
router.get('/audit-logs', requireSuperAdmin, getAuditLogs);
router.get('/audit-logs/stats', requireSuperAdmin, getAuditStats);
router.get('/audit-logs/export', requireSuperAdmin, exportAuditLogs);

export default router;
