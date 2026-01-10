import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  LocationOn as LocationOnIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { guardService } from '../../services/guardService';
import type { ActiveAssignment, NextCheckpointResponse } from '../../services/guardService';

export default function GuardDashboardPage() {
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [nextCheckpoint, setNextCheckpoint] = useState<NextCheckpointResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAssignment();
  }, []);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      setInfo('');

      const assignmentResponse = await guardService.getMyActiveAssignment();
      if (!assignmentResponse.hasActiveAssignment) {
        setAssignment(null);
        setNextCheckpoint(null);
        setInfo(assignmentResponse.message || 'No active assignment found. Please contact your supervisor.');
        return;
      }

      setAssignment(assignmentResponse);
      const next = await guardService.getNextCheckpoint().catch((err: any) => {
        const code = err?.response?.data?.code;
        if (code === 'NO_ACTIVE_ASSIGNMENT') {
          setInfo(err?.response?.data?.error || 'No active assignment found. Please contact your supervisor.');
          return null;
        }
        return null;
      });
      setNextCheckpoint(next);
    } catch (err: any) {
      setAssignment(null);
      setNextCheckpoint(null);
      setError(err.response?.data?.error || err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !assignment) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!assignment) {
    return (
      <Box>
        <Alert severity="info">{info || 'No active assignment found. Please contact your supervisor.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Guard Dashboard
      </Typography>

      {info && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInfo('')}>
          {info}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Assignment
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Premise:</strong> {assignment.premise.name}
              </Typography>
              {assignment.premise.address && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {assignment.premise.address}
                </Typography>
              )}
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Shift Start:</strong>{' '}
                {new Date(assignment.startTime).toLocaleString()}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Shift End:</strong>{' '}
                {new Date(assignment.endTime).toLocaleString()}
              </Typography>
              {nextCheckpoint && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'primary.light',
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Next Expected Checkpoint
                  </Typography>
                  {nextCheckpoint.nextCheckpoint ? (
                    <>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {nextCheckpoint.nextCheckpoint.sequence
                          ? `${nextCheckpoint.nextCheckpoint.sequence}. ${nextCheckpoint.nextCheckpoint.name}`
                          : nextCheckpoint.nextCheckpoint.name}
                      </Typography>
                      {nextCheckpoint.nextCheckpoint.description && (
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {nextCheckpoint.nextCheckpoint.description}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                          Looping route — remaining this loop: {nextCheckpoint.remaining} of {nextCheckpoint.total}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                          Current lap: {nextCheckpoint.lapNumber} (laps completed: {nextCheckpoint.lapsCompleted})
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      No checkpoints configured for this premise.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => navigate('/guard/scan')}
                  fullWidth
                  size="large"
                >
                  Go to Scan
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LocationOnIcon />}
                  onClick={() => navigate('/guard/checkpoints')}
                  fullWidth
                  size="large"
                >
                  View Checkpoints
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/guard/history')}
                  fullWidth
                  size="large"
                >
                  View History
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
