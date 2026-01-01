import QRCode from 'qrcode';
import crypto from 'crypto';

const DEFAULT_WINDOW_MINUTES = 30;

function getQrSecret(): string {
  const secret = process.env.QR_SECRET;
  if (!secret) {
    // Fall back to a hard-coded dev secret so local dev still works
    return 'dev-qr-secret-change-in-production';
  }
  return secret;
}

/**
 * Compute a time-window index for rotating QR codes.
 * By default each window is 30 minutes.
 */
export function getTimeWindowIndex(
  date: Date = new Date(),
  windowMinutes: number = DEFAULT_WINDOW_MINUTES
): number {
  const windowMs = windowMinutes * 60 * 1000;
  return Math.floor(date.getTime() / windowMs);
}

/**
 * Generate an HMAC-based token for a checkpoint and time window.
 */
export function generateCheckpointToken(
  checkpointId: string,
  windowIndex: number
): string {
  const secret = getQrSecret();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${checkpointId}:${windowIndex}`);
  return hmac.digest('hex');
}

/**
 * Verify that a provided token is valid for the given checkpoint within
 * the current (or very recent) time window.
 */
export function verifyCheckpointToken(
  checkpointId: string,
  token: string,
  windowMinutes: number = DEFAULT_WINDOW_MINUTES
): boolean {
  const now = new Date();
  const currentIndex = getTimeWindowIndex(now, windowMinutes);

  // Allow current and previous windows to tolerate small clock drift.
  const indicesToCheck = [currentIndex, currentIndex - 1];

  return indicesToCheck.some((index) => {
    const expected = generateCheckpointToken(checkpointId, index);
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(token, 'hex')
    );
  });
}

export interface RotatingCheckpointQrPayload {
  checkpointId: string;
  premiseId: string;
  token: string;
  exp: string; // ISO string when this QR expires
}

export async function generateCheckpointQrPayload(
  checkpointId: string,
  premiseId: string,
  windowMinutes: number = DEFAULT_WINDOW_MINUTES
): Promise<string> {
  const now = new Date();
  const windowIndex = getTimeWindowIndex(now, windowMinutes);
  const token = generateCheckpointToken(checkpointId, windowIndex);

  const exp = new Date(
    (windowIndex + 1) * windowMinutes * 60 * 1000
  ).toISOString();

  const payload: RotatingCheckpointQrPayload = {
    checkpointId,
    premiseId,
    token,
    exp,
  };

  return JSON.stringify(payload);
}

export async function generateCheckpointQrPng(
  checkpointId: string,
  premiseId: string
): Promise<Buffer> {
  const payload = await generateCheckpointQrPayload(checkpointId, premiseId);

  return await QRCode.toBuffer(payload, {
    type: 'png',
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
  });
}

