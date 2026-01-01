import { useState, useEffect } from 'react';
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
  TextField,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { guardService } from '../../services/guardService';
import type { CheckIn } from '../../services/guardService';

export default function GuardHistoryPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadHistory();
  }, [selectedDate]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await guardService.getMyHistory(selectedDate);
      setCheckIns(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load history');
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Check-in History
      </Typography>

      <Box sx={{ mb: 3, mt: 3 }}>
        <TextField
          label="Select Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Checkpoint</TableCell>
                <TableCell>On Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checkIns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No check-ins found for this date
                  </TableCell>
                </TableRow>
              ) : (
                checkIns.map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell>
                      {new Date(checkIn.scannedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {checkIn.checkpoint?.name || 'Unknown Checkpoint'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={checkIn.isOnTime ? 'Yes' : 'No'}
                        color={checkIn.isOnTime ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
