import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AlertStatus } from '@prisma/client';

export async function getAlerts(req: Request, res: Response) {
  try {
    const { status, premiseId, guardId } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const where: any = {};

    if (status) {
      where.status = status as AlertStatus;
    }

    // If user is ANALYST, only show alerts for premises they're assigned to
    if (userRole === 'ANALYST' && userId) {
      const analystAssignments = await prisma.analystAssignment.findMany({
        where: { analystId: userId },
        select: { premiseId: true },
      });

      const assignedPremiseIds = analystAssignments.map((a: { premiseId: string }) => a.premiseId);

      if (assignedPremiseIds.length === 0) {
        // Analyst has no assignments, return empty array
        return res.json([]);
      }

      where.assignment = {
        premiseId: {
          in: assignedPremiseIds,
        },
      };
    } else {
      // ADMIN can filter by premiseId if provided
      if (premiseId) {
        where.assignment = {
          premiseId: premiseId as string,
        };
      }
    }

    if (guardId) {
      where.guardId = guardId as string;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        guard: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        assignment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            premise: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        triggeredAt: 'desc',
      },
    });

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
}

export async function resolveAlert(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const resolvedBy = req.user?.id ?? null;

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.status === 'RESOLVED') {
      return res.status(400).json({ error: 'Alert is already resolved' });
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
      },
      include: {
        guard: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
          },
        },
        assignment: {
          select: {
            id: true,
            premise: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedAlert);
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
}
