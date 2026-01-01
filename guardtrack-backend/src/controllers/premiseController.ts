import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import path from 'path';

export async function createPremise(req: Request, res: Response) {
  try {
    const { name, address, mapImageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const premise = await prisma.premise.create({
      data: {
        name,
        address: address || null,
        mapImageUrl: mapImageUrl || null,
      },
    });

    res.status(201).json(premise);
  } catch (error) {
    console.error('Create premise error:', error);
    res.status(500).json({ error: 'Failed to create premise' });
  }
}

export async function getPremises(req: Request, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // If user is ANALYST, only return premises they're assigned to
    if (userRole === 'ANALYST' && userId) {
      const assignments = await prisma.analystAssignment.findMany({
        where: { analystId: userId },
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
      });

      const premises = assignments.map((assignment: { premise: any }) => assignment.premise);
      return res.json(premises);
    }

    // ADMIN can see all premises
    const premises = await prisma.premise.findMany({
      include: {
        _count: {
          select: {
            checkpoints: true,
            assignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(premises);
  } catch (error) {
    console.error('Get premises error:', error);
    res.status(500).json({ error: 'Failed to fetch premises' });
  }
}

export async function getPremiseById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // If user is ANALYST, verify they're assigned to this premise
    if (userRole === 'ANALYST' && userId) {
      const assignment = await prisma.analystAssignment.findUnique({
        where: {
          analystId_premiseId: {
            analystId: userId,
            premiseId: id,
          },
        },
      });

      if (!assignment) {
        return res.status(403).json({
          error: 'You are not assigned to this premise. Access denied.',
        });
      }
    }

    const premise = await prisma.premise.findUnique({
      where: { id },
      include: {
        checkpoints: {
          orderBy: [
            { sequence: 'asc' },
            { name: 'asc' },
          ],
        },
        assignments: {
          include: {
            guard: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            startTime: 'desc',
          },
        },
      },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    res.json(premise);
  } catch (error) {
    console.error('Get premise by id error:', error);
    res.status(500).json({ error: 'Failed to fetch premise' });
  }
}

export async function updatePremise(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, address, mapImageUrl } = req.body;

    const premise = await prisma.premise.findUnique({
      where: { id },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    const updatedPremise = await prisma.premise.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(mapImageUrl !== undefined && { mapImageUrl }),
      },
    });

    res.json(updatedPremise);
  } catch (error) {
    console.error('Update premise error:', error);
    res.status(500).json({ error: 'Failed to update premise' });
  }
}

export async function deletePremise(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const premise = await prisma.premise.findUnique({
      where: { id },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    await prisma.premise.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete premise error:', error);
    res.status(500).json({ error: 'Failed to delete premise' });
  }
}

export async function uploadPremiseMap(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const premise = await prisma.premise.findUnique({
      where: { id },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({ error: 'Map image file is required' });
    }

    const port = process.env.PORT || '4000';
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${port}`;

    // File is stored under uploads/maps on the backend
    const relativePath = path.posix.join('/uploads/maps', file.filename);
    const mapImageUrl = `${baseUrl}${relativePath}`;

    const updatedPremise = await prisma.premise.update({
      where: { id },
      data: {
        mapImageUrl,
      },
    });

    res.json(updatedPremise);
  } catch (error) {
    console.error('Upload premise map error:', error);
    res.status(500).json({ error: 'Failed to upload premise map' });
  }
}
