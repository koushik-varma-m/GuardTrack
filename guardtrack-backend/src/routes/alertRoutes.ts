import { Router } from 'express';
import { getAlerts, resolveAlert } from '../controllers/alertController';
import { escalateAlert } from '../controllers/alertEscalationController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/alerts - Get alerts with filters (ANALYST and ADMIN only)
router.get('/', requireRole(UserRole.ANALYST, UserRole.ADMIN), getAlerts);

// PATCH /api/v1/alerts/:id/resolve - Resolve alert (ANALYST and ADMIN only)
router.patch('/:id/resolve', requireRole(UserRole.ANALYST, UserRole.ADMIN), resolveAlert);

// PATCH /api/v1/alerts/:id/escalate - Escalate RED alert to admins (ANALYST and ADMIN only)
router.patch('/:id/escalate', requireRole(UserRole.ANALYST, UserRole.ADMIN), escalateAlert);

export default router;
