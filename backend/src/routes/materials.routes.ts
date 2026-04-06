import { Router } from 'express';
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

// Upload a material file to B2 — must be before /:id to avoid conflict
router.post('/upload', materialUploadMiddleware, uploadMaterialFile);

// Get materials by subject — also before /:id
router.get('/subject/:subjectId', getMaterialsBySubject);

// Materials management
router.get('/', getMaterials);
router.post('/', createMaterial);
router.get('/:id', getMaterialById);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);
router.patch('/:id/publish', togglePublish);

// Signed URL for material file access
router.get('/:id/signed-url', getSignedMaterialUrl);

export default router;