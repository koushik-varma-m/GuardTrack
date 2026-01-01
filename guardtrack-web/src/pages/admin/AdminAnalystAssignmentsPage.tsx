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
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { analystAssignmentService } from '../../services/analystAssignmentService';
import { userService } from '../../services/userService';
import { premiseService } from '../../services/premiseService';
import type { AnalystAssignment } from '../../services/analystAssignmentService';
import type { User } from '../../services/userService';
import type { Premise } from '../../services/premiseService';
import PageHeader from '../../components/PageHeader';
import { ActionButtons } from '../../components/ActionButtons';

export default function AdminAnalystAssignmentsPage() {
  const [assignments, setAssignments] = useState<AnalystAssignment[]>([]);
  const [analysts, setAnalysts] = useState<User[]>([]);
  const [premises, setPremises] = useState<Premise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    analystId: '',
    premiseId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, usersData, premisesData] = await Promise.all([
        analystAssignmentService.getAll(),
        userService.getAll(),
        premiseService.getAll(),
      ]);
      setAssignments(assignmentsData);
      setAnalysts(usersData.filter((u) => u.role === 'ANALYST'));
      setPremises(premisesData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ analystId: '', premiseId: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ analystId: '', premiseId: '' });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await analystAssignmentService.create(formData);
      handleCloseDialog();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this analyst assignment?')) {
      return;
    }
    try {
      await analystAssignmentService.delete(id);
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
        title="Analyst Premise Assignments"
        subtitle="Assign analysts to specific premises to control data access and visibility"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            size="large"
          >
            Assign Analyst to Premise
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
                <TableCell>Analyst</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Premise</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Assigned Date</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        No analyst assignments found
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleOpenDialog}
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
                        {assignment.analyst.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{assignment.analyst.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{assignment.premise.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {assignment.premise.address || 'No address'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(assignment.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <ActionButtons
                        actions={[
                          {
                            icon: <DeleteIcon />,
                            label: 'Remove Assignment',
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
        <DialogTitle sx={{ pb: 1 }}>Assign Analyst to Premise</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Analyst</InputLabel>
              <Select
                value={formData.analystId}
                onChange={(e) => setFormData({ ...formData, analystId: e.target.value })}
                label="Analyst"
                required
              >
                {analysts.map((analyst) => (
                  <MenuItem key={analyst.id} value={analyst.id}>
                    {analyst.name} ({analyst.email})
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.analystId || !formData.premiseId || submitting}
          >
            {submitting ? 'Assigning...' : 'Create Assignment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

