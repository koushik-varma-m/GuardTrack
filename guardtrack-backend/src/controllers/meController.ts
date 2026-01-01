import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { computeCheckpointStatus } from '../services/statusService';
import { verifyCheckpointToken } from '../utils/qr';

export async function getProfile(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: guardId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

export async function getActiveAssignment(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const now = new Date();

    const assignment = await prisma.guardAssignment.findFirst({
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
          select: {
            id: true,
            name: true,
            address: true,
            mapImageUrl: true,
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'No active assignment found' });
    }

    res.json({
      id: assignment.id,
      premise: assignment.premise,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    });
  } catch (error) {
    console.error('Get active assignment error:', error);
    res.status(500).json({ error: 'Failed to fetch active assignment' });
  }
}

export async function getMyCheckpoints(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const now = new Date();

    // Find active assignment
    const assignment = await prisma.guardAssignment.findFirst({
      where: {
        guardId,
        startTime: {
          lte: now,
        },
        endTime: {
          gte: now,
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'No active assignment found' });
    }

    // Get all checkpoints for the premise
    const checkpoints = await prisma.checkpoint.findMany({
      where: {
        premiseId: assignment.premiseId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        xCoord: true,
        yCoord: true,
        sequence: true,
        qrCodeValue: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { sequence: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json(checkpoints);
  } catch (error) {
    console.error('Get my checkpoints error:', error);
    res.status(500).json({ error: 'Failed to fetch checkpoints' });
  }
}

export async function createMyCheckIn(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { checkpointId, token } = req.body as {
      checkpointId?: string;
      token?: string;
    };

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

    // If QR_SECRET is configured, enforce rotating token validation.
    // This prevents old screenshots / prints from being reused.
    if (process.env.QR_SECRET) {
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'QR token is required' });
      }

      const isValidToken = verifyCheckpointToken(checkpointId, token);
      if (!isValidToken) {
        return res.status(400).json({ error: 'QR token is invalid or expired' });
      }
    }

    // CRITICAL: Verify guard is assigned to this premise before allowing check-in
    const now = new Date();

    // First, verify the guard exists and has GUARD role
    const guard = await prisma.user.findUnique({
      where: { id: guardId },
      select: { id: true, role: true, name: true },
    });

    if (!guard || guard.role !== 'GUARD') {
      return res.status(403).json({
        error: 'Access denied. Only assigned guards can scan checkpoints.',
        code: 'GUARD_ROLE_REQUIRED',
      });
    }

    // Find active assignment for this guard and premise
    const assignment = await prisma.guardAssignment.findFirst({
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
      include: {
        premise: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment) {
      // Check if guard has any assignments (to provide better error message)
      const anyAssignment = await prisma.guardAssignment.findFirst({
        where: { guardId },
        include: {
          premise: {
            select: { id: true, name: true },
          },
        },
      });

      if (!anyAssignment) {
        return res.status(403).json({
          error: 'You are not assigned to any premise. Please contact your supervisor.',
          code: 'NO_ASSIGNMENT',
        });
      }

      // Check if assignment exists but is not active
      const inactiveAssignment = await prisma.guardAssignment.findFirst({
        where: {
          guardId,
          premiseId: checkpoint.premiseId,
        },
      });

      if (inactiveAssignment) {
        const isFuture = inactiveAssignment.startTime > now;
        const isPast = inactiveAssignment.endTime < now;
        
        if (isFuture) {
          return res.status(403).json({
            error: `Your assignment for "${checkpoint.premise.name}" starts at ${inactiveAssignment.startTime.toLocaleString()}. You cannot scan checkpoints before your shift starts.`,
            code: 'ASSIGNMENT_NOT_STARTED',
            assignmentStartTime: inactiveAssignment.startTime,
          });
        }
        
        if (isPast) {
          return res.status(403).json({
            error: `Your assignment for "${checkpoint.premise.name}" ended at ${inactiveAssignment.endTime.toLocaleString()}. You cannot scan checkpoints after your shift ends.`,
            code: 'ASSIGNMENT_ENDED',
            assignmentEndTime: inactiveAssignment.endTime,
          });
        }
      }

      return res.status(403).json({
        error: `You are not assigned to "${checkpoint.premise.name}". Only guards assigned to this premise can scan its checkpoints.`,
        code: 'NOT_ASSIGNED_TO_PREMISE',
        checkpointPremise: checkpoint.premise.name,
      });
    }

    // Enforce sequential scanning order based on checkpoint.sequence
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

    // Enforce cyclic sequential scanning: after last checkpoint, loop back to the first.
    const lastCheckIn = await prisma.checkIn.findFirst({
      where: {
        guardId,
        assignmentId: assignment.id,
      },
      orderBy: {
        scannedAt: 'desc',
      },
      include: {
        checkpoint: {
          select: { id: true, sequence: true, name: true },
        },
      },
    });

    const orderedCheckpoints = premiseCheckpoints.filter((c) => c.sequence).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const expectedCheckpoint = (() => {
      if (!lastCheckIn || !lastCheckIn.checkpoint?.sequence) {
        return orderedCheckpoints[0];
      }
      const currentIndex = orderedCheckpoints.findIndex((c) => c.id === lastCheckIn.checkpoint.id);
      if (currentIndex === -1) return orderedCheckpoints[0];
      const nextIndex = (currentIndex + 1) % orderedCheckpoints.length;
      return orderedCheckpoints[nextIndex];
    })();

    if (expectedCheckpoint && expectedCheckpoint.id !== checkpointId) {
      return res.status(400).json({
        error: `Please scan checkpoints in order. Next expected checkpoint: "${expectedCheckpoint.name}".`,
        code: 'SEQUENCE_ENFORCED',
        nextCheckpointId: expectedCheckpoint.id,
        nextCheckpointName: expectedCheckpoint.name,
      });
    }

    // Compute status before creating check-in
    const status = await computeCheckpointStatus(guardId, checkpointId, assignment.id, now);

    // Determine if on time (GREEN means on time)
    const isOnTime = status === 'GREEN';

    // Create check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        guardId,
        checkpointId,
        assignmentId: assignment.id,
        scannedAt: now,
        isOnTime,
      },
    });

    // Generate message based on status
    let message = '';
    if (status === 'GREEN') {
      message = `Check-in successful at "${checkpoint.name}". On time.`;
    } else if (status === 'ORANGE') {
      message = `Check-in successful at "${checkpoint.name}", but overdue. Please catch up.`;
    } else {
      message = `Check-in successful at "${checkpoint.name}", but critically overdue. Please contact supervisor.`;
    }

    res.status(201).json({
      success: true,
      checkpointName: checkpoint.name,
      premiseName: checkpoint.premise.name,
      guardName: guard.name,
      assignmentId: assignment.id,
      scannedAt: checkIn.scannedAt,
      isOnTime,
      status,
      message,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Checkpoint interval not configured') {
      return res.status(400).json({
        error: 'Checkpoint intervals not configured. Please ask an administrator to set intervals for all checkpoints.',
        code: 'INTERVAL_NOT_CONFIGURED',
      });
    }
    console.error('Create my check-in error:', error);
    res.status(500).json({ error: 'Failed to create check-in' });
  }
}

