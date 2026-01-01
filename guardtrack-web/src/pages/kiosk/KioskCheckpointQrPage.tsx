import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';

const REFRESH_INTERVAL_MS = 30_000; // refresh QR image every 30 seconds
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
  const [qrUrl, setQrUrl] = useState<string>('');
  const [status, setStatus] = useState<CheckpointStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    if (!id) return;

    const buildQrUrl = () =>
      `${API_BASE_URL}/checkpoints/${id}/qr-rotating?t=${Date.now()}`;

    // Initial load
    setQrUrl(buildQrUrl());

    // Periodically refresh QR to pick up new rotating token
    const qrInterval = setInterval(() => {
      setQrUrl(buildQrUrl());
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(qrInterval);
  }, [id, API_BASE_URL]);

  useEffect(() => {
    if (!id) return;

    const loadStatus = async () => {
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
    };

    // Initial load
    loadStatus();

    // Periodically refresh status
    const statusInterval = setInterval(loadStatus, STATUS_REFRESH_INTERVAL_MS);

    return () => clearInterval(statusInterval);
  }, [id, API_BASE_URL]);

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

        {/* QR Code */}
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
            backgroundColor: '#f5f5f5',
            borderRadius: 2,
          }}
        >
          {qrUrl && (
            <img
              src={qrUrl}
              alt="Checkpoint QR"
              style={{
                width: 320,
                height: 320,
                objectFit: 'contain',
              }}
            />
          )}
        </Box>

        {/* Instructions */}
        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          Scan to Check In
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
          Status updates automatically every 10 seconds
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
          QR code refreshes every 30 minutes
        </Typography>
      </Paper>
    </Box>
  );
}

