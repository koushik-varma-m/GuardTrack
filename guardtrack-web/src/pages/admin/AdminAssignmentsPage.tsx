import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { assignmentService } from '../../services/assignmentService';
import { premiseService } from '../../services/premiseService';
import { userService } from '../../services/userService';
import type { Assignment } from '../../services/assignmentService';
import type { Premise } from '../../services/premiseService';
import type { User } from '../../services/userService';
import PageHeader from '../../components/PageHeader';
import { ActionButtons } from '../../components/ActionButtons';

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [premises, setPremises] = useState<Premise[]>([]);
  const [guards, setGuards] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    guardId: '',
    premiseId: '',
    startTime: '',
    endTime: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, premisesData, usersData] = await Promise.all([
        assignmentService.getAll(),
        premiseService.getAll(),
        userService.getAll(),
      ]);
      setAssignments(assignmentsData);
      setPremises(premisesData);
      setGuards(usersData.filter((u) => u.role === 'GUARD'));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (assignment?: Assignment) => {
    if (assignment) {
      setEditingId(assignment.id);
      setFormData({
        guardId: assignment.guardId,
        premiseId: assignment.premiseId,
        startTime: new Date(assignment.startTime).toISOString().slice(0, 16),
        endTime: new Date(assignment.endTime).toISOString().slice(0, 16),
      });
    } else {
      setEditingId(null);
      setFormData({
        guardId: '',
        premiseId: '',
        startTime: '',
        endTime: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({
      guardId: '',
      premiseId: '',
      startTime: '',
      endTime: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      if (editingId) {
        await assignmentService.update(editingId, formData);
      } else {
        await assignmentService.create(formData);
      }
      handleCloseDialog();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    try {
      await assignmentService.delete(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete assignment');
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
      <PageHeader
        title="Guard Assignments"
      subtitle="Assign guards to premises with specific time windows"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            Add Assignment
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Guard</TableCell>
                <TableCell>Premise</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        No assignments found
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{ mt: 2 }}
                      >
                        Create First Assignment
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id} hover>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {assignment.guard?.name || assignment.guardId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {assignment.premise?.name || assignment.premiseId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(assignment.startTime).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(assignment.endTime).toLocaleString()}
                      </Typography>
                    </TableCell>
                  <TableCell align="right">
                      <ActionButtons
                        actions={[
                          {
                            icon: <EditIcon />,
                            label: 'Edit',
                            onClick: () => handleOpenDialog(assignment),
                            color: 'primary',
                          },
                          {
                            icon: <DeleteIcon />,
                            label: 'Delete',
                            onClick: () => handleDelete(assignment.id),
                            color: 'error',
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {editingId ? 'Edit Assignment' : 'Add New Assignment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Guard</InputLabel>
              <Select
                value={formData.guardId}
                onChange={(e) => setFormData({ ...formData, guardId: e.target.value })}
                label="Guard"
                required
              >
                {guards.map((guard) => (
                  <MenuItem key={guard.id} value={guard.id}>
                    {guard.name} ({guard.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Premise</InputLabel>
              <Select
                value={formData.premiseId}
                onChange={(e) => setFormData({ ...formData, premiseId: e.target.value })}
                label="Premise"
                required
              >
                {premises.map((premise) => (
                  <MenuItem key={premise.id} value={premise.id}>
                    {premise.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              label="Start Time"
              type="datetime-local"
              fullWidth
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              margin="normal"
              label="End Time"
              type="datetime-local"
              fullWidth
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !formData.guardId ||
              !formData.premiseId ||
              !formData.startTime ||
              !formData.endTime ||
              submitting
            }
          >
            {submitting ? 'Saving...' : editingId ? 'Update Assignment' : 'Create Assignment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
