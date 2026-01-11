import { useEffect, useState } from 'react';
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
import { Refresh as RefreshIcon, LocationOn as LocationOnIcon } from '@mui/icons-material';
import { premiseService } from '../../services/premiseService';
import { alertService } from '../../services/alertService';
import { assignmentService } from '../../services/assignmentService';
import type { Alert as AlertType } from '../../services/alertService';
import type { Premise } from '../../services/premiseService';
import type { Assignment } from '../../services/assignmentService';
import { useNavigate } from 'react-router-dom';

export default function V2AnalystDashboardPage() {
  const navigate = useNavigate();
  const [premises, setPremises] = useState<Premise[]>([]);
  const [openAlerts, setOpenAlerts] = useState<AlertType[]>([]);
  const [upcoming, setUpcoming] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [p, a, u] = await Promise.all([
        premiseService.getAll(),
        alertService.getAlerts({ status: 'OPEN' }),
        assignmentService.getUpcoming({ days: 14, limit: 20 }).catch(() => []),
      ]);
      setPremises(p);
      setOpenAlerts(a);
      setUpcoming(u);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resolve = async (id: string) => {
    try {
      setResolving(id);
      await alertService.resolveAlert(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to resolve alert');
    } finally {
      setResolving(null);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={3}>
        <Box>
          <Typography variant="h4">Analyst Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Zentech • alerts, assigned premises, and upcoming shifts
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
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Open Alerts</Typography>
                <Chip size="small" color={openAlerts.length ? 'warning' : 'success'} label={`${openAlerts.length}`} />
              </Stack>

              {openAlerts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No open alerts.
                </Typography>
              ) : (
                <Stack gap={1.25}>
                  {openAlerts.slice(0, 8).map((a) => (
                    <Box
                      key={a.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(148,163,184,0.18)',
                        bgcolor: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" gap={1} alignItems="center">
                            <Chip size="small" color={a.type === 'RED' ? 'error' : 'warning'} label={a.type} />
                            <Typography variant="body2" sx={{ fontWeight: 750 }} noWrap>
                              {a.assignment.premise.name} • {a.checkpoint.name}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Guard: {a.guard.name} • {new Date(a.triggeredAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => resolve(a.id)}
                          disabled={resolving === a.id}
                        >
                          {resolving === a.id ? 'Resolving…' : 'Resolve'}
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                  {openAlerts.length > 8 && (
                    <Typography variant="caption" color="text.secondary">
                      Showing 8 of {openAlerts.length} alerts
                    </Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned Premises
              </Typography>
              {premises.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  You are not assigned to any premises.
                </Typography>
              ) : (
                <Stack gap={1.25}>
                  {premises.map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(148,163,184,0.18)',
                        bgcolor: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 750 }} noWrap>
                            {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {p.address || '—'}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LocationOnIcon />}
                          onClick={() => navigate(`/v2/analyst/premises/${p.id}`)}
                        >
                          Status
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Upcoming Shifts (next 14 days)</Typography>
                <Chip size="small" label={`${upcoming.length}`} />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {upcoming.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming shifts scheduled for your premises.
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
