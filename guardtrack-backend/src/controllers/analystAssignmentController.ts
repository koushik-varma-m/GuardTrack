import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function createAnalystAssignment(req: Request, res: Response) {
  try {
    const { analystId, premiseId } = req.body;

    if (!analystId || !premiseId) {
      return res.status(400).json({
        error: 'Missing required fields: analystId, premiseId',
      });
    }

    // Verify analyst exists and has ANALYST role
    const analyst = await prisma.user.findUnique({
      where: { id: analystId },
    });

    if (!analyst) {
      return res.status(404).json({ error: 'Analyst not found' });
    }

    if (analyst.role !== 'ANALYST') {
      return res.status(400).json({ error: 'User is not an analyst' });
    }

    // Verify premise exists
    const premise = await prisma.premise.findUnique({
      where: { id: premiseId },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    // Check if assignment already exists
    const existing = await prisma.analystAssignment.findUnique({
      where: {
        analystId_premiseId: {
          analystId,
          premiseId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Analyst is already assigned to this premise' });
    }

    const assignment = await prisma.analystAssignment.create({
      data: {
        analystId,
        premiseId,
      },
      include: {
        analyst: {
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
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create analyst assignment error:', error);
    res.status(500).json({ error: 'Failed to create analyst assignment' });
  }
}

export async function getAnalystAssignments(req: Request, res: Response) {
  try {
    const { analystId, premiseId } = req.query;

    const where: any = {};

    if (analystId) {
      where.analystId = analystId as string;
    }

    if (premiseId) {
      where.premiseId = premiseId as string;
    }

    const assignments = await prisma.analystAssignment.findMany({
      where,
      include: {
        analyst: {
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
        createdAt: 'desc',
      },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get analyst assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch analyst assignments' });
  }
}

export async function deleteAnalystAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const assignment = await prisma.analystAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Analyst assignment not found' });
    }

    await prisma.analystAssignment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete analyst assignment error:', error);
    res.status(500).json({ error: 'Failed to delete analyst assignment' });
  }
}

export async function getMyAssignedPremises(req: Request, res: Response) {
  try {
    const analystId = req.user?.id;

    if (!analystId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const assignments = await prisma.analystAssignment.findMany({
      where: { analystId },
      include: {
        premise: {
          include: {
            _count: {
              select: {
                checkpoints: true,
                assignments: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const premises = assignments.map((assignment: { premise: any }) => assignment.premise);

    res.json(premises);
  } catch (error) {
    console.error('Get my assigned premises error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned premises' });
  }
}

