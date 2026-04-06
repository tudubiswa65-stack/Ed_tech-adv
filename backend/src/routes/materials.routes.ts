import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  togglePublish,
  getMaterialsBySubject,
  getSignedMaterialUrl,
  uploadMaterialFile,
  materialUploadMiddleware,
} from '../controllers/admin/materials.controller';

const router = Router();

// Materials management
router.get('/', getMaterials);
router.get('/:id', getMaterialById);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);
router.patch('/:id/publish', togglePublish);

// Get materials by subject
router.get('/subject/:subjectId', getMaterialsBySubject);

// Signed URL for material file access
router.get('/:id/signed-url', getSignedMaterialUrl);

// Upload a material file to B2; returns the B2 object key + file size
router.post('/upload', materialUploadMiddleware, uploadMaterialFile);

export default router;