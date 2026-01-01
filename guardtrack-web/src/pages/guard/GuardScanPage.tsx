import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { QrCodeScanner as QrCodeScannerIcon, Edit as EditIcon } from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';
import { guardService } from '../../services/guardService';
import type { CheckInResponse, NextCheckpointResponse } from '../../services/guardService';

export default function GuardScanPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [error, setError] = useState('');
  const [manualDialog, setManualDialog] = useState(false);
  const [manualCheckpointId, setManualCheckpointId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lapSnackbar, setLapSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const [prevLapNumber, setPrevLapNumber] = useState<number | null>(null);
  const [nextCheckpoint, setNextCheckpoint] = useState<NextCheckpointResponse | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    loadNextCheckpoint();
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {
            // Ignore errors during cleanup
          });
      }
    };
  }, []);

  const loadNextCheckpoint = async () => {
    try {
      setLoadingNext(true);
      const data = await guardService.getNextCheckpoint();
      if (prevLapNumber === null) {
        setPrevLapNumber(data.lapNumber ?? 1);
      } else if (data.lapNumber && data.lapNumber > prevLapNumber) {
        setLapSnackbar({
          open: true,
          message: `Lap ${data.lapNumber - 1} completed. Starting lap ${data.lapNumber}.`,
        });
        setPrevLapNumber(data.lapNumber);
      }
      setNextCheckpoint(data);
    } catch (err: any) {
      // swallow; already enforced by backend on scan
      console.warn('Failed to load next checkpoint', err);
    } finally {
      setLoadingNext(false);
    }
  };

  const startScanning = async () => {
    try {
      setError('');
      setScanning(true);
      setResult(null);

      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQrCodeDetected(decodedText);
        },
        () => {
          // Ignore scanning errors
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        // Ignore errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleQrCodeDetected = async (decodedText: string) => {
    try {
      // Parse JSON from QR code
      const qrData = JSON.parse(decodedText);

      if (!qrData.checkpointId) {
        setError('Invalid QR code format');
        return;
      }

      const token =
        typeof qrData.token === 'string' ? (qrData.token as string) : undefined;

      await stopScanning();
      
      // Pre-check if guard can scan this checkpoint
      try {
        const canScan = await guardService.canScanCheckpoint(qrData.checkpointId);
        if (!canScan.canScan) {
          setError(canScan.error || 'You are not authorized to scan this checkpoint');
          return;
        }
      } catch (preCheckErr: any) {
        // If pre-check fails, still try to scan (backend will validate)
        console.warn('Pre-check failed, proceeding with scan:', preCheckErr);
      }

      await createCheckIn(qrData.checkpointId, token);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid QR code format');
      } else {
        setError(err.message || 'Failed to process QR code');
      }
      await stopScanning();
    }
  };

  const createCheckIn = async (checkpointId: string, token?: string) => {
    try {
      setSubmitting(true);
      setError('');
      const response = await guardService.createMyCheckIn(checkpointId, token);
      setResult(response);
      setSnackbarOpen(true);
      await loadNextCheckpoint();
    } catch (err: any) {
      // Enhanced error handling with specific error codes
      const errorData = err.response?.data;
      let errorMessage = errorData?.error || err.message || 'Failed to create check-in';
      
      // Provide user-friendly error messages based on error code
      if (errorData?.code === 'NOT_ASSIGNED_TO_PREMISE') {
        errorMessage = `Access denied: ${errorMessage}`;
      } else if (errorData?.code === 'ASSIGNMENT_NOT_STARTED') {
        errorMessage = `Cannot scan: ${errorMessage}`;
      } else if (errorData?.code === 'ASSIGNMENT_ENDED') {
        errorMessage = `Cannot scan: ${errorMessage}`;
      } else if (errorData?.code === 'NO_ASSIGNMENT') {
        errorMessage = `Access denied: ${errorMessage}`;
      } else if (errorData?.code === 'GUARD_ROLE_REQUIRED') {
        errorMessage = `Access denied: ${errorMessage}`;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCheckpointId.trim()) {
      setError('Please enter a checkpoint ID');
      return;
    }
    setManualDialog(false);
    await createCheckIn(manualCheckpointId.trim());
    setManualCheckpointId('');
  };

  const getStatusColor = (status: 'GREEN' | 'ORANGE' | 'RED') => {
    switch (status) {
      case 'GREEN':
        return 'success';
      case 'ORANGE':
        return 'warning';
      case 'RED':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Scan Checkpoint
      </Typography>

      {nextCheckpoint && (
        <Alert
          severity={nextCheckpoint.nextCheckpoint ? 'info' : 'success'}
          sx={{ mb: 2 }}
        >
          {loadingNext && 'Loading next expected checkpoint...'}
          {!loadingNext && nextCheckpoint.nextCheckpoint && (
            <>
              Next expected checkpoint:{' '}
              <strong>
                {nextCheckpoint.nextCheckpoint.sequence
                  ? `${nextCheckpoint.nextCheckpoint.sequence}. ${nextCheckpoint.nextCheckpoint.name}`
                  : nextCheckpoint.nextCheckpoint.name}
              </strong>
              {nextCheckpoint.remaining !== undefined && (
                <>
                  {' '}— Lap {nextCheckpoint.lapNumber} ({nextCheckpoint.lapsCompleted} completed), {nextCheckpoint.remaining} remaining in this loop
                </>
              )}
            </>
          )}
          {!loadingNext && !nextCheckpoint.nextCheckpoint && 'No checkpoints configured for this premise.'}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">QR Code Scanner</Typography>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setManualDialog(true)}
          >
            Manual Entry
          </Button>
        </Box>

        {!scanning ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 4,
              border: '2px dashed #ccc',
              borderRadius: 2,
            }}
          >
            <QrCodeScannerIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Button
              variant="contained"
              size="large"
              onClick={startScanning}
              disabled={submitting}
            >
              Start Scanning
            </Button>
          </Box>
        ) : (
          <Box>
            <div id={qrCodeRegionId} style={{ width: '100%' }} />
            <Button
              variant="outlined"
              onClick={stopScanning}
              fullWidth
              sx={{ mt: 2 }}
            >
              Stop Scanning
            </Button>
          </Box>
        )}

        {submitting && (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        )}
      </Paper>

      {result && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Check-in Result
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Checkpoint:</strong> {result.checkpointName}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Status:</strong>{' '}
              <Chip
                label={result.status}
                color={getStatusColor(result.status) as any}
                size="small"
                sx={{ ml: 1 }}
              />
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Scanned At:</strong>{' '}
              {new Date(result.scannedAt).toLocaleString()}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>On Time:</strong>{' '}
              {result.isOnTime ? 'Yes' : 'No'}
            </Typography>
            <Typography variant="body1">
              <strong>Message:</strong> {result.message}
            </Typography>
          </Box>
        </Paper>
      )}

      <Dialog open={manualDialog} onClose={() => setManualDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manual Checkpoint Entry</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Checkpoint ID"
            fullWidth
            variant="outlined"
            value={manualCheckpointId}
            onChange={(e) => setManualCheckpointId(e.target.value)}
            placeholder="Enter checkpoint ID"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialog(false)}>Cancel</Button>
          <Button onClick={handleManualSubmit} variant="contained" disabled={!manualCheckpointId.trim()}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={result ? getStatusColor(result.status) : 'info'}
          sx={{ width: '100%' }}
        >
          {result?.message || 'Check-in recorded'}
        </Alert>
      </Snackbar>

      <Snackbar
        open={lapSnackbar.open}
        autoHideDuration={5000}
        onClose={() => setLapSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setLapSnackbar({ open: false, message: '' })}
          severity="info"
          sx={{ width: '100%' }}
        >
          {lapSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
