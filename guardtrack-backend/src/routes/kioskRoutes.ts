import { Router } from 'express';
import { createRfidCheckIn } from '../controllers/kioskController';
import { createCheckpointChallenge } from '../controllers/kioskChallengeController';

const router = Router();

// POST /api/v1/kiosk/checkpoints/:checkpointId/challenge - One-time nonce (anti-replay)
router.post('/checkpoints/:checkpointId/challenge', createCheckpointChallenge);

// POST /api/v1/kiosk/rfid-checkins - Public RFID check-ins from kiosks
router.post('/rfid-checkins', createRfidCheckIn);
router.post('/rfid-checkins/:nonce', createRfidCheckIn);

export default router;
