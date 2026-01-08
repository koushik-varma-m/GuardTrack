import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { signToken } from '../utils/jwt';
import { UserRole } from '@prisma/client';
import {
  ldapAuthenticate,
  isLdapEnabled,
  generateRandomPassword,
  type LdapUser,
} from '../utils/ldap';

const getEnvBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const mapLdapRole = (memberOf: string[], existingRole?: UserRole): UserRole => {
  const adminGroup = process.env.LDAP_ADMIN_GROUP_DN;
  const analystGroup = process.env.LDAP_ANALYST_GROUP_DN;
  const guardGroup = process.env.LDAP_GUARD_GROUP_DN;
  const defaultRole = (process.env.LDAP_DEFAULT_ROLE as UserRole) || 'GUARD';

  const normalize = (dn: string) => dn.toLowerCase();
  const memberOfNormalized = memberOf.map(normalize);

  if (adminGroup && memberOfNormalized.includes(normalize(adminGroup))) return 'ADMIN';
  if (analystGroup && memberOfNormalized.includes(normalize(analystGroup))) return 'ANALYST';
  if (guardGroup && memberOfNormalized.includes(normalize(guardGroup))) return 'GUARD';

  return existingRole || defaultRole || 'GUARD';
};

async function upsertLdapUser(ldapUser: LdapUser): Promise<{
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  rfidTag: string | null;
  createdAt: Date;
  updatedAt: Date;
}> {
  const existing = await prisma.user.findUnique({
    where: { email: ldapUser.email },
  });

  const role = mapLdapRole(ldapUser.memberOf, existing?.role);

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: ldapUser.name || existing.name,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rfidTag: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  const passwordHash = await bcrypt.hash(generateRandomPassword(), 10);

  return prisma.user.create({
    data: {
      name: ldapUser.name,
      email: ldapUser.email,
      phone: null,
      passwordHash,
      role,
      rfidTag: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      rfidTag: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, phone, password, role, rfidTag } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    if (rfidTag) {
      const existingTagUser = await prisma.user.findUnique({
        where: { rfidTag },
      });

      if (existingTagUser) {
        return res.status(409).json({ error: 'RFID tag already assigned to another user' });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: role as UserRole,
        rfidTag: rfidTag || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rfidTag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

// Public signup endpoint - allows anyone to register with any role
export async function signup(req: Request, res: Response) {
  try {
    const { name, email, phone, password, role, rfidTag } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password, role' });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be ADMIN, ANALYST, or GUARD' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    if (rfidTag) {
      const existingTagUser = await prisma.user.findUnique({
        where: { rfidTag },
      });

      if (existingTagUser) {
        return res.status(409).json({ error: 'RFID tag already assigned to another user' });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: role as UserRole,
        rfidTag: rfidTag || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rfidTag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Auto-login after signup - return token and user
    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      token,
      user,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 'P1011' || error.message?.includes('connection')) {
      res.status(500).json({ 
        error: 'Database connection failed. Please check your database connection or use the Neon SQL console to create users directly.' 
      });
    } else {
      res.status(500).json({ error: 'Failed to sign up', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign JWT
    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    // Return token and user (without passwordHash)
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rfidTag: user.rfidTag,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.code === 'P1011' || error.message?.includes('connection')) {
      res.status(500).json({ 
        error: 'Database connection failed. Please check your database connection.' 
      });
    } else {
      res.status(500).json({ error: 'Failed to login', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  }
}

// LDAP login (authenticate against LDAP, then sync/create local user and issue JWT)
export async function ldapLogin(req: Request, res: Response) {
  try {
    if (!isLdapEnabled()) {
      return res.status(400).json({ error: 'LDAP is not enabled' });
    }

    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const ldapUser = await ldapAuthenticate(username, password);

    const user = await upsertLdapUser(ldapUser);

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rfidTag: user.rfidTag,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('LDAP login error:', error);
    res.status(401).json({
      error: error.message || 'Invalid LDAP credentials',
    });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rfidTag: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// Update user (admin only)
export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, phone, role, password, rfidTag } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate role if provided
    if (role && !Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Ensure email uniqueness if updating
    if (email && email !== existing.email) {
      const emailUser = await prisma.user.findUnique({ where: { email } });
      if (emailUser && emailUser.id !== id) {
        return res.status(409).json({ error: 'Email already in use by another user' });
      }
    }

    // Ensure RFID uniqueness if updating
    if (rfidTag !== undefined && rfidTag !== null && rfidTag !== '') {
      const tagUser = await prisma.user.findUnique({ where: { rfidTag } });
      if (tagUser && tagUser.id !== id) {
        return res.status(409).json({ error: 'RFID tag already assigned to another user' });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role as UserRole;
    if (rfidTag !== undefined) updateData.rfidTag = rfidTag === '' ? null : rfidTag;

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rfidTag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}
