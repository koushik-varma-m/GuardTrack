import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  Map as MapIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { assignmentService, type Assignment } from '../../services/assignmentService';

export default function V2AdminOverviewPage() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<Assignment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const u = await assignmentService.getUpcoming({ days: 14, limit: 20 }).catch(() => []);
      setUpcoming(u);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load admin overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={3}>
        <Box>
          <Typography variant="h4">Admin Overview</Typography>
          <Typography variant="body2" color="text.secondary">
            Quick access to management and upcoming shifts
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardActionArea onClick={() => navigate('/v2/admin/premises')}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6">Premises</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Maps, checkpoints, QR
                    </Typography>
                  </Box>
                  <MapIcon />
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardActionArea onClick={() => navigate('/v2/admin/assignments')}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6">Assignments</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Guard schedules
                    </Typography>
                  </Box>
                  <ScheduleIcon />
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardActionArea onClick={() => navigate('/v2/admin/users')}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6">Users</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Admins, analysts, guards
                    </Typography>
                  </Box>
                  <PeopleIcon />
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Upcoming Shifts (next 14 days)</Typography>
                <Chip size="small" label={`${upcoming.length}`} />
              </Stack>
              {upcoming.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming shifts.
                </Typography>
              ) : (
                <Grid container spacing={1.5}>
                  {upcoming.slice(0, 12).map((a) => (
                    <Grid item xs={12} md={6} lg={4} key={a.id}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid rgba(148,163,184,0.18)',
                          bgcolor: 'rgba(255,255,255,0.03)',
                          height: '100%',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 750 }} noWrap>
                          {a.premise?.name || 'Premise'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          Guard: {a.guard?.name || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(a.startTime).toLocaleString()} → {new Date(a.endTime).toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

