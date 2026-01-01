import { Request, Response } from 'express';
import { getPremiseStatus } from '../services/statusService';
import { prisma } from '../config/prisma';

export async function getPremiseStatusHandler(req: Request, res: Response) {
  try {
    const { premiseId } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!premiseId) {
      return res.status(400).json({ error: 'premiseId is required' });
    }

    // Verify premise exists
    const premise = await prisma.premise.findUnique({
      where: { id: premiseId },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    // If user is ANALYST, verify they're assigned to this premise
    if (userRole === 'ANALYST' && userId) {
      const assignment = await prisma.analystAssignment.findUnique({
        where: {
          analystId_premiseId: {
            analystId: userId,
            premiseId,
          },
        },
      });

      if (!assignment) {
        return res.status(403).json({
          error: 'You are not assigned to this premise. Access denied.',
        });
      }
    }

    // Get status from service
    const status = await getPremiseStatus(premiseId);

    res.json(status);
  } catch (error) {
    if (error instanceof Error && error.message === 'Checkpoint sequence not configured') {
      return res.status(400).json({
        error: 'Checkpoint sequence not configured. Please set checkpoint order for this premise.',
        code: 'SEQUENCE_NOT_CONFIGURED',
      });
    }
    if (error instanceof Error && error.message === 'Checkpoint interval not configured') {
      return res.status(400).json({
        error: 'Checkpoint intervals not configured. Please set intervals on all checkpoints.',
        code: 'INTERVAL_NOT_CONFIGURED',
      });
    }
    console.error('Get premise status error:', error);
    res.status(500).json({ error: 'Failed to fetch premise status' });
  }
}
