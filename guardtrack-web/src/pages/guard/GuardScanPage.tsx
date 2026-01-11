import { useState, useEffect } from 'react';
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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { guardService } from '../../services/guardService';
import type { CheckInResponse, NextCheckpointResponse, Checkpoint } from '../../services/guardService';

export default function GuardScanPage() {
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [manualDialog, setManualDialog] = useState(false);
  const [manualCheckpointId, setManualCheckpointId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rfidSubmitting, setRfidSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lapSnackbar, setLapSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const [prevLapNumber, setPrevLapNumber] = useState<number | null>(null);
  const [nextCheckpoint, setNextCheckpoint] = useState<NextCheckpointResponse | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [myCheckpoints, setMyCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>('');
  const [rfidTag, setRfidTag] = useState('');

  useEffect(() => {
    loadNextCheckpoint();
    loadCheckpoints();
  }, []);

  const loadNextCheckpoint = async () => {
    try {
      setInfo('');
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
      if (!selectedCheckpointId && data.nextCheckpoint?.id) {
        setSelectedCheckpointId(data.nextCheckpoint.id);
      }
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'NO_ACTIVE_ASSIGNMENT') {
        setInfo(err.response?.data?.error || 'No active assignment found. Please contact your supervisor.');
        setNextCheckpoint(null);
        return;
      }
      console.warn('Failed to load next checkpoint', err);
    } finally {
      setLoadingNext(false);
    }
  };

  const loadCheckpoints = async () => {
    try {
      setInfo('');
      const checkpoints = await guardService.getMyCheckpoints();
      setMyCheckpoints(checkpoints);
      if (!selectedCheckpointId && checkpoints.length > 0) {
        setSelectedCheckpointId(checkpoints[0].id);
      }
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'NO_ACTIVE_ASSIGNMENT') {
        setInfo(err.response?.data?.error || 'No active assignment found. Please contact your supervisor.');
        setMyCheckpoints([]);
        return;
      }
      console.warn('Failed to load checkpoints', err);
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
      } else if (errorData?.code === 'CHECKPOINT_NOT_DUE') {
        const due = errorData?.dueTime ? new Date(errorData.dueTime).toLocaleTimeString() : null;
        const name = errorData?.nextCheckpointName;
        errorMessage = due && name ? `Not due yet. Wait until ${due} to scan "${name}".` : errorMessage;
      } else if (errorData?.code === 'SEQUENCE_ENFORCED') {
        const name = errorData?.nextCheckpointName;
        const due = errorData?.dueTime ? new Date(errorData.dueTime).toLocaleTimeString() : null;
        if (name && due) {
          errorMessage = `Next expected checkpoint: "${name}" (due at ${due}).`;
        } else if (name) {
          errorMessage = `Next expected checkpoint: "${name}".`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRfidSubmit = async () => {
    const checkpointId = selectedCheckpointId.trim();
    const tag = rfidTag.trim();
    if (!checkpointId) {
      setError('Please select a checkpoint');
      return;
    }
    if (!tag) {
      setError('Tap your RFID card to fill the tag value');
      return;
    }
    try {
      setError('');
      setRfidSubmitting(true);
      setResult(null);
      const response = await guardService.createCheckInViaRfid(tag, checkpointId);
      setResult(response);
      setSnackbarOpen(true);
      setRfidTag('');
      await loadNextCheckpoint();
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || err.message || 'RFID check-in failed';
      setError(errorMessage);
    } finally {
      setRfidSubmitting(false);
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
        Check In
      </Typography>

      {info && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInfo('')}>
          {info}
        </Alert>
      )}

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
          <Typography variant="h6">Manual Check-in</Typography>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setManualDialog(true)}>
            Enter Checkpoint ID
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          QR scanning is disabled. Select a checkpoint and submit a check-in, or use RFID below.
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <FormControl fullWidth>
            <InputLabel>Checkpoint</InputLabel>
            <Select
              value={selectedCheckpointId}
              label="Checkpoint"
              onChange={(e) => setSelectedCheckpointId(e.target.value)}
              disabled={submitting || !!info}
            >
              {myCheckpoints.length === 0 && (
                <MenuItem value="" disabled>
                  No checkpoints found
                </MenuItem>
              )}
              {myCheckpoints.map((cp) => (
                <MenuItem key={cp.id} value={cp.id}>
                  {cp.sequence ? `${cp.sequence}. ${cp.name}` : cp.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="large"
            disabled={submitting || !!info || !selectedCheckpointId}
            onClick={() => createCheckIn(selectedCheckpointId)}
          >
            {submitting ? 'Submitting...' : 'Submit Check-in'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">RFID Check-in</Typography>
          <Button variant="text" size="small" onClick={loadNextCheckpoint}>
            Refresh Expected
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Place your cursor in the field and tap your RFID card; most readers act as a keyboard and fill the tag automatically.
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <FormControl fullWidth>
            <InputLabel>Checkpoint</InputLabel>
            <Select
              value={selectedCheckpointId}
              label="Checkpoint"
              onChange={(e) => setSelectedCheckpointId(e.target.value)}
            >
              {myCheckpoints.length === 0 && (
                <MenuItem value="" disabled>
                  No checkpoints found
                </MenuItem>
              )}
              {myCheckpoints.map((cp) => (
                <MenuItem key={cp.id} value={cp.id}>
                  {cp.sequence ? `${cp.sequence}. ${cp.name}` : cp.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="RFID Tag"
            placeholder="Tap card to fill"
            value={rfidTag}
            onChange={(e) => setRfidTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRfidSubmit();
              }
            }}
            autoComplete="off"
            fullWidth
            disabled={rfidSubmitting}
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleRfidSubmit}
            disabled={rfidSubmitting}
          >
            {rfidSubmitting ? 'Processing...' : 'Submit RFID Check-in'}
          </Button>
        </Box>
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
