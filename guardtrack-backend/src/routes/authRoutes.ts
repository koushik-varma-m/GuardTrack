import { Router } from 'express';
import { register, login, signup, getUsers } from '../controllers/authController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// POST /auth/signup - Public signup for any role
router.post('/signup', signup);

// POST /auth/register - ADMIN only (for admin to create users)
router.post('/register', authMiddleware, requireRole(UserRole.ADMIN), register);

// POST /auth/login - Public
router.post('/login', login);

// GET /auth/users - Get all users (ADMIN only)
router.get('/users', authMiddleware, requireRole(UserRole.ADMIN), getUsers);

export default router;
