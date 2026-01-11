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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  LocationOn as LocationOnIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { guardService } from '../../services/guardService';
import { assignmentService } from '../../services/assignmentService';
import type { ActiveAssignment, NextCheckpointResponse } from '../../services/guardService';
import type { Assignment } from '../../services/assignmentService';

export default function GuardDashboardPage() {
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [nextCheckpoint, setNextCheckpoint] = useState<NextCheckpointResponse | null>(null);
  const [upcoming, setUpcoming] = useState<Assignment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setInfo('');

      const assignmentResponse = await guardService.getMyActiveAssignment();
      if (!assignmentResponse.hasActiveAssignment) {
        setAssignment(null);
        setNextCheckpoint(null);
        setInfo(assignmentResponse.message || 'No active assignment found. Please contact your supervisor.');
      } else {
        setAssignment(assignmentResponse);
      }

      const [next, upcomingAssignments] = await Promise.all([
        assignmentResponse.hasActiveAssignment
          ? guardService.getNextCheckpoint().catch((err: any) => {
              const code = err?.response?.data?.code;
              if (code === 'NO_ACTIVE_ASSIGNMENT') {
                setInfo(err?.response?.data?.error || 'No active assignment found. Please contact your supervisor.');
                return null;
              }
              return null;
            })
          : Promise.resolve(null),
        assignmentService.getUpcoming({ days: 14, limit: 10 }).catch(() => []),
      ]);

      setNextCheckpoint(next);
      setUpcoming(upcomingAssignments);
    } catch (err: any) {
      setAssignment(null);
      setNextCheckpoint(null);
      setUpcoming([]);
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Guard Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {info && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInfo('')}>
          {info}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          {assignment ? (
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
                          {nextCheckpoint.dueTime && (
                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                              Due at: {new Date(nextCheckpoint.dueTime).toLocaleTimeString()}
                            </Typography>
                          )}
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
          ) : (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                No Active Assignment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {info || 'No active assignment found. Please contact your supervisor.'}
              </Typography>
            </Paper>
          )}
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
                  disabled={!assignment}
                >
                  Check In
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LocationOnIcon />}
                  onClick={() => navigate('/guard/checkpoints')}
                  fullWidth
                  size="large"
                  disabled={!assignment}
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

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Upcoming Schedule</Typography>
              <Button variant="outlined" onClick={loadData} disabled={loading}>
                Refresh
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Premise</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No upcoming shifts scheduled
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcoming.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.premise?.name || '-'}</TableCell>
                        <TableCell>{new Date(a.startTime).toLocaleString()}</TableCell>
                        <TableCell>{new Date(a.endTime).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
