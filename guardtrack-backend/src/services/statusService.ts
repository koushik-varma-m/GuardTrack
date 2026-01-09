import { prisma } from '../config/prisma';

export type CheckpointStatus = 'GREEN' | 'ORANGE' | 'RED';

export interface PremiseStatusItem {
  checkpointId: string;
  checkpointName: string;
  guardId: string;
  guardName: string;
  lastScan: Date;
  nextDueTime: Date;
  status: CheckpointStatus;
}

const ORANGE_THRESHOLD_MINUTES = 5;
const toMs = (minutes: number) => minutes * 60_000;

type MinimalCheckpoint = {
  id: string;
  name: string;
  sequence: number | null;
  intervalMinutes: number | null;
};

type ProgressEvent = {
  checkpointId: string;
  at: Date;
};

function computeStatusFromDueTime(now: Date, dueTime: Date): CheckpointStatus {
  const nowMs = now.getTime();
  const dueMs = dueTime.getTime();
  const orangeUntilMs = dueMs + toMs(ORANGE_THRESHOLD_MINUTES);

  if (nowMs <= dueMs) return 'GREEN';
  if (nowMs <= orangeUntilMs) return 'ORANGE';
  return 'RED';
}

function resolveIntervalMinutes(
  checkpoint: MinimalCheckpoint,
  assignmentIntervalMinutes: number
): number {
  const interval = checkpoint.intervalMinutes ?? assignmentIntervalMinutes;
  if (interval === null || interval === undefined) {
    throw new Error('Checkpoint interval not configured');
  }
  return interval;
}

function getOrderedCheckpoints(checkpoints: MinimalCheckpoint[]): MinimalCheckpoint[] {
  if (checkpoints.some((c) => c.sequence === null || c.sequence === undefined)) {
    throw new Error('Checkpoint sequence not configured');
  }

  return [...checkpoints].sort((a, b) => {
    const seq = (a.sequence ?? 0) - (b.sequence ?? 0);
    if (seq !== 0) return seq;
    return a.name.localeCompare(b.name);
  });
}

function computeNextDueTimesForCycle({
  orderedCheckpoints,
  assignmentStartTime,
  assignmentIntervalMinutes,
  lastProgress,
}: {
  orderedCheckpoints: MinimalCheckpoint[];
  assignmentStartTime: Date;
  assignmentIntervalMinutes: number;
  lastProgress: ProgressEvent | null;
}): {
  expectedCheckpoint: MinimalCheckpoint;
  dueByCheckpointId: Map<string, Date>;
} {
  if (orderedCheckpoints.length === 0) {
    throw new Error('No checkpoints configured');
  }

  const currentIndex = lastProgress
    ? orderedCheckpoints.findIndex((c) => c.id === lastProgress.checkpointId)
    : -1;
  const expectedIndex = ((currentIndex === -1 ? -1 : currentIndex) + 1 + orderedCheckpoints.length) % orderedCheckpoints.length;
  const expectedCheckpoint = orderedCheckpoints[expectedIndex];

  const dueByCheckpointId = new Map<string, Date>();

  // For the very first scan of the shift, allow the first checkpoint immediately at shift start.
  let cursor = lastProgress?.at ?? assignmentStartTime;

  for (let i = 0; i < orderedCheckpoints.length; i++) {
    const cp = orderedCheckpoints[(expectedIndex + i) % orderedCheckpoints.length];
    if (!lastProgress && i === 0) {
      dueByCheckpointId.set(cp.id, assignmentStartTime);
      cursor = assignmentStartTime;
      continue;
    }

    const intervalMinutes = resolveIntervalMinutes(cp, assignmentIntervalMinutes);
    const due = new Date(cursor.getTime() + toMs(intervalMinutes));
    dueByCheckpointId.set(cp.id, due);
    cursor = due;
  }

  return { expectedCheckpoint, dueByCheckpointId };
}

async function getLastProgressEvent({
  guardId,
  assignmentId,
  assignmentStartTime,
  orderedCheckpoints,
}: {
  guardId: string;
  assignmentId: string;
  assignmentStartTime: Date;
  orderedCheckpoints: MinimalCheckpoint[];
}): Promise<ProgressEvent | null> {
  const lastCheckIn = await prisma.checkIn.findFirst({
    where: {
      guardId,
      assignmentId,
      scannedAt: {
        gte: assignmentStartTime,
      },
    },
    orderBy: { scannedAt: 'desc' },
    select: { checkpointId: true, scannedAt: true },
  });

  // Only treat "Resolve" as schedule progress if it resolves the CURRENT expected checkpoint.
  const currentIndex = lastCheckIn
    ? orderedCheckpoints.findIndex((c) => c.id === lastCheckIn.checkpointId)
    : -1;
  const expectedIndex = ((currentIndex === -1 ? -1 : currentIndex) + 1 + orderedCheckpoints.length) % orderedCheckpoints.length;
  const expectedCheckpointId = orderedCheckpoints[expectedIndex]?.id;

  if (expectedCheckpointId) {
    const since = lastCheckIn?.scannedAt ?? assignmentStartTime;
    const resolvedExpected = await prisma.alert.findFirst({
      where: {
        guardId,
        assignmentId,
        checkpointId: expectedCheckpointId,
        status: 'RESOLVED',
        resolvedAt: { not: null, gte: since },
      },
      orderBy: { resolvedAt: 'desc' },
      select: { resolvedAt: true },
    });

    if (resolvedExpected?.resolvedAt) {
      return { checkpointId: expectedCheckpointId, at: resolvedExpected.resolvedAt };
    }
  }

  if (!lastCheckIn) return null;
  return { checkpointId: lastCheckIn.checkpointId, at: lastCheckIn.scannedAt };
}

