import { Router } from 'express';
import {
  getProfile,
  getActiveAssignment,
  getMyCheckpoints,
  createMyCheckIn,
  getMyCheckInHistory,
  canScanCheckpoint,
  getNextCheckpoint,
} from '../controllers/meController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require GUARD role
router.use(requireRole(UserRole.GUARD));

// GET /api/v1/me/profile - Get current guard's profile
router.get('/profile', getProfile);

// GET /api/v1/me/assignments/active - Get active assignment
router.get('/assignments/active', getActiveAssignment);

// GET /api/v1/me/checkpoints - Get checkpoints for active assignment
router.get('/checkpoints', getMyCheckpoints);

// GET /api/v1/me/checkpoints/next - Get next expected checkpoint (sequence)
router.get('/checkpoints/next', getNextCheckpoint);

// GET /api/v1/me/checkpoints/can-scan - Pre-check if guard can scan checkpoint (checkpointId in query)
router.get('/checkpoints/can-scan', canScanCheckpoint);

// POST /api/v1/me/checkins - Create check-in
router.post('/checkins', createMyCheckIn);

// GET /api/v1/me/checkins/history - Get check-in history
router.get('/checkins/history', getMyCheckInHistory);

export default router;
