import { Router } from 'express';
import {
  createAnalystAssignment,
  getAnalystAssignments,
  deleteAnalystAssignment,
  getMyAssignedPremises,
} from '../controllers/analystAssignmentController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/analyst-assignments - Create analyst assignment (ADMIN only)
router.post('/', requireRole(UserRole.ADMIN), createAnalystAssignment);

// GET /api/v1/analyst-assignments - Get analyst assignments (ADMIN only)
router.get('/', requireRole(UserRole.ADMIN), getAnalystAssignments);

// DELETE /api/v1/analyst-assignments/:id - Delete analyst assignment (ADMIN only)
router.delete('/:id', requireRole(UserRole.ADMIN), deleteAnalystAssignment);

// GET /api/v1/analyst-assignments/my/premises - Get my assigned premises (ANALYST)
router.get('/my/premises', requireRole(UserRole.ANALYST), getMyAssignedPremises);

export default router;

