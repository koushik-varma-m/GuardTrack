import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { QrCodeScanner as QrCodeScannerIcon } from '@mui/icons-material';
import { guardService } from '../../services/guardService';
import type { Checkpoint } from '../../services/guardService';

export default function GuardCheckpointsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCheckpoints();
  }, []);

  const loadCheckpoints = async () => {
    try {
      setLoading(true);
      const data = await guardService.getMyCheckpoints();
      setCheckpoints(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load checkpoints');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Checkpoints</Typography>
        <Button
          variant="contained"
          startIcon={<QrCodeScannerIcon />}
          onClick={() => navigate('/guard/scan')}
        >
          Scan QR
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {checkpoints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No checkpoints available
                </TableCell>
              </TableRow>
            ) : (
              checkpoints.map((checkpoint) => (
                <TableRow key={checkpoint.id}>
                  <TableCell>{checkpoint.name}</TableCell>
                  <TableCell>{checkpoint.description || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
