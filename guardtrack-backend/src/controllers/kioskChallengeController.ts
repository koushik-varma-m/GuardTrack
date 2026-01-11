import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';

function isKioskAuthorized(req: Request): boolean {
  const requiredKey = process.env.KIOSK_API_KEY;
  if (!requiredKey) return true;
  const provided = req.header('x-kiosk-key');
  return !!provided && provided === requiredKey;
}

export async function createCheckpointChallenge(req: Request, res: Response) {
  try {
    if (!isKioskAuthorized(req)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'KIOSK_KEY_REQUIRED',
      });
    }

    const { checkpointId } = req.params;
    if (!checkpointId) {
      return res.status(400).json({ error: 'checkpointId is required' });
    }

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: checkpointId },
      select: { id: true },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found', code: 'CHECKPOINT_NOT_FOUND' });
    }

    const ttlSecondsRaw = process.env.KIOSK_CHALLENGE_TTL_SECONDS;
    const ttlSeconds = (() => {
      const n = ttlSecondsRaw ? Number.parseInt(ttlSecondsRaw, 10) : 30;
      if (!Number.isFinite(n) || n <= 0) return 30;
      return Math.min(n, 300);
    })();

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const nonce = randomUUID();

    await prisma.kioskChallenge.create({
      data: {
        nonce,
        checkpointId,
        expiresAt,
      },
    });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    const checkInUrl = `${baseUrl}/api/v1/kiosk/rfid-checkins/${nonce}`;

    res.status(201).json({
      nonce,
      expiresAt,
      checkInUrl,
    });
  } catch (error) {
    console.error('Create kiosk challenge error:', error);
    res.status(500).json({ error: 'Failed to create kiosk challenge' });
  }
}

