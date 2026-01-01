import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import { generateCheckpointQrPng } from '../utils/qr';

export async function createCheckpoint(req: Request, res: Response) {
  try {
    const { premiseId, name, description, xCoord, yCoord, intervalMinutes, sequence } = req.body;

    if (!premiseId || !name || xCoord === undefined || yCoord === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: premiseId, name, xCoord, yCoord' 
      });
    }

    // Validate intervalMinutes if provided
    if (intervalMinutes !== undefined && (intervalMinutes < 1 || !Number.isInteger(intervalMinutes))) {
      return res.status(400).json({ 
        error: 'intervalMinutes must be a positive integer' 
      });
    }

    // Check if premise exists
    const premise = await prisma.premise.findUnique({
      where: { id: premiseId },
    });

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    // Generate unique QR code value
    let qrCodeValue: string;
    let isUnique = false;
    
    while (!isUnique) {
      qrCodeValue = randomUUID();
      const existingCheckpoint = await prisma.checkpoint.findUnique({
        where: { qrCodeValue },
      });
      
      if (!existingCheckpoint) {
        isUnique = true;
      }
    }

    // Determine sequence: use provided value or next after current max
    let finalSequence: number;
    if (sequence !== undefined && sequence !== null) {
      finalSequence = Number(sequence);
      if (!Number.isInteger(finalSequence) || finalSequence < 1) {
        return res.status(400).json({ error: 'sequence must be a positive integer' });
      }
    } else {
      const maxSequence = await prisma.checkpoint.aggregate({
        where: { premiseId },
        _max: { sequence: true },
      });
      finalSequence = (maxSequence._max.sequence || 0) + 1;
    }

    const checkpoint = await prisma.checkpoint.create({
      data: {
        premiseId,
        name,
        description: description || null,
        xCoord,
        yCoord,
        sequence: finalSequence,
        intervalMinutes: intervalMinutes !== undefined ? intervalMinutes : null,
        qrCodeValue: qrCodeValue!,
      },
    });

    res.status(201).json(checkpoint);
  } catch (error) {
    console.error('Create checkpoint error:', error);
    res.status(500).json({ error: 'Failed to create checkpoint' });
  }
}

export async function getCheckpointsByPremiseId(req: Request, res: Response) {
  try {
    const { premiseId } = req.params;

    const checkpoints = await prisma.checkpoint.findMany({
      where: { premiseId },
      orderBy: [
        { sequence: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json(checkpoints);
  } catch (error) {
    console.error('Get checkpoints error:', error);
    res.status(500).json({ error: 'Failed to fetch checkpoints' });
  }
}

export async function updateCheckpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, xCoord, yCoord, qrCodeValue, intervalMinutes, sequence } = req.body;

    // Validate intervalMinutes if provided
    if (intervalMinutes !== undefined && intervalMinutes !== null && (intervalMinutes < 1 || !Number.isInteger(intervalMinutes))) {
      return res.status(400).json({ 
        error: 'intervalMinutes must be a positive integer or null' 
      });
    }

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // If QR code is being updated, check for conflicts
    if (qrCodeValue && qrCodeValue !== checkpoint.qrCodeValue) {
      const existingCheckpoint = await prisma.checkpoint.findUnique({
        where: { qrCodeValue },
      });

      if (existingCheckpoint) {
        return res.status(409).json({ error: 'QR code value already exists' });
      }
    }

    // Validate sequence if provided
    if (sequence !== undefined && sequence !== null) {
      const seqNum = Number(sequence);
      if (!Number.isInteger(seqNum) || seqNum < 1) {
        return res.status(400).json({ error: 'sequence must be a positive integer' });
      }
    }

    const updatedCheckpoint = await prisma.checkpoint.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(xCoord !== undefined && { xCoord }),
        ...(yCoord !== undefined && { yCoord }),
        ...(sequence !== undefined && { sequence: sequence === null ? checkpoint.sequence : Number(sequence) }),
        ...(qrCodeValue && { qrCodeValue }),
        ...(intervalMinutes !== undefined && { intervalMinutes: intervalMinutes || null }),
      },
    });

    res.json(updatedCheckpoint);
  } catch (error) {
    console.error('Update checkpoint error:', error);
    res.status(500).json({ error: 'Failed to update checkpoint' });
  }
}

export async function deleteCheckpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    await prisma.checkpoint.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete checkpoint error:', error);
    res.status(500).json({ error: 'Failed to delete checkpoint' });
  }
}

