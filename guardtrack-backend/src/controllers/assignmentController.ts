import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function createAssignment(req: Request, res: Response) {
  try {
    const { guardId, premiseId, startTime, endTime } = req.body;

    if (!guardId || !premiseId || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: guardId, premiseId, startTime, endTime' 
      });
    }

    // Validate guard exists
    const guard = await prisma.user.findUnique({
      where: { id: guardId },
    });

    if (!guard) {
      return res.status(404).json({ error: 'Guard not found' });
    }

    if (guard.role !== 'GUARD') {
      return res.status(400).json({ error: 'User is not a guard' });
    }

    // Validate premise exists
    const premise = await prisma.premise.findUnique({
      where: { id: premiseId },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    const assignment = await prisma.guardAssignment.create({
      data: {
        guardId,
        premiseId,
        startTime: start,
        endTime: end,
        intervalMinutes: 0, // interval now controlled per checkpoint
      },
      include: {
        guard: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        premise: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
}

export async function getAssignments(req: Request, res: Response) {
  try {
    const { guardId, premiseId, date } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const where: any = {};

    if (guardId) {
      where.guardId = guardId as string;
    }

    if (premiseId) {
      where.premiseId = premiseId as string;
    }

    // Analysts can only view assignments for premises they're assigned to
    if (userRole === 'ANALYST') {
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const analystAssignments = await prisma.analystAssignment.findMany({
        where: { analystId: userId },
        select: { premiseId: true },
      });
      const assignedPremiseIds = analystAssignments.map((a) => a.premiseId);

      if (assignedPremiseIds.length === 0) {
        return res.json([]);
      }

      if (where.premiseId) {
        if (!assignedPremiseIds.includes(where.premiseId)) {
          return res.json([]);
        }
      } else {
        where.premiseId = { in: assignedPremiseIds };
      }
    }

    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      where.startTime = {
        lte: endOfDay,
      };
      where.endTime = {
        gte: startOfDay,
      };
    }

    const assignments = await prisma.guardAssignment.findMany({
      where,
      include: {
        guard: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        premise: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}

export async function getUpcomingAssignments(req: Request, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsePositiveInt = (value: unknown, fallback: number) => {
      const n = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
      if (!Number.isFinite(n) || n <= 0) return fallback;
      return n;
    };

    const days = Math.min(parsePositiveInt(req.query.days, 7), 90);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);

    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const where: any = {
      startTime: { gt: now, lte: until },
    };

    if (userRole === 'GUARD') {
      where.guardId = userId;
    } else if (userRole === 'ANALYST') {
      const analystAssignments = await prisma.analystAssignment.findMany({
        where: { analystId: userId },
        select: { premiseId: true },
      });
      const assignedPremiseIds = analystAssignments.map((a) => a.premiseId);
      if (assignedPremiseIds.length === 0) {
        return res.json([]);
      }
      where.premiseId = { in: assignedPremiseIds };
    } else if (userRole === 'ADMIN') {
      if (typeof req.query.guardId === 'string' && req.query.guardId) {
        where.guardId = req.query.guardId;
      }
      if (typeof req.query.premiseId === 'string' && req.query.premiseId) {
        where.premiseId = req.query.premiseId;
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const assignments = await prisma.guardAssignment.findMany({
      where,
      include: {
        guard: { select: { id: true, name: true, email: true } },
        premise: { select: { id: true, name: true, address: true } },
      },
      orderBy: { startTime: 'asc' },
      take: limit,
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get upcoming assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming assignments' });
  }
}

export async function getActiveAssignmentsForGuard(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const now = new Date();

    const assignments = await prisma.guardAssignment.findMany({
      where: {
        guardId,
        startTime: {
          lte: now,
        },
        endTime: {
          gte: now,
        },
      },
      include: {
        premise: {
          include: {
            checkpoints: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get active assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch active assignments' });
  }
}

export async function updateAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { guardId, premiseId, startTime, endTime } = req.body;

    const assignment = await prisma.guardAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Validate if guardId is being updated
    if (guardId) {
      const guard = await prisma.user.findUnique({
        where: { id: guardId },
      });

      if (!guard || guard.role !== 'GUARD') {
        return res.status(400).json({ error: 'Invalid guard' });
      }
    }

    // Validate if premiseId is being updated
    if (premiseId) {
      const premise = await prisma.premise.findUnique({
        where: { id: premiseId },
      });

      if (!premise) {
        return res.status(404).json({ error: 'Premise not found' });
      }
    }

    // Validate time range if times are being updated
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : assignment.startTime;
      const end = endTime ? new Date(endTime) : assignment.endTime;

      if (start >= end) {
        return res.status(400).json({ error: 'startTime must be before endTime' });
      }
    }

    const updatedAssignment = await prisma.guardAssignment.update({
      where: { id },
      data: {
        ...(guardId && { guardId }),
        ...(premiseId && { premiseId }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
      },
      include: {
        guard: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        premise: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(updatedAssignment);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
}

export async function deleteAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const assignment = await prisma.guardAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.guardAssignment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
}
