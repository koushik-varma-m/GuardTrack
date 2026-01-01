import { Router } from 'express';
import { createCheckIn } from '../controllers/checkInController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/checkins - Create check-in (GUARD only)
router.post('/', requireRole(UserRole.GUARD), createCheckIn);

export default router;
