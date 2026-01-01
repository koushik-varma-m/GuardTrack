import { Router } from 'express';
import { getAlerts, resolveAlert } from '../controllers/alertController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/alerts - Get alerts with filters (ANALYST and ADMIN only)
router.get('/', requireRole(UserRole.ANALYST, UserRole.ADMIN), getAlerts);

// PATCH /api/v1/alerts/:id/resolve - Resolve alert (ANALYST and ADMIN only)
router.patch('/:id/resolve', requireRole(UserRole.ANALYST, UserRole.ADMIN), resolveAlert);

export default router;

