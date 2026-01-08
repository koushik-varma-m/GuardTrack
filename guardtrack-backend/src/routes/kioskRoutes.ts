import { Router } from 'express';
import { createRfidCheckIn } from '../controllers/kioskController';

const router = Router();

// POST /api/v1/kiosk/rfid-checkins - Public RFID check-ins from kiosks
router.post('/rfid-checkins', createRfidCheckIn);

export default router;