/**
 * Pre-check endpoint: Verify if guard can scan a checkpoint before attempting scan
 * This helps provide better UX by checking assignment before scanning
 */
export async function canScanCheckpoint(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { checkpointId } = req.query;

    if (!checkpointId || typeof checkpointId !== 'string') {
      return res.status(400).json({ error: 'checkpointId query parameter is required' });
    }

    // Verify checkpoint exists
    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: checkpointId },
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
      return res.status(404).json({
        canScan: false,
        error: 'Checkpoint not found',
        code: 'CHECKPOINT_NOT_FOUND',
      });
    }

    // Verify guard role
    const guard = await prisma.user.findUnique({
      where: { id: guardId },
      select: { id: true, role: true, name: true },
    });

    if (!guard || guard.role !== 'GUARD') {
      return res.json({
        canScan: false,
        error: 'Only guards can scan checkpoints',
        code: 'GUARD_ROLE_REQUIRED',
      });
    }

    // Check for active assignment
    const now = new Date();
    const assignment = await prisma.guardAssignment.findFirst({
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
      include: {
        premise: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment) {
      // Check for inactive assignment
      const inactiveAssignment = await prisma.guardAssignment.findFirst({
        where: {
          guardId,
          premiseId: checkpoint.premiseId,
        },
      });

      if (inactiveAssignment) {
        const isFuture = inactiveAssignment.startTime > now;
        const isPast = inactiveAssignment.endTime < now;

        if (isFuture) {
          return res.json({
            canScan: false,
            error: `Your assignment starts at ${inactiveAssignment.startTime.toLocaleString()}`,
            code: 'ASSIGNMENT_NOT_STARTED',
            assignmentStartTime: inactiveAssignment.startTime,
          });
        }

        if (isPast) {
          return res.json({
            canScan: false,
            error: `Your assignment ended at ${inactiveAssignment.endTime.toLocaleString()}`,
            code: 'ASSIGNMENT_ENDED',
            assignmentEndTime: inactiveAssignment.endTime,
          });
        }
      }

      return res.json({
        canScan: false,
        error: `You are not assigned to "${checkpoint.premise.name}"`,
        code: 'NOT_ASSIGNED_TO_PREMISE',
        checkpointPremise: checkpoint.premise.name,
      });
    }

    // All checks passed - guard can scan
    res.json({
      canScan: true,
      checkpointName: checkpoint.name,
      premiseName: checkpoint.premise.name,
      assignmentId: assignment.id,
      message: `You can scan checkpoint "${checkpoint.name}" at "${checkpoint.premise.name}"`,
    });
  } catch (error) {
    console.error('Can scan checkpoint error:', error);
    res.status(500).json({
      canScan: false,
      error: 'Failed to verify scan eligibility',
    });
  }
}

