import { Router } from 'express';
import {
  getResults,
  getResultById,
  getTestAnalytics,
  getStudentPerformance,
  exportResultsCSV,
  deleteResult
} from '../controllers/admin/results.controller';

const router = Router();

// Authentication is handled by parent router (admin.routes.ts)
// All admin routes already have authMiddleware + requireRole applied

// Results management
router.get('/', getResults);
router.get('/export', exportResultsCSV);
router.get('/:id', getResultById);
router.delete('/:id', deleteResult);

// Analytics
router.get('/analytics/test/:testId', getTestAnalytics);
router.get('/analytics/student/:studentId', getStudentPerformance);

export default router;