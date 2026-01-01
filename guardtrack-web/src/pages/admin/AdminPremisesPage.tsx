import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
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
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { premiseService } from '../../services/premiseService';
import type { Premise } from '../../services/premiseService';
import PageHeader from '../../components/PageHeader';
import { ActionButtons } from '../../components/ActionButtons';

export default function AdminPremisesPage() {
  const [premises, setPremises] = useState<Premise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPremises();
  }, []);

  const loadPremises = async () => {
    try {
      setLoading(true);
      const data = await premiseService.getAll();
      setPremises(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load premises');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ name: '', address: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ name: '', address: '' });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await premiseService.create({
        name: formData.name,
        address: formData.address || undefined,
      });
      handleCloseDialog();
      loadPremises();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create premise');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this premise?')) {
      return;
    }
    try {
      await premiseService.delete(id);
      loadPremises();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete premise');
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/premises/${id}`);
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
        title="Premises Management"
        subtitle="Manage and configure premises for guard assignments"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            size="large"
          >
            Add Premise
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
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {premises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        No premises found
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleOpenDialog}
                        sx={{ mt: 2 }}
                      >
                        Create First Premise
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                premises.map((premise) => (
                  <TableRow key={premise.id} hover>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {premise.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {premise.address || 'No address provided'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <ActionButtons
                        actions={[
                          {
                            icon: <EditIcon />,
                            label: 'Edit',
                            onClick: () => handleEdit(premise.id),
                            color: 'primary',
                          },
                          {
                            icon: <DeleteIcon />,
                            label: 'Delete',
                            onClick: () => handleDelete(premise.id),
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
        <DialogTitle sx={{ pb: 1 }}>Add New Premise</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              margin="normal"
              label="Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              margin="normal"
              label="Address"
              fullWidth
              variant="outlined"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              multiline
              rows={3}
              placeholder="Enter the full address of the premise"
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
            disabled={!formData.name || submitting}
          >
            {submitting ? 'Creating...' : 'Create Premise'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
