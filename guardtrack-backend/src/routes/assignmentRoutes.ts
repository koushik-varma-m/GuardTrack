import { Router } from 'express';
import {
  createAssignment,
  getAssignments,
  getActiveAssignmentsForGuard,
  updateAssignment,
  deleteAssignment,
} from '../controllers/assignmentController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/assignments - Create assignment (ADMIN only)
router.post('/', requireRole(UserRole.ADMIN), createAssignment);

// GET /api/v1/assignments/me/active - Get active assignments for current guard (GUARD only)
router.get('/me/active', requireRole(UserRole.GUARD), getActiveAssignmentsForGuard);

// GET /api/v1/assignments - Get assignments with filters (ADMIN and ANALYST)
router.get('/', requireRole(UserRole.ADMIN, UserRole.ANALYST), getAssignments);

// PUT /api/v1/assignments/:id - Update assignment (ADMIN only)
router.put('/:id', requireRole(UserRole.ADMIN), updateAssignment);

// DELETE /api/v1/assignments/:id - Delete assignment (ADMIN only)
router.delete('/:id', requireRole(UserRole.ADMIN), deleteAssignment);

export default router;
