import { prisma } from '../config/prisma';
import { computeCheckpointStatus } from './statusService';
import { verifyCheckpointToken } from '../utils/qr';

export class HttpError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface CheckInResult {
  success: boolean;
  checkpointName: string;
  premiseName: string;
  guardName: string | null;
  assignmentId: string;
  scannedAt: Date;
  isOnTime: boolean;
  status: 'GREEN' | 'ORANGE' | 'RED'; // effective status (after auto-override)
  originalStatus: 'GREEN' | 'ORANGE' | 'RED';
  overrideNote?: string | null;
  overriddenBy?: string | null;
  overriddenAt?: Date | null;
  message: string;
}

interface ProcessCheckInInput {
  guardId: string;
  checkpointId: string;
  token?: string;
  skipTokenValidation?: boolean;
}

/**
 * Shared guard check-in flow used by mobile and kiosk (RFID) paths.
 * Validates assignment, order, and timing before creating the record.
 */
export async function processCheckIn({
  guardId,
  checkpointId,
  token,
  skipTokenValidation = false,
}: ProcessCheckInInput): Promise<CheckInResult> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: {
      premise: true,
    },
  });

  if (!checkpoint) {
    throw new HttpError(404, 'Checkpoint not found', 'CHECKPOINT_NOT_FOUND');
  }

  if (process.env.QR_SECRET && !skipTokenValidation) {
    if (!token || typeof token !== 'string') {
      throw new HttpError(400, 'QR token is required', 'QR_TOKEN_REQUIRED');
    }

    const isValidToken = verifyCheckpointToken(checkpointId, token);
    if (!isValidToken) {
      throw new HttpError(400, 'QR token is invalid or expired', 'QR_TOKEN_INVALID');
    }
  }

  const guard = await prisma.user.findUnique({
    where: { id: guardId },
    select: { id: true, role: true, name: true },
  });

  if (!guard || guard.role !== 'GUARD') {
    throw new HttpError(
      403,
      'Access denied. Only assigned guards can scan checkpoints.',
      'GUARD_ROLE_REQUIRED'
    );
  }

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
    const anyAssignment = await prisma.guardAssignment.findFirst({
      where: { guardId },
      include: {
        premise: {
          select: { id: true, name: true },
        },
      },
    });

    if (!anyAssignment) {
      throw new HttpError(
        403,
        'You are not assigned to any premise. Please contact your supervisor.',
        'NO_ASSIGNMENT'
      );
    }

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
        throw new HttpError(
          403,
          `Your assignment for "${checkpoint.premise.name}" starts at ${inactiveAssignment.startTime.toLocaleString()}. You cannot scan checkpoints before your shift starts.`,
          'ASSIGNMENT_NOT_STARTED',
          { assignmentStartTime: inactiveAssignment.startTime }
        );
      }

      if (isPast) {
        throw new HttpError(
          403,
          `Your assignment for "${checkpoint.premise.name}" ended at ${inactiveAssignment.endTime.toLocaleString()}. You cannot scan checkpoints after your shift ends.`,
          'ASSIGNMENT_ENDED',
          { assignmentEndTime: inactiveAssignment.endTime }
        );
      }
    }

    throw new HttpError(
      403,
      `You are not assigned to "${checkpoint.premise.name}". Only guards assigned to this premise can scan its checkpoints.`,
      'NOT_ASSIGNED_TO_PREMISE',
      { checkpointPremise: checkpoint.premise.name }
    );
  }

  const premiseCheckpoints = await prisma.checkpoint.findMany({
    where: { premiseId: checkpoint.premiseId },
    select: { id: true, sequence: true, name: true },
    orderBy: [
      { sequence: 'asc' },
      { name: 'asc' },
    ],
  });

  const targetCheckpoint = premiseCheckpoints.find((c) => c.id === checkpointId);
  if (!targetCheckpoint || !targetCheckpoint.sequence) {
    throw new HttpError(
      400,
      'Checkpoint sequence not configured. Please contact an administrator.',
      'SEQUENCE_NOT_CONFIGURED'
    );
  }

  const orderedCheckpoints = premiseCheckpoints
    .filter((c) => c.sequence)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

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
    include: {
      checkpoint: {
        select: { id: true, sequence: true, name: true },
      },
    },
  });

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
    throw new HttpError(400, `Please scan checkpoints in order. Next expected checkpoint: "${expectedCheckpoint.name}".`, 'SEQUENCE_ENFORCED', {
      nextCheckpointId: expectedCheckpoint.id,
      nextCheckpointName: expectedCheckpoint.name,
    });
  }

  const originalStatus = await computeCheckpointStatus(guardId, checkpointId, assignment.id, now);
  const autoOverride =
    originalStatus === 'ORANGE'
      ? {
          overrideStatus: 'GREEN' as const,
          overrideNote: 'Auto-cleared: scanned before RED threshold',
          overriddenBy: null,
          overriddenAt: now,
        }
      : null;

  const effectiveStatus = autoOverride?.overrideStatus || originalStatus;
  const isOnTime = effectiveStatus === 'GREEN';

  const checkIn = await prisma.checkIn.create({
    data: {
      guardId,
      checkpointId,
      assignmentId: assignment.id,
      scannedAt: now,
      isOnTime,
      status: originalStatus,
      overrideStatus: autoOverride?.overrideStatus || null,
      overrideNote: autoOverride?.overrideNote || null,
      overriddenBy: autoOverride?.overriddenBy || null,
      overriddenAt: autoOverride?.overriddenAt || null,
    },
  });

  let message = '';
  if (effectiveStatus === 'GREEN') {
    message = `Check-in successful at "${checkpoint.name}". On time.`;
  } else if (effectiveStatus === 'ORANGE') {
    message = `Check-in successful at "${checkpoint.name}", but overdue. Please catch up.`;
  } else {
    message = `Check-in successful at "${checkpoint.name}", but critically overdue. Please contact supervisor.`;
  }

  return {
    success: true,
    checkpointName: checkpoint.name,
    premiseName: checkpoint.premise.name,
    guardName: guard.name,
    assignmentId: assignment.id,
    scannedAt: checkIn.scannedAt,
    isOnTime,
    status: effectiveStatus,
    originalStatus,
    overrideNote: autoOverride?.overrideNote || null,
    overriddenBy: autoOverride?.overriddenBy || null,
    overriddenAt: autoOverride?.overriddenAt || null,
    message,
  };
}
