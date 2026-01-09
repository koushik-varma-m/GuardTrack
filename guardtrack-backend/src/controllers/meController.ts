import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { processCheckIn, HttpError } from '../services/checkInProcessor';

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
      return res.json({
        hasActiveAssignment: false,
        message: 'No active assignment found',
      });
    }

    res.json({
      hasActiveAssignment: true,
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

    const result = await processCheckIn({ guardId, checkpointId, token });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        error: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.details ? error.details : {}),
      });
    }
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

    const toMs = (minutes: number) => minutes * 60_000;

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

    // Enforce scan timing + sequence (same rules as actual check-in)
    const premiseCheckpoints = await prisma.checkpoint.findMany({
      where: { premiseId: checkpoint.premiseId },
      select: { id: true, sequence: true, name: true, intervalMinutes: true },
      orderBy: [
        { sequence: 'asc' },
        { name: 'asc' },
      ],
    });

    if (premiseCheckpoints.length === 0) {
      return res.json({
        canScan: false,
        error: 'No checkpoints configured for this premise',
        code: 'NO_CHECKPOINTS',
      });
    }

    if (premiseCheckpoints.some((c) => !c.sequence)) {
      return res.json({
        canScan: false,
        error: 'Checkpoint sequence not configured. Please contact an administrator.',
        code: 'SEQUENCE_NOT_CONFIGURED',
      });
    }

    const orderedCheckpoints = premiseCheckpoints
      .filter((c) => c.sequence)
      .sort((a, b) => {
        const seq = (a.sequence ?? 0) - (b.sequence ?? 0);
        if (seq !== 0) return seq;
        return a.name.localeCompare(b.name);
      });

    const lastCheckIn = await prisma.checkIn.findFirst({
      where: {
        guardId,
        assignmentId: assignment.id,
        scannedAt: {
          gte: assignment.startTime,
        },
      },
      orderBy: {
        scannedAt: 'desc',
      },
      select: {
        checkpointId: true,
        scannedAt: true,
      },
    });

    const expectedFromCheckIn = (() => {
      if (!lastCheckIn) return orderedCheckpoints[0];
      const currentIndex = orderedCheckpoints.findIndex((c) => c.id === lastCheckIn.checkpointId);
      if (currentIndex === -1) return orderedCheckpoints[0];
      const nextIndex = (currentIndex + 1) % orderedCheckpoints.length;
      return orderedCheckpoints[nextIndex];
    })();

    const resolvedExpected = await prisma.alert.findFirst({
      where: {
        guardId,
        assignmentId: assignment.id,
        checkpointId: expectedFromCheckIn.id,
        status: 'RESOLVED',
        resolvedAt: { not: null, gte: lastCheckIn?.scannedAt ?? assignment.startTime },
      },
      orderBy: {
        resolvedAt: 'desc',
      },
      select: {
        resolvedAt: true,
      },
    });

    const lastProgress = resolvedExpected?.resolvedAt
      ? { checkpointId: expectedFromCheckIn.id, at: resolvedExpected.resolvedAt }
      : lastCheckIn
        ? { checkpointId: lastCheckIn.checkpointId, at: lastCheckIn.scannedAt }
        : null;

    const expectedCheckpoint = (() => {
      if (!lastProgress) {
        return orderedCheckpoints[0];
      }
      const currentIndex = orderedCheckpoints.findIndex((c) => c.id === lastProgress.checkpointId);
      if (currentIndex === -1) return orderedCheckpoints[0];
      const nextIndex = (currentIndex + 1) % orderedCheckpoints.length;
      return orderedCheckpoints[nextIndex];
    })();

    const expectedDueTime = (() => {
      if (!expectedCheckpoint) return null;
      const intervalMinutes = expectedCheckpoint.intervalMinutes ?? assignment.intervalMinutes;
      if (intervalMinutes === null || intervalMinutes === undefined) {
        throw new Error('Checkpoint interval not configured');
      }
      if (!lastProgress) {
        return assignment.startTime;
      }
      return new Date(lastProgress.at.getTime() + toMs(intervalMinutes));
    })();

    if (expectedCheckpoint && expectedDueTime && now.getTime() < expectedDueTime.getTime()) {
      return res.json({
        canScan: false,
        error: `Not due yet. Please wait until ${expectedDueTime.toLocaleTimeString()} to scan "${expectedCheckpoint.name}".`,
        code: 'CHECKPOINT_NOT_DUE',
        nextCheckpointId: expectedCheckpoint.id,
        nextCheckpointName: expectedCheckpoint.name,
        dueTime: expectedDueTime,
      });
    }

    if (expectedCheckpoint && expectedCheckpoint.id !== checkpointId) {
      return res.json({
        canScan: false,
        error: `Please scan checkpoints in order. Next expected checkpoint: "${expectedCheckpoint.name}".`,
        code: 'SEQUENCE_ENFORCED',
        nextCheckpointId: expectedCheckpoint.id,
        nextCheckpointName: expectedCheckpoint.name,
        ...(expectedDueTime ? { dueTime: expectedDueTime } : {}),
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
    if (error instanceof Error && error.message === 'Checkpoint interval not configured') {
      return res.status(400).json({
        canScan: false,
        error: 'Checkpoint intervals not configured. Please ask an administrator to set intervals for all checkpoints.',
        code: 'INTERVAL_NOT_CONFIGURED',
      });
    }
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

    const mapped = checkIns.map((c) => {
      const effectiveStatus = (c.overrideStatus as any) || (c.status as any) || 'GREEN';
      const originalStatus = (c.status as any) || 'GREEN';
      const effectiveOnTime = effectiveStatus === 'GREEN';
      return {
        ...c,
        effectiveStatus,
        originalStatus,
        effectiveOnTime,
      };
    });

    res.json(mapped);
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
        intervalMinutes: true,
      },
      orderBy: [
        { sequence: 'asc' },
        { name: 'asc' },
      ],
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

    const toMs = (minutes: number) => minutes * 60_000;

    const lastCheckIn = await prisma.checkIn.findFirst({
      where: {
        guardId,
        assignmentId: assignment.id,
        scannedAt: {
          gte: assignment.startTime,
        },
      },
      orderBy: { scannedAt: 'desc' },
      select: { checkpointId: true, scannedAt: true },
    });

    const expectedFromCheckIn = (() => {
      if (!lastCheckIn) return checkpoints[0];
      const currentIndex = checkpoints.findIndex((c) => c.id === lastCheckIn.checkpointId);
      if (currentIndex === -1) return checkpoints[0];
      const nextIndex = (currentIndex + 1) % checkpoints.length;
      return checkpoints[nextIndex];
    })();

    const resolvedExpected = await prisma.alert.findFirst({
      where: {
        guardId,
        assignmentId: assignment.id,
        checkpointId: expectedFromCheckIn.id,
        status: 'RESOLVED',
        resolvedAt: { not: null, gte: lastCheckIn?.scannedAt ?? assignment.startTime },
      },
      orderBy: { resolvedAt: 'desc' },
      select: { resolvedAt: true },
    });

    const lastProgress = resolvedExpected?.resolvedAt
      ? { checkpointId: expectedFromCheckIn.id, at: resolvedExpected.resolvedAt }
      : lastCheckIn
        ? { checkpointId: lastCheckIn.checkpointId, at: lastCheckIn.scannedAt }
        : null;

    const checkInCount = await prisma.checkIn.count({
      where: {
        guardId,
        assignmentId: assignment.id,
        scannedAt: {
          gte: assignment.startTime,
        },
      },
    });

    const total = checkpoints.length;
    const lapsCompleted = total > 0 ? Math.floor(checkInCount / total) : 0;
    const lapNumber = lapsCompleted + 1;

    let nextCheckpoint = checkpoints[0] || null;
    let remaining = checkpoints.length;

    if (lastProgress) {
      const idx = checkpoints.findIndex((c) => c.id === lastProgress.checkpointId);
      if (idx !== -1) {
        const nextIdx = (idx + 1) % checkpoints.length;
        nextCheckpoint = checkpoints[nextIdx];
        remaining = checkpoints.length - 1 - idx;
        if (remaining <= 0) {
          remaining = checkpoints.length;
        }
      }
    }

    const dueTime = (() => {
      if (!nextCheckpoint) return null;
      const intervalMinutes = nextCheckpoint.intervalMinutes ?? assignment.intervalMinutes;
      if (intervalMinutes === null || intervalMinutes === undefined) return null;
      if (!lastProgress) return assignment.startTime;
      return new Date(lastProgress.at.getTime() + toMs(intervalMinutes));
    })();

    res.json({
      nextCheckpoint,
      remaining,
      total: checkpoints.length,
      lapsCompleted,
      lapNumber,
      assignmentId: assignment.id,
      premiseId: assignment.premiseId,
      premiseName: assignment.premise.name,
      dueTime,
    });
  } catch (error) {
    console.error('Get next checkpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch next checkpoint' });
  }
}
