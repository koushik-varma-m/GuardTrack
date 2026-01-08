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

const ORANGE_THRESHOLD_MINUTES = 5; // Orange status for 5 minutes after due time
const toMs = (minutes: number) => minutes * 60_000;

type MinimalCheckpoint = {
  id: string;
  name: string;
  sequence: number | null;
  intervalMinutes: number | null;
};

type MinimalAssignment = {
  id: string;
  guardId: string;
  startTime: Date;
  guard: { id: string; name: string };
};

function buildSequentialStatuses({
  checkpoints,
  assignment,
  checkIns,
  now,
}: {
  checkpoints: MinimalCheckpoint[];
  assignment: MinimalAssignment;
  checkIns: { checkpointId: string; scannedAt: Date }[];
  now: Date;
}): PremiseStatusItem[] {
  if (checkpoints.some((c) => c.sequence === null || c.sequence === undefined)) {
    throw new Error('Checkpoint sequence not configured');
  }

  const sortedCheckpoints = [...checkpoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const offsetsMinutes = new Map<string, number>(); // minutes from shift start to this checkpoint (first loop)
  const intervalsMinutes = new Map<string, number>(); // resolved interval per checkpoint

  let runningOffset = 0;
  for (const cp of sortedCheckpoints) {
    if (cp.intervalMinutes === null || cp.intervalMinutes === undefined) {
      throw new Error('Checkpoint interval not configured');
    }
    const interval = cp.intervalMinutes;
    intervalsMinutes.set(cp.id, interval);
    runningOffset += interval;
    offsetsMinutes.set(cp.id, runningOffset);
  }

  const totalCycleMinutes = runningOffset;
  if (totalCycleMinutes <= 0) {
    throw new Error('Invalid interval configuration');
  }

  // Most recent scan per checkpoint for this assignment/guard
  const latestScanByCheckpoint = new Map<string, Date>();
  for (const checkIn of checkIns) {
    if (!latestScanByCheckpoint.has(checkIn.checkpointId)) {
      latestScanByCheckpoint.set(checkIn.checkpointId, checkIn.scannedAt);
    }
  }

  const statuses: PremiseStatusItem[] = [];
  const nowMs = now.getTime();
  const startMs = assignment.startTime.getTime();
  const totalCycleMs = toMs(totalCycleMinutes);

  for (const checkpoint of sortedCheckpoints) {
    const interval = intervalsMinutes.get(checkpoint.id)!;
    const offsetMinutes = offsetsMinutes.get(checkpoint.id)!;
    const firstDueMs = startMs + toMs(offsetMinutes);

    let expectedDueMs = firstDueMs;
    if (nowMs > firstDueMs) {
      const cyclesPassed = Math.floor((nowMs - firstDueMs) / totalCycleMs);
      expectedDueMs = firstDueMs + cyclesPassed * totalCycleMs;
    }

    const lastScan = latestScanByCheckpoint.get(checkpoint.id) ?? null;
    const intervalMs = toMs(interval);
    const earlyWindowMs = expectedDueMs - intervalMs; // allow early scans within travel window for this loop
    const orangeThresholdMs = expectedDueMs + toMs(ORANGE_THRESHOLD_MINUTES);

    let status: CheckpointStatus;
    if (lastScan) {
      const lastScanMs = lastScan.getTime();
      const inThisCycle = lastScanMs >= earlyWindowMs && lastScanMs <= expectedDueMs + totalCycleMs;

      if (inThisCycle) {
        if (lastScanMs <= expectedDueMs) {
          status = 'GREEN';
        } else if (lastScanMs <= orangeThresholdMs) {
          status = 'ORANGE';
        } else {
          status = 'RED';
        }
      } else {
        // No scan for the current cycle
        if (nowMs <= expectedDueMs) {
          status = 'GREEN';
        } else if (nowMs <= orangeThresholdMs) {
          status = 'ORANGE';
        } else {
          status = 'RED';
        }
      }
    } else {
      // Never scanned this checkpoint
      if (nowMs <= expectedDueMs) {
        status = 'GREEN';
      } else if (nowMs <= orangeThresholdMs) {
        status = 'ORANGE';
      } else {
        status = 'RED';
      }
    }

    statuses.push({
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.name,
      guardId: assignment.guardId,
      guardName: assignment.guard.name,
      lastScan: lastScan ?? assignment.startTime,
      nextDueTime: new Date(expectedDueMs),
      status,
    });
  }

  return statuses;
}

/**
 * Compute status for a single guard + assignment + checkpoint combination using
 * sequential timing that loops 1 -> n -> 1 for the shift.
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
      guard: {
        select: { id: true, name: true },
      },
    },
  });

  if (!assignment || assignment.guardId !== guardId) {
    throw new Error('Invalid assignment');
  }

  const checkpoints = await prisma.checkpoint.findMany({
    where: { premiseId: assignment.premiseId },
    select: {
      id: true,
      name: true,
      sequence: true,
      intervalMinutes: true,
    },
    orderBy: { sequence: 'asc' },
  });

  if (checkpoints.some((c) => c.intervalMinutes === null || c.intervalMinutes === undefined)) {
    throw new Error('Checkpoint interval not configured');
  }

  const checkIns = await prisma.checkIn.findMany({
    where: {
      assignmentId,
      guardId,
    },
    orderBy: { scannedAt: 'desc' },
    select: { checkpointId: true, scannedAt: true, overrideStatus: true, status: true },
  });

  const latestForTarget = checkIns.find(
    (c) => c.checkpointId === checkpointId && c.overrideStatus === 'GREEN'
  );
  if (latestForTarget) {
    return 'GREEN';
  }

  const statuses = buildSequentialStatuses({
    checkpoints,
    assignment,
    checkIns,
    now: referenceTime,
  });

  const target = statuses.find((status) => status.checkpointId === checkpointId);
  if (!target) {
    throw new Error('Checkpoint not found for this premise');
  }

  return target.status;
}

export async function getPremiseStatus(premiseId: string): Promise<PremiseStatusItem[]> {
  const now = new Date();

  const checkpoints = await prisma.checkpoint.findMany({
    where: { premiseId },
    select: {
      id: true,
      name: true,
      sequence: true,
      intervalMinutes: true,
    },
    orderBy: { sequence: 'asc' },
  });

  if (checkpoints.length === 0) return [];

  const activeAssignments = await prisma.guardAssignment.findMany({
    where: {
      premiseId,
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

  const statusItems: PremiseStatusItem[] = [];

  for (const assignment of activeAssignments) {
    const checkIns = await prisma.checkIn.findMany({
      where: {
        guardId: assignment.guardId,
        assignmentId: assignment.id,
      },
      orderBy: {
        scannedAt: 'desc',
      },
      select: { checkpointId: true, scannedAt: true },
    });

    const assignmentStatuses = buildSequentialStatuses({
      checkpoints,
      assignment,
      checkIns,
      now,
    });

    statusItems.push(...assignmentStatuses);
  }

  return statusItems;
}
