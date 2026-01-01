import { Router } from 'express';
import {
  createCheckpoint,
  getCheckpointsByPremiseId,
  updateCheckpoint,
  deleteCheckpoint,
  getCheckpointQrCode,
  getRotatingCheckpointQrCode,
  getCheckpointStatusPublic,
  getAllCheckpointQRCodes,
} from '../controllers/checkpointController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Public routes (no auth required) - must be registered BEFORE authMiddleware
// GET /api/v1/checkpoints/:id/qr-rotating - Public rotating QR for kiosks
router.get('/:id/qr-rotating', getRotatingCheckpointQrCode);

// GET /api/v1/checkpoints/:id/status-public - Public checkpoint status for kiosk display
router.get('/:id/status-public', getCheckpointStatusPublic);

// All other routes require authentication
router.use(authMiddleware);

// POST /api/v1/checkpoints - Create checkpoint (ADMIN only)
router.post('/', requireRole(UserRole.ADMIN), createCheckpoint);

// GET /api/v1/checkpoints/premise/:premiseId - Get checkpoints by premise (ADMIN and ANALYST)
router.get(
  '/premise/:premiseId',
  requireRole(UserRole.ADMIN, UserRole.ANALYST),
  getCheckpointsByPremiseId
);

// GET /api/v1/checkpoints/premise/:premiseId/qr-codes - Get all QR codes for a premise (ADMIN only)
router.get(
  '/premise/:premiseId/qr-codes',
  requireRole(UserRole.ADMIN),
  getAllCheckpointQRCodes
);

// GET /api/v1/checkpoints/:id/qr - Get checkpoint QR code (ADMIN and ANALYST)
router.get(
  '/:id/qr',
  requireRole(UserRole.ADMIN, UserRole.ANALYST),
  getCheckpointQrCode
);

// PUT /api/v1/checkpoints/:id - Update checkpoint (ADMIN only)
router.put('/:id', requireRole(UserRole.ADMIN), updateCheckpoint);

// DELETE /api/v1/checkpoints/:id - Delete checkpoint (ADMIN only)
router.delete('/:id', requireRole(UserRole.ADMIN), deleteCheckpoint);

export default router;