export async function getCheckpointQrCode(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id },
      select: {
        id: true,
        premiseId: true,
      },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    const qrBuffer = await generateCheckpointQrPng(checkpoint.id, checkpoint.premiseId);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="checkpoint-${checkpoint.id}.png"`);
    res.send(qrBuffer);
  } catch (error) {
    console.error('Get checkpoint QR code error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
}

// Public endpoint to get checkpoint status for kiosk display (no auth required)
export async function getCheckpointStatusPublic(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id },
      include: {
        premise: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // Get all active assignments for this premise
    const now = new Date();
    const activeAssignments = await prisma.guardAssignment.findMany({
      where: {
        premiseId: checkpoint.premiseId,
        startTime: {
          lte: now,
        },
        endTime: {
          gte: now,
        },
      },
      include: {
        guard: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get status for each active assignment
    const statuses = [];
    for (const assignment of activeAssignments) {
      // Find the last CheckIn for this guard, checkpoint, and assignment
      const lastCheckIn = await prisma.checkIn.findFirst({
        where: {
          guardId: assignment.guardId,
          checkpointId: checkpoint.id,
          assignmentId: assignment.id,
        },
        orderBy: {
          scannedAt: 'desc',
        },
      });

      if (checkpoint.intervalMinutes === null || checkpoint.intervalMinutes === undefined) {
        throw new Error('Checkpoint interval not configured');
      }
      const intervalMinutes = checkpoint.intervalMinutes;

      // If no scan yet, use assignment start time
      const lastScan = lastCheckIn ? lastCheckIn.scannedAt : assignment.startTime;

      // Calculate next due time
      const nextDueTime = new Date(lastScan);
      nextDueTime.setMinutes(nextDueTime.getMinutes() + intervalMinutes);

      // Calculate status
      const orangeThreshold = new Date(nextDueTime);
      orangeThreshold.setMinutes(orangeThreshold.getMinutes() + 10); // 10 minute grace period

      let status: 'GREEN' | 'ORANGE' | 'RED';
      if (now <= nextDueTime) {
        status = 'GREEN';
      } else if (now <= orangeThreshold) {
        status = 'ORANGE';
      } else {
        status = 'RED';
      }

      statuses.push({
        guardId: assignment.guardId,
        guardName: assignment.guard.name,
        lastScan: lastCheckIn ? lastCheckIn.scannedAt : assignment.startTime,
        nextDueTime,
        status,
        intervalMinutes,
      });
    }

    // Return the worst status (RED > ORANGE > GREEN) if multiple guards
    const worstStatus = statuses.length > 0
      ? statuses.reduce((worst, current) => {
          const order = { RED: 3, ORANGE: 2, GREEN: 1 };
          return order[current.status] > order[worst.status] ? current : worst;
        })
      : null;

    res.json({
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.name,
      premiseName: checkpoint.premise.name,
      status: worstStatus?.status || null,
      lastScan: worstStatus?.lastScan || null,
      nextDueTime: worstStatus?.nextDueTime || null,
      intervalMinutes: worstStatus?.intervalMinutes || null,
      guardName: worstStatus?.guardName || null,
      allStatuses: statuses, // Include all guard statuses for detailed view
      hasActiveAssignment: activeAssignments.length > 0,
    });
  } catch (error) {
    console.error('Get checkpoint status error:', error);
    res.status(500).json({ error: 'Failed to fetch checkpoint status' });
  }
}

// Public endpoint for kiosk rotating QR codes (no auth required).
// This should only be used to DISPLAY QR codes; actual check-ins still
// require authenticated guards and token verification.
export async function getRotatingCheckpointQrCode(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id },
      select: {
        id: true,
        premiseId: true,
      },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    const qrBuffer = await generateCheckpointQrPng(
      checkpoint.id,
      checkpoint.premiseId
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader(
      'Content-Disposition',
      `inline; filename="checkpoint-${checkpoint.id}-rotating.png"`
    );
    res.send(qrBuffer);
  } catch (error) {
    console.error('Get rotating checkpoint QR code error:', error);
    res.status(500).json({ error: 'Failed to generate rotating QR code' });
  }
}

// Admin endpoint to get QR codes for all checkpoints in a premise
export async function getAllCheckpointQRCodes(req: Request, res: Response) {
  try {
    const { premiseId } = req.params;

    const checkpoints = await prisma.checkpoint.findMany({
      where: { premiseId },
      select: {
        id: true,
        name: true,
        premiseId: true,
      },
    });

    if (checkpoints.length === 0) {
      return res.status(404).json({ error: 'No checkpoints found for this premise' });
    }

    const qrCodes = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        const qrBuffer = await generateCheckpointQrPng(
          checkpoint.id,
          checkpoint.premiseId
        );
        const { generateCheckpointQrPayload } = await import('../utils/qr');
        const payload = await generateCheckpointQrPayload(
          checkpoint.id,
          checkpoint.premiseId
        );

        return {
          checkpointId: checkpoint.id,
          checkpointName: checkpoint.name,
          qrCodeImage: `data:image/png;base64,${qrBuffer.toString('base64')}`,
          qrCodePayload: JSON.parse(payload),
          qrCodeUrl: `/api/v1/checkpoints/${checkpoint.id}/qr-rotating`,
        };
      })
    );

    res.json({
      premiseId,
      checkpoints: qrCodes,
    });
  } catch (error) {
    console.error('Get all checkpoint QR codes error:', error);
    res.status(500).json({ error: 'Failed to generate QR codes' });
  }
}
