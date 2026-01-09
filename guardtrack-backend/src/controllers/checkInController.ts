import { Request, Response } from 'express';
import { processCheckIn, HttpError } from '../services/checkInProcessor';

export async function createCheckIn(req: Request, res: Response) {
  try {
    const guardId = req.user?.id;

    if (!guardId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { checkpointId, token } = req.body as { checkpointId?: string; token?: string };

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
    console.error('Create check-in error:', error);
    res.status(500).json({ error: 'Failed to create check-in' });
  }
}
