import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Refresh as RefreshIcon, LocationOn as LocationOnIcon } from '@mui/icons-material';
import { premiseService } from '../../services/premiseService';
import { alertService } from '../../services/alertService';
import { assignmentService } from '../../services/assignmentService';
import type { Alert as AlertType } from '../../services/alertService';
import type { Premise } from '../../services/premiseService';
import type { Assignment } from '../../services/assignmentService';

export default function AnalystDashboardPage() {
  const navigate = useNavigate();
  const [assignedPremises, setAssignedPremises] = useState<Premise[]>([]);
  const [openAlerts, setOpenAlerts] = useState<AlertType[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      // Get only assigned premises (backend filters automatically for analysts)
      const [premises, alerts, upcoming] = await Promise.all([
        premiseService.getAll(),
        alertService.getAlerts({ status: 'OPEN' }),
        assignmentService.getUpcoming({ days: 14, limit: 20 }).catch(() => []),
      ]);
      setAssignedPremises(premises);
      setOpenAlerts(alerts);
      setUpcomingAssignments(upcoming);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      setResolving(alertId);
      await alertService.resolveAlert(alertId);
      await loadData(); // Refetch alerts
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to resolve alert');
    } finally {
      setResolving(null);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Analyst Dashboard</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Assigned Premises
              </Typography>
              <Typography variant="h4">{assignedPremises.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Open Alerts
              </Typography>
              <Typography variant="h4">{openAlerts.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Upcoming Guard Shifts (next 14 days)
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Premise</TableCell>
                <TableCell>Guard</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {upcomingAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No upcoming shifts scheduled for your premises
                  </TableCell>
                </TableRow>
              ) : (
                upcomingAssignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.premise?.name || '-'}</TableCell>
                    <TableCell>{a.guard?.name || '-'}</TableCell>
                    <TableCell>{new Date(a.startTime).toLocaleString()}</TableCell>
                    <TableCell>{new Date(a.endTime).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Assigned Premises List */}
      {assignedPremises.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              My Assigned Premises
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Premise Name</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Checkpoints</TableCell>
                  <TableCell>Active Guards</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignedPremises.map((premise) => (
                  <TableRow key={premise.id}>
                    <TableCell>{premise.name}</TableCell>
                    <TableCell>{premise.address || '-'}</TableCell>
                    <TableCell>
                      {(premise as any)._count?.checkpoints || 0}
                    </TableCell>
                    <TableCell>
                      {(premise as any)._count?.assignments || 0}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<LocationOnIcon />}
                        onClick={() => navigate(`/analyst/premises/${premise.id}`)}
                      >
                        View Status
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {assignedPremises.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You are not assigned to any premises. Please contact your administrator.
        </Alert>
      )}

      <Paper>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Open Alerts
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Guard</TableCell>
                <TableCell>Checkpoint</TableCell>
                <TableCell>Premise</TableCell>
                <TableCell>Triggered At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {openAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No open alerts
                  </TableCell>
                </TableRow>
              ) : (
                openAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Chip
                        label={alert.type}
                        color={alert.type === 'RED' ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{alert.guard.name}</TableCell>
                    <TableCell>{alert.checkpoint.name}</TableCell>
                    <TableCell>{alert.assignment.premise.name}</TableCell>
                    <TableCell>
                      {new Date(alert.triggeredAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.status}
                        color={alert.status === 'OPEN' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolving === alert.id}
                      >
                        {resolving === alert.id ? 'Resolving...' : 'Resolve'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
