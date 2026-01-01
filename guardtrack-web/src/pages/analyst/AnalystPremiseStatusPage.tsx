import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { Refresh as RefreshIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { premiseService } from '../../services/premiseService';
import type { Premise, Checkpoint } from '../../services/premiseService';
import { dashboardService } from '../../services/dashboardService';
import type { PremiseStatusItem } from '../../services/dashboardService';

export default function AnalystPremiseStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [premise, setPremise] = useState<Premise | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [statusItems, setStatusItems] = useState<PremiseStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (id) {
      loadData();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [premiseData, statusData] = await Promise.all([
        premiseService.getById(id),
        dashboardService.getPremiseStatus(id),
      ]);
      setPremise(premiseData);
      setCheckpoints(premiseData.checkpoints || []);
      setStatusItems(statusData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
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
        return 'default';
    }
  };

  if (loading && !premise) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!premise) {
    return (
      <Box>
        <Alert severity="error">Premise not found</Alert>
        <Button onClick={() => navigate('/analyst/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  // Get worst status for each checkpoint (for map overlay)
  const getCheckpointStatus = (checkpointId: string): 'GREEN' | 'ORANGE' | 'RED' => {
    const checkpointStatuses = statusItems
      .filter((item) => item.checkpointId === checkpointId)
      .map((item) => item.status);
    
    if (checkpointStatuses.length === 0) return 'GREEN';
    if (checkpointStatuses.some((s) => s === 'RED')) return 'RED';
    if (checkpointStatuses.some((s) => s === 'ORANGE')) return 'ORANGE';
    return 'GREEN';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/analyst/dashboard')}
          >
            Back
          </Button>
          <Typography variant="h4">Premise Status: {premise.name}</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Map Overview
            </Typography>
            {premise.mapImageUrl ? (
              <Box
                sx={{
                  position: 'relative',
                  border: '2px solid #ccc',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <img
                  ref={imageRef}
                  src={premise.mapImageUrl}
                  alt="Premise Map"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                {/* Overlay status markers */}
                {checkpoints.map((checkpoint) => {
                  const status = getCheckpointStatus(checkpoint.id);
                  const statusColor = 
                    status === 'GREEN' ? '#4caf50' :
                    status === 'ORANGE' ? '#ff9800' :
                    '#f44336';
                  
                  return (
                    <Box
                      key={checkpoint.id}
                      sx={{
                        position: 'absolute',
                        left: `${checkpoint.xCoord}%`,
                        top: `${checkpoint.yCoord}%`,
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: statusColor,
                          border: '3px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                        title={`${checkpoint.name} - ${status}`}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 0.5,
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          px: 0.5,
                          borderRadius: 0.5,
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {checkpoint.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                }}
              >
                <Typography color="textSecondary">
                  No map image available for this premise
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Status Summary
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Total Checkpoints: {statusItems.length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Green: {statusItems.filter((s) => s.status === 'GREEN').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Orange: {statusItems.filter((s) => s.status === 'ORANGE').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Red: {statusItems.filter((s) => s.status === 'RED').length}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Guard Details Section */}
      {premise && (premise as any).assignments && (premise as any).assignments.length > 0 && (
        <Paper sx={{ mt: 3 }}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Assigned Guards
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Guard Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Shift Start</TableCell>
                  <TableCell>Shift End</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(premise as any).assignments.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.guard.name}</TableCell>
                    <TableCell>{assignment.guard.email}</TableCell>
                    <TableCell>{assignment.guard.phone || '-'}</TableCell>
                    <TableCell>
                      {new Date(assignment.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.endTime).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Paper sx={{ mt: 3 }}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Checkpoint Status Details
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Checkpoint</TableCell>
                <TableCell>Guard</TableCell>
                <TableCell>Last Scan</TableCell>
                <TableCell>Next Due</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statusItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No status data available
                  </TableCell>
                </TableRow>
              ) : (
                statusItems.map((item, index) => (
                  <TableRow key={`${item.checkpointId}-${item.guardId}-${index}`}>
                    <TableCell>{item.checkpointName}</TableCell>
                    <TableCell>{item.guardName}</TableCell>
                    <TableCell>
                      {new Date(item.lastScan).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(item.nextDueTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        color={getStatusColor(item.status) as any}
                        size="small"
                      />
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
