import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function overrideCheckInStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { note } = req.body as { note?: string };
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!note || note.trim().length < 3) {
      return res.status(400).json({ error: 'A note (min 3 chars) is required to override' });
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        overrideStatus: true,
        overrideNote: true,
        guardId: true,
        checkpointId: true,
        assignmentId: true,
        scannedAt: true,
      },
    });

    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    if (checkIn.overrideStatus === 'GREEN') {
      return res.status(400).json({ error: 'Check-in already overridden to GREEN' });
    }

    const updated = await prisma.checkIn.update({
      where: { id },
      data: {
        overrideStatus: 'GREEN',
        overrideNote: note.trim(),
        overriddenBy: userId,
        overriddenAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        overrideStatus: true,
        overrideNote: true,
        overriddenBy: true,
        overriddenAt: true,
        guardId: true,
        checkpointId: true,
        assignmentId: true,
        scannedAt: true,
      },
    });

    res.json({
      ...updated,
      effectiveStatus: 'GREEN',
      originalStatus: checkIn.status,
    });
  } catch (error) {
    console.error('Override check-in error:', error);
    res.status(500).json({ error: 'Failed to override check-in' });
  }
}