/**
 * Status for a single checkpoint:
 * - Only the next expected checkpoint can be ORANGE/RED.
 * - All others stay GREEN until they become the expected checkpoint.
 * - Analyst "Resolve" counts as progress (uses `Alert.resolvedAt`) so guard doesn't need to re-scan immediately.
 */
export async function computeCheckpointStatus(
  guardId: string,
  checkpointId: string,
  assignmentId: string,
  referenceTime: Date = new Date()
): Promise<CheckpointStatus> {
  const assignment = await prisma.guardAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      guard: { select: { id: true, name: true } },
    },
  });

  if (!assignment || assignment.guardId !== guardId) {
    throw new Error('Invalid assignment');
  }

  const checkpoints = await prisma.checkpoint.findMany({
    where: { premiseId: assignment.premiseId },
    select: { id: true, name: true, sequence: true, intervalMinutes: true },
  });

  const orderedCheckpoints = getOrderedCheckpoints(checkpoints);
  const lastProgress = await getLastProgressEvent({
    guardId,
    assignmentId,
    assignmentStartTime: assignment.startTime,
    orderedCheckpoints,
  });

  const { expectedCheckpoint, dueByCheckpointId } = computeNextDueTimesForCycle({
    orderedCheckpoints,
    assignmentStartTime: assignment.startTime,
    assignmentIntervalMinutes: assignment.intervalMinutes,
    lastProgress,
  });

  if (checkpointId !== expectedCheckpoint.id) return 'GREEN';

  const dueTime = dueByCheckpointId.get(expectedCheckpoint.id);
  if (!dueTime) return 'GREEN';
  return computeStatusFromDueTime(referenceTime, dueTime);
}

export async function getPremiseStatus(premiseId: string): Promise<PremiseStatusItem[]> {
  const now = new Date();

  const checkpoints = await prisma.checkpoint.findMany({
    where: { premiseId },
    select: { id: true, name: true, sequence: true, intervalMinutes: true },
  });
  if (checkpoints.length === 0) return [];

  const orderedCheckpoints = getOrderedCheckpoints(checkpoints);

  const activeAssignments = await prisma.guardAssignment.findMany({
    where: {
      premiseId,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: {
      guard: { select: { id: true, name: true } },
    },
  });

  const results: PremiseStatusItem[] = [];

  for (const assignment of activeAssignments) {
    const [checkIns, resolvedAlerts] = await Promise.all([
      prisma.checkIn.findMany({
        where: {
          guardId: assignment.guardId,
          assignmentId: assignment.id,
          scannedAt: { gte: assignment.startTime },
        },
        orderBy: { scannedAt: 'desc' },
        select: { checkpointId: true, scannedAt: true },
      }),
      prisma.alert.findMany({
        where: {
          guardId: assignment.guardId,
          assignmentId: assignment.id,
          status: 'RESOLVED',
          resolvedAt: { not: null },
        },
        orderBy: { resolvedAt: 'desc' },
        select: { checkpointId: true, resolvedAt: true },
      }),
    ]);

    const latestCompletionByCheckpoint = new Map<string, Date>();
    for (const checkIn of checkIns) {
      if (!latestCompletionByCheckpoint.has(checkIn.checkpointId)) {
        latestCompletionByCheckpoint.set(checkIn.checkpointId, checkIn.scannedAt);
      }
    }
    for (const alert of resolvedAlerts) {
      if (!alert.resolvedAt) continue;
      const existing = latestCompletionByCheckpoint.get(alert.checkpointId);
      if (!existing || alert.resolvedAt > existing) {
        latestCompletionByCheckpoint.set(alert.checkpointId, alert.resolvedAt);
      }
    }

    const lastProgress = await getLastProgressEvent({
      guardId: assignment.guardId,
      assignmentId: assignment.id,
      assignmentStartTime: assignment.startTime,
      orderedCheckpoints,
    });

    const { expectedCheckpoint, dueByCheckpointId } = computeNextDueTimesForCycle({
      orderedCheckpoints,
      assignmentStartTime: assignment.startTime,
      assignmentIntervalMinutes: assignment.intervalMinutes,
      lastProgress,
    });

    const expectedDueTime = dueByCheckpointId.get(expectedCheckpoint.id) ?? assignment.startTime;
    const expectedStatus = computeStatusFromDueTime(now, expectedDueTime);

    for (const cp of orderedCheckpoints) {
      const lastScan = latestCompletionByCheckpoint.get(cp.id) ?? assignment.startTime;
      const nextDueTime = dueByCheckpointId.get(cp.id) ?? expectedDueTime;
      const status = cp.id === expectedCheckpoint.id ? expectedStatus : 'GREEN';

      results.push({
        checkpointId: cp.id,
        checkpointName: cp.name,
        guardId: assignment.guardId,
        guardName: assignment.guard.name,
        lastScan,
        nextDueTime,
        status,
      });
    }
  }

  return results;
}
