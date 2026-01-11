import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  FactCheck as CheckInIcon,
  Schedule as ScheduleIcon,
  Map as MapIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { guardService } from '../../services/guardService';
import { assignmentService, type Assignment } from '../../services/assignmentService';
import type { ActiveAssignment, NextCheckpointResponse } from '../../services/guardService';

export default function V2GuardDashboardPage() {
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [nextCheckpoint, setNextCheckpoint] = useState<NextCheckpointResponse | null>(null);
  const [upcoming, setUpcoming] = useState<Assignment[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const dueChip = useMemo(() => {
    const due = nextCheckpoint?.dueTime ? new Date(nextCheckpoint.dueTime) : null;
    if (!due) return null;
    const ms = due.getTime() - Date.now();
    if (ms <= 0) return <Chip size="small" color="warning" label="Due now" />;
    const minutes = Math.ceil(ms / 60000);
    return <Chip size="small" color="success" label={`Due in ${minutes}m`} />;
  }, [nextCheckpoint?.dueTime]);

  const load = async () => {
    try {
      setError('');
      setInfo('');

      const assignmentResponse = await guardService.getMyActiveAssignment();
      if (!assignmentResponse.hasActiveAssignment) {
        setAssignment(null);
        setNextCheckpoint(null);
        setInfo(assignmentResponse.message || 'No active assignment found. Please contact your supervisor.');
      } else {
        setAssignment(assignmentResponse);
        const next = await guardService.getNextCheckpoint().catch(() => null);
        setNextCheckpoint(next);
      }

      const upcomingAssignments = await assignmentService.getUpcoming({ days: 14, limit: 10 }).catch(() => []);
      setUpcoming(upcomingAssignments);
    } catch (err: any) {
      setAssignment(null);
      setNextCheckpoint(null);
      setUpcoming([]);
      setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Typography variant="h4">Guard Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Zentech • clean overview for your shift and upcoming schedule
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" onClick={load}>
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckInIcon />}
            disabled={!assignment}
            onClick={() => navigate('/v2/guard/scan')}
          >
            Check In
          </Button>
        </Stack>
      </Stack>

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

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Current Shift</Typography>
                <Chip size="small" icon={<ScheduleIcon fontSize="small" />} label={assignment ? 'Active' : 'Inactive'} color={assignment ? 'success' : 'default'} />
              </Stack>
              {assignment ? (
                <Stack gap={1}>
                  <Typography variant="body1" sx={{ fontWeight: 750 }}>
                    {assignment.premise.name}
                  </Typography>
                  {assignment.premise.address && (
                    <Typography variant="body2" color="text.secondary">
                      {assignment.premise.address}
                    </Typography>
                  )}
                  <Divider sx={{ my: 1.5 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Start
                      </Typography>
                      <Typography variant="body2">{new Date(assignment.startTime).toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        End
                      </Typography>
                      <Typography variant="body2">{new Date(assignment.endTime).toLocaleString()}</Typography>
                    </Grid>
                  </Grid>

                  {nextCheckpoint?.nextCheckpoint && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            Next expected checkpoint
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 750 }} noWrap>
                            {nextCheckpoint.nextCheckpoint.name}
                          </Typography>
                          {nextCheckpoint.dueTime && (
                            <Typography variant="body2" color="text.secondary">
                              Due at {new Date(nextCheckpoint.dueTime).toLocaleTimeString()}
                            </Typography>
                          )}
                        </Box>
                        {dueChip}
                      </Stack>
                    </>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No active assignment right now.
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}>
                  <Button fullWidth variant="outlined" startIcon={<MapIcon />} disabled={!assignment} onClick={() => navigate('/v2/guard/checkpoints')}>
                    Checkpoints
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button fullWidth variant="outlined" startIcon={<HistoryIcon />} onClick={() => navigate('/v2/guard/history')}>
                    History
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button fullWidth variant="outlined" onClick={() => navigate('/guard/dashboard')}>
                    Classic
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Upcoming Schedule</Typography>
                <Chip size="small" label="14 days" />
              </Stack>
              {upcoming.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming shifts scheduled.
                </Typography>
              ) : (
                <Stack gap={1.25}>
                  {upcoming.map((a) => (
                    <Box
                      key={a.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(148,163,184,0.18)',
                        bgcolor: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 750 }}>
                        {a.premise?.name || 'Premise'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(a.startTime).toLocaleString()} → {new Date(a.endTime).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
