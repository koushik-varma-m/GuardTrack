import { Router } from 'express';
import { register, login, signup, getUsers, updateUser, ldapLogin } from '../controllers/authController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// POST /auth/signup - Public signup for any role
router.post('/signup', signup);

// POST /auth/register - ADMIN only (for admin to create users)
router.post('/register', authMiddleware, requireRole(UserRole.ADMIN), register);

// POST /auth/login - Public
router.post('/login', login);

// POST /auth/ldap-login - Public (LDAP auth)
router.post('/ldap-login', ldapLogin);

// GET /auth/users - Get all users (ADMIN only)
router.get('/users', authMiddleware, requireRole(UserRole.ADMIN), getUsers);

// PUT /auth/users/:id - Update user (ADMIN only)
router.put('/users/:id', authMiddleware, requireRole(UserRole.ADMIN), updateUser);

export default router;
