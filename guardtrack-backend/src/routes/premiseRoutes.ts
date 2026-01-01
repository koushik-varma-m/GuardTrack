import { Router } from 'express';
import {
  createPremise,
  getPremises,
  getPremiseById,
  updatePremise,
  deletePremise,
  uploadPremiseMap,
} from '../controllers/premiseController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// File upload configuration for premise maps
const mapsUploadDir = path.join(__dirname, '..', '..', 'uploads', 'maps');
if (!fs.existsSync(mapsUploadDir)) {
  fs.mkdirSync(mapsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, mapsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const timestamp = Date.now();
    const id = (req.params as { id?: string }).id || 'premise';
    cb(null, `premise-${id}-${timestamp}${ext}`);
  },
});

const upload = multer({ storage });

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/premises - Create premise (ADMIN only)
router.post('/', requireRole(UserRole.ADMIN), createPremise);

// GET /api/v1/premises - Get all premises (ADMIN and ANALYST)
router.get('/', requireRole(UserRole.ADMIN, UserRole.ANALYST), getPremises);

// GET /api/v1/premises/:id - Get premise by ID (ADMIN and ANALYST)
router.get('/:id', requireRole(UserRole.ADMIN, UserRole.ANALYST), getPremiseById);

// PUT /api/v1/premises/:id - Update premise (ADMIN only)
router.put('/:id', requireRole(UserRole.ADMIN), updatePremise);

// PUT /api/v1/premises/:id/map - Upload / replace premise map image (ADMIN only)
router.put(
  '/:id/map',
  requireRole(UserRole.ADMIN),
  upload.single('mapImage'),
  uploadPremiseMap
);

// DELETE /api/v1/premises/:id - Delete premise (ADMIN only)
router.delete('/:id', requireRole(UserRole.ADMIN), deletePremise);

export default router;
