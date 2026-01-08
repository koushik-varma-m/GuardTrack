import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from '@mui/material';
import { guardService } from '../../services/guardService';
import type { CheckInResponse } from '../../services/guardService';

/**
 * NFC/URL-based check-in page.
 * Intended to be opened via an NFC tag URL that includes checkpointId (and optional token).
 * Example URL to encode on tag: https://yourapp.com/guard/nfc-checkin?checkpointId=CHK123&token=abc
 */
export default function GuardNfcCheckInPage() {
  const [searchParams] = useSearchParams();
  const checkpointId = searchParams.get('checkpointId') || '';
  const token = searchParams.get('token') || undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResponse | null>(null);

  const attemptCheckIn = async () => {
    if (!checkpointId) {
      setError('Missing checkpointId in URL');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const response = await guardService.createMyCheckIn(checkpointId, token);
      setResult(response);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Check-in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    attemptCheckIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointId, token]);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ backgroundColor: '#f5f5f5', p: 2 }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          NFC Check-in
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This page auto-checks you in for the checkpoint encoded on the tag.
        </Typography>

        {loading && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Registering your check-in...
            </Typography>
          </Box>
        )}

        {!loading && error && (
          <Stack spacing={2}>
            <Alert severity="error">{error}</Alert>
            <Button variant="contained" onClick={attemptCheckIn}>
              Retry
            </Button>
          </Stack>
        )}

        {!loading && result && (
          <Stack spacing={2}>
            <Alert severity="success">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {result.checkpointName}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {result.message}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Status: {result.status} • {new Date(result.scannedAt).toLocaleString()}
              </Typography>
            </Alert>
            <Button variant="outlined" onClick={attemptCheckIn}>
              Re-check
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
