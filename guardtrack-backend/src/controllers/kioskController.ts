import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { processCheckIn, HttpError } from '../services/checkInProcessor';

/**
 * Public RFID check-in endpoint for kiosks.
 * Expects an RFID tag value and the checkpoint being tapped.
 */
export async function createRfidCheckIn(req: Request, res: Response) {
  try {
    const { rfidTag, checkpointId, token, challengeNonce, nonce } = req.body as {
      rfidTag?: string;
      checkpointId?: string;
      token?: string;
      challengeNonce?: string;
      nonce?: string;
    };

    if (!rfidTag || !checkpointId) {
      return res.status(400).json({ error: 'rfidTag and checkpointId are required' });
    }

    const requiredKioskKey = process.env.KIOSK_API_KEY;
    if (requiredKioskKey) {
      const provided = req.header('x-kiosk-key');
      if (!provided || provided !== requiredKioskKey) {
        return res.status(403).json({ error: 'Forbidden', code: 'KIOSK_KEY_REQUIRED' });
      }
    }

    const providedNonce = req.params.nonce || nonce || challengeNonce || null;
    const mustUseChallenge = !!process.env.KIOSK_API_KEY;

    if (mustUseChallenge && !providedNonce) {
      return res.status(400).json({
        error: 'Kiosk challenge is required',
        code: 'KIOSK_CHALLENGE_REQUIRED',
      });
    }

    const run = async () => {
      if (!providedNonce) {
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
        return res.status(201).json(result);
      }

      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        const challenge = await tx.kioskChallenge.findUnique({
          where: { nonce: providedNonce },
          select: { id: true, checkpointId: true, expiresAt: true, usedAt: true },
        });

        if (!challenge) {
          throw new HttpError(400, 'Invalid kiosk challenge', 'KIOSK_CHALLENGE_INVALID');
        }

        if (challenge.checkpointId !== checkpointId) {
          throw new HttpError(400, 'Kiosk challenge does not match checkpoint', 'KIOSK_CHALLENGE_MISMATCH');
        }

        if (challenge.usedAt) {
          throw new HttpError(409, 'Kiosk challenge already used', 'KIOSK_CHALLENGE_USED');
        }

        if (challenge.expiresAt.getTime() <= now.getTime()) {
          throw new HttpError(400, 'Kiosk challenge expired', 'KIOSK_CHALLENGE_EXPIRED');
        }

        const updated = await tx.kioskChallenge.updateMany({
          where: { id: challenge.id, usedAt: null },
          data: { usedAt: now },
        });
        if (updated.count !== 1) {
          throw new HttpError(409, 'Kiosk challenge already used', 'KIOSK_CHALLENGE_USED');
        }

        const guard = await tx.user.findUnique({
          where: { rfidTag },
          select: { id: true },
        });
        if (!guard) {
          throw new HttpError(404, 'RFID tag not registered to any guard', 'RFID_TAG_NOT_REGISTERED');
        }

        return processCheckIn({
          guardId: guard.id,
          checkpointId,
          token,
          skipTokenValidation: true,
          db: tx,
        });
      });

      return res.status(201).json(result);
    };

    await run();

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