export async function getMyCheckInHistory(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    }

    // Parse date and create date range
    const targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const checkIns = await prisma.checkIn.findMany({
      where: {
        guardId,
        scannedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
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
        scannedAt: 'desc',
      },
    });

    res.json(checkIns);
  } catch (error) {
    console.error('Get check-in history error:', error);
    res.status(500).json({ error: 'Failed to fetch check-in history' });
  }
}

/**
 * Get the next expected checkpoint in the sequence for the active assignment.
 */
export async function getNextCheckpoint(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify guard role
    const guard = await prisma.user.findUnique({
      where: { id: guardId },
      select: { id: true, role: true },
    });

    if (!guard || guard.role !== 'GUARD') {
      return res.status(403).json({
        error: 'Only guards can access this resource',
        code: 'GUARD_ROLE_REQUIRED',
      });
    }

    const now = new Date();

    // Find active assignment
    const assignment = await prisma.guardAssignment.findFirst({
      where: {
        guardId,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        premise: {
          select: { id: true, name: true },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'No active assignment found',
        code: 'NO_ACTIVE_ASSIGNMENT',
      });
    }

    // Ordered checkpoints for premise
    const checkpoints = await prisma.checkpoint.findMany({
      where: { premiseId: assignment.premiseId },
      select: {
        id: true,
        name: true,
        description: true,
        sequence: true,
      },
      orderBy: { sequence: 'asc' },
    });

    if (checkpoints.length === 0) {
      return res.json({
        nextCheckpoint: null,
        remaining: 0,
        total: 0,
        assignmentId: assignment.id,
        premiseId: assignment.premiseId,
        premiseName: assignment.premise.name,
      });
    }

    if (checkpoints.some((c) => !c.sequence)) {
      return res.status(400).json({
        error: 'Checkpoint sequence not configured. Please contact an administrator.',
        code: 'SEQUENCE_NOT_CONFIGURED',
      });
    }

    // Check-ins for this assignment/guard
    const lastCheckIn = await prisma.checkIn.findFirst({
      where: {
        guardId,
        assignmentId: assignment.id,
      },
      orderBy: { scannedAt: 'desc' },
      include: {
        checkpoint: { select: { id: true, sequence: true } },
      },
    });

    const checkInCount = await prisma.checkIn.count({
      where: {
        guardId,
        assignmentId: assignment.id,
      },
    });

    const total = checkpoints.length;
    const lapsCompleted = total > 0 ? Math.floor(checkInCount / total) : 0;
    const lapNumber = lapsCompleted + 1;

    let nextCheckpoint = checkpoints[0] || null;
    let remaining = checkpoints.length;

    if (lastCheckIn?.checkpoint?.sequence) {
      const idx = checkpoints.findIndex((c) => c.id === lastCheckIn.checkpoint.id);
      if (idx !== -1) {
        const nextIdx = (idx + 1) % checkpoints.length;
        nextCheckpoint = checkpoints[nextIdx];
        remaining = checkpoints.length - 1 - idx;
        if (remaining <= 0) {
          remaining = checkpoints.length;
        }
      }
    }

    res.json({
      nextCheckpoint,
      remaining,
      total: checkpoints.length,
      lapsCompleted,
      lapNumber,
      assignmentId: assignment.id,
      premiseId: assignment.premiseId,
      premiseName: assignment.premise.name,
    });
  } catch (error) {
    console.error('Get next checkpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch next checkpoint' });
  }
}
