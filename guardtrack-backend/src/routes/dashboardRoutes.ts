import { Router } from 'express';
import { getPremiseStatusHandler } from '../controllers/dashboardController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/dashboard/premises/:premiseId/status - Get premise status (ANALYST and ADMIN only)
router.get(
  '/premises/:premiseId/status',
  requireRole(UserRole.ANALYST, UserRole.ADMIN),
  getPremiseStatusHandler
);

export default router;

