import { Router } from 'express';
import { requireRole, authMiddleware } from '../middleware/auth';
import { overrideCheckInStatus } from '../controllers/overrideController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

// PUT /api/v1/checkins/:id/override - Analysts/Admins can override to GREEN with a note
router.put('/checkins/:id/override', requireRole(UserRole.ADMIN, UserRole.ANALYST), overrideCheckInStatus);

export default router;
