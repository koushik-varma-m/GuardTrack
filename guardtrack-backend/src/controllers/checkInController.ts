import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function createCheckIn(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { checkpointId, assignmentId } = req.body;

    if (!checkpointId) {
      return res.status(400).json({ error: 'checkpointId is required' });
    }

    // Verify checkpoint exists
    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: checkpointId },
      include: {
        premise: true,
      },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    let assignment;

    // If assignmentId is provided, use it; otherwise find active assignment
    if (assignmentId) {
      assignment = await prisma.guardAssignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Verify assignment belongs to this guard
      if (assignment.guardId !== guardId) {
        return res.status(403).json({ error: 'Assignment does not belong to this guard' });
      }

      // Verify assignment is for the same premise as checkpoint
      if (assignment.premiseId !== checkpoint.premiseId) {
        return res.status(400).json({ 
          error: 'Assignment and checkpoint must belong to the same premise' 
        });
      }
    } else {
      // Find active assignment for this guard and premise
      const now = new Date();

      assignment = await prisma.guardAssignment.findFirst({
        where: {
          guardId,
          premiseId: checkpoint.premiseId,
          startTime: {
            lte: now,
          },
          endTime: {
            gte: now,
          },
        },
      });

    if (!assignment) {
      return res.status(404).json({ 
        error: 'No active assignment found for this guard and premise' 
      });
    }

    // Enforce sequential scanning order for this assignment/premise
    const premiseCheckpoints = await prisma.checkpoint.findMany({
      where: { premiseId: checkpoint.premiseId },
      select: { id: true, sequence: true, name: true },
      orderBy: { sequence: 'asc' },
    });

    const targetCheckpoint = premiseCheckpoints.find((c) => c.id === checkpointId);
    if (!targetCheckpoint || !targetCheckpoint.sequence) {
      return res.status(400).json({
        error: 'Checkpoint sequence not configured. Please contact an administrator.',
        code: 'SEQUENCE_NOT_CONFIGURED',
      });
    }

    const scannedCheckpoints = await prisma.checkIn.findMany({
      where: {
        guardId,
        assignmentId: assignment.id,
      },
      select: {
        checkpointId: true,
        checkpoint: {
          select: { sequence: true },
        },
      },
    });

    const scannedIds = new Set(scannedCheckpoints.map((c) => c.checkpointId));
    const nextCheckpoint = premiseCheckpoints.find((c) => !scannedIds.has(c.id));

    if (nextCheckpoint && nextCheckpoint.id !== checkpointId) {
      return res.status(400).json({
        error: `Please scan checkpoints in order. Next expected checkpoint: "${nextCheckpoint.name}".`,
        code: 'SEQUENCE_ENFORCED',
        nextCheckpointId: nextCheckpoint.id,
        nextCheckpointName: nextCheckpoint.name,
      });
    }
    }

    // Verify assignment is currently active
    const now = new Date();
    if (now < assignment.startTime || now > assignment.endTime) {
      return res.status(400).json({ error: 'Assignment is not currently active' });
    }

    // Compute status
    const originalStatus = 'GREEN';

    // Create check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        guardId,
        checkpointId,
        assignmentId: assignment.id,
        scannedAt: now,
        isOnTime: true,
        status: originalStatus,
      },
      include: {
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
          },
        },
      },
    });

    res.status(201).json(checkIn);
  } catch (error) {
    console.error('Create check-in error:', error);
    res.status(500).json({ error: 'Failed to create check-in' });
  }
}
