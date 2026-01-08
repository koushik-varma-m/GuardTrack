import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import axios from 'axios';

const STATUS_REFRESH_INTERVAL_MS = 10_000; // refresh status every 10 seconds

interface CheckpointStatus {
  checkpointId: string;
  checkpointName: string;
  premiseName: string;
  status: 'GREEN' | 'ORANGE' | 'RED' | null;
  lastScan: string | null;
  nextDueTime: string | null;
  intervalMinutes: number | null;
  guardName: string | null;
  hasActiveAssignment: boolean;
}

export default function KioskCheckpointQrPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<CheckpointStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [rfidValue, setRfidValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    message: string;
    status: 'GREEN' | 'ORANGE' | 'RED' | 'ERROR';
    guardName?: string | null;
    checkpointName?: string;
    scannedAt?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const loadStatus = useCallback(async () => {
    if (!id) return;
    try {
      const response = await axios.get<CheckpointStatus>(
        `${API_BASE_URL}/checkpoints/${id}/status-public`
      );
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to load checkpoint status:', error);
    } finally {
      setLoadingStatus(false);
    }
  }, [API_BASE_URL, id]);

  useEffect(() => {
    loadStatus();
    const statusInterval = setInterval(loadStatus, STATUS_REFRESH_INTERVAL_MS);
    return () => clearInterval(statusInterval);
  }, [loadStatus]);

  useEffect(() => {
    focusInput();
  }, []);

  const getStatusColor = (status: 'GREEN' | 'ORANGE' | 'RED' | null) => {
    switch (status) {
      case 'GREEN':
        return '#4caf50';
      case 'ORANGE':
        return '#ff9800';
      case 'RED':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusBgColor = (status: 'GREEN' | 'ORANGE' | 'RED' | null) => {
    switch (status) {
      case 'GREEN':
        return 'rgba(76, 175, 80, 0.1)';
      case 'ORANGE':
        return 'rgba(255, 152, 0, 0.1)';
      case 'RED':
        return 'rgba(244, 67, 54, 0.1)';
      default:
        return 'rgba(158, 158, 158, 0.1)';
    }
  };

  const getAlertSeverity = (status: 'GREEN' | 'ORANGE' | 'RED' | 'ERROR') => {
    switch (status) {
      case 'GREEN':
        return 'success';
      case 'ORANGE':
        return 'warning';
      case 'RED':
        return 'error';
      default:
        return 'error';
    }
  };

  const handleRfidSubmit = async (rfidTag: string) => {
    if (!id || !rfidTag) return;
    setSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/kiosk/rfid-checkins`, {
        rfidTag,
        checkpointId: id,
      });

      setLastResult({
        message: response.data.message,
        status: response.data.status,
        guardName: response.data.guardName,
        checkpointName: response.data.checkpointName,
        scannedAt: response.data.scannedAt,
      });

      await loadStatus();
    } catch (error: any) {
      const message =
        error?.response?.data?.error || 'RFID check-in failed. Please try again.';
      setLastResult({
        message,
        status: 'ERROR',
      });
    } finally {
      setSubmitting(false);
      setRfidValue('');
      focusInput();
    }
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = rfidValue.trim();
    if (!trimmed || submitting) return;
    handleRfidSubmit(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const trimmed = rfidValue.trim();
      if (!trimmed || submitting) return;
      handleRfidSubmit(trimmed);
    }
  };

  if (!id) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography variant="h5" color="error">
          Missing checkpoint ID in URL.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ backgroundColor: '#000', p: 2 }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: '#fff',
          borderRadius: 2,
          maxWidth: 600,
          width: '100%',
        }}
      >
        {/* Checkpoint Name */}
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          {status?.checkpointName || 'Checkpoint'}
        </Typography>
        {status?.premiseName && (
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            {status.premiseName}
          </Typography>
        )}

        {/* Status Display */}
        {loadingStatus ? (
          <Box sx={{ my: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : status ? (
          <Box
            sx={{
              my: 3,
              p: 2,
              borderRadius: 2,
              backgroundColor: getStatusBgColor(status.status),
              border: `2px solid ${getStatusColor(status.status)}`,
            }}
          >
            <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={1}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(status.status),
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: getStatusColor(status.status) }}>
                {status.status || 'NO ASSIGNMENT'}
              </Typography>
            </Box>
            {status.status && (
              <>
                {status.guardName && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                    Guard: <strong>{status.guardName}</strong>
                  </Typography>
                )}
                {status.lastScan && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                    Last Scan: <strong>{new Date(status.lastScan).toLocaleString()}</strong>
                  </Typography>
                )}
                {status.nextDueTime && (
                  <Typography variant="body2" color="textSecondary">
                    Next Due: <strong>{new Date(status.nextDueTime).toLocaleString()}</strong>
                  </Typography>
                )}
                {status.intervalMinutes && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Interval: {status.intervalMinutes} minutes
                  </Typography>
                )}
              </>
            )}
            {!status.hasActiveAssignment && (
              <Typography variant="body2" color="textSecondary">
                No active assignment
              </Typography>
            )}
          </Box>
        ) : null}

        {/* RFID Tap Area */}
        <Box
          component="form"
          onSubmit={handleFormSubmit}
          onClick={focusInput}
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 2,
            border: '2px dashed #9e9e9e',
            backgroundColor: '#fafafa',
            cursor: 'pointer',
          }}
        >
          <Stack spacing={1.5} alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Tap your RFID card to check in
            </Typography>
            <Typography variant="body2" color="textSecondary">
              The field below will capture the tag automatically. Click to refocus if needed.
            </Typography>
            <TextField
              inputRef={inputRef}
              fullWidth
              variant="outlined"
              label="RFID Tag"
              value={rfidValue}
              onChange={(e) => setRfidValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              placeholder="Tap card or type tag ID, then press Enter"
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting || !rfidValue.trim()}
            >
              {submitting ? 'Processing...' : 'Submit Tap'}
            </Button>
          </Stack>
        </Box>

        {/* Last result */}
        {lastResult && (
          <Alert
            severity={getAlertSeverity(lastResult.status)}
            sx={{ mt: 3, textAlign: 'left' }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {lastResult.checkpointName || status?.checkpointName || 'Checkpoint'} —{' '}
              {lastResult.status}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {lastResult.message}
            </Typography>
            {lastResult.guardName && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Guard: {lastResult.guardName}
              </Typography>
            )}
            {lastResult.scannedAt && (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                Logged at {new Date(lastResult.scannedAt).toLocaleString()}
              </Typography>
            )}
          </Alert>
        )}

        {/* Instructions */}
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 3 }}>
          Status updates automatically every 10 seconds
        </Typography>
      </Paper>
    </Box>
  );
}
