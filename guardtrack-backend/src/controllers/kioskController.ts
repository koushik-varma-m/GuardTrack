import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { processCheckIn, HttpError } from '../services/checkInProcessor';

/**
 * Public RFID check-in endpoint for kiosks.
 * Expects an RFID tag value and the checkpoint being tapped.
 */
export async function createRfidCheckIn(req: Request, res: Response) {
  try {
    const { rfidTag, checkpointId, token } = req.body as {
      rfidTag?: string;
      checkpointId?: string;
      token?: string;
    };

    if (!rfidTag || !checkpointId) {
      return res.status(400).json({ error: 'rfidTag and checkpointId are required' });
    }

    const guard = await prisma.user.findUnique({
      where: { rfidTag },
      select: { id: true },
    });

    if (!guard) {
      return res.status(404).json({ error: 'RFID tag not registered to any guard' });
    }

    const result = await processCheckIn({
      guardId: guard.id,
      checkpointId,
      token,
      skipTokenValidation: true,
    });

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

    console.error('RFID check-in error:', error);
    res.status(500).json({ error: 'Failed to create check-in via RFID' });
  }
}
