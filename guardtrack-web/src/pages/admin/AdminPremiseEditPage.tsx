import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Grid,
  Chip,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import { Download as DownloadIcon, Delete as DeleteIcon, AddLocation as AddLocationIcon, Edit as EditIcon, Refresh as RefreshIcon, QrCode as QrCodeIcon } from '@mui/icons-material';
import { premiseService } from '../../services/premiseService';
import type { Premise, Checkpoint } from '../../services/premiseService';
import { dashboardService } from '../../services/dashboardService';
import type { PremiseStatusItem } from '../../services/dashboardService';

export default function AdminPremiseEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [premise, setPremise] = useState<Premise | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [statusItems, setStatusItems] = useState<PremiseStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [checkpointDialog, setCheckpointDialog] = useState(false);
  const [checkpointData, setCheckpointData] = useState({ name: '', description: '', intervalMinutes: '', sequence: '' });
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [creatingCheckpoint, setCreatingCheckpoint] = useState(false);
  const [checkpointModeEnabled, setCheckpointModeEnabled] = useState(true);
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (id) {
      loadPremise();
    }
  }, [id]);

  useEffect(() => {
    if (id && autoRefresh) {
      // Auto-refresh status every 10 seconds for more responsive updates
      const interval = setInterval(() => {
        loadStatus();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [id, autoRefresh]);

  const loadPremise = async () => {
    try {
      setLoading(true);
      const data = await premiseService.getById(id!);
      setPremise(data);
      setCheckpoints(data.checkpoints || []);
      // Load status after premise data is loaded
      await loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load premise');
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    if (!id) return;
    try {
      setRefreshing(true);
      const statusData = await dashboardService.getPremiseStatus(id);
      setStatusItems(statusData);
    } catch (err: any) {
      // Don't show error for status, just log it
      console.error('Failed to load status:', err);
      setStatusItems([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Get the most critical status for a checkpoint (RED > ORANGE > GREEN)
  const getCheckpointStatus = (checkpointId: string): PremiseStatusItem | null => {
    const checkpointStatuses = statusItems.filter((item) => item.checkpointId === checkpointId);
    if (checkpointStatuses.length === 0) return null;
    
    // Return the worst status (RED > ORANGE > GREEN)
    const sorted = checkpointStatuses.sort((a, b) => {
      const order = { RED: 3, ORANGE: 2, GREEN: 1 };
      return order[b.status] - order[a.status];
    });
    return sorted[0];
  };

  const getStatusColor = (status: 'GREEN' | 'ORANGE' | 'RED') => {
    switch (status) {
      case 'GREEN':
        return '#4caf50';
      case 'ORANGE':
        return '#ff9800';
      case 'RED':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    try {
      setUploading(true);
      await premiseService.uploadPremiseMap(id, file);
      await loadPremise(); // Reload to get updated mapImageUrl
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to upload map');
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !id || !checkpointModeEnabled) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // If editing, update position; otherwise create new
    if (editingCheckpointId) {
      setClickPosition({ x, y });
      // Keep existing name/description when repositioning
    } else {
    setClickPosition({ x, y });
    const nextSequence = checkpoints.length > 0 ? Math.max(...checkpoints.map((c) => c.sequence || 0)) + 1 : 1;
    setCheckpointData({ name: '', description: '', intervalMinutes: '', sequence: nextSequence.toString() });
    setEditingCheckpointId(null);
    }
    setCheckpointDialog(true);
  };

  const handleCreateCheckpoint = async () => {
    if (!id || !clickPosition) return;

    try {
      setCreatingCheckpoint(true);
      const intervalMinutes = checkpointData.intervalMinutes.trim()
        ? parseInt(checkpointData.intervalMinutes, 10)
        : null;
      const sequence = checkpointData.sequence.trim()
        ? parseInt(checkpointData.sequence, 10)
        : undefined;

      if (editingCheckpointId) {
        // Update existing checkpoint position
        await premiseService.updateCheckpoint(editingCheckpointId, {
          name: checkpointData.name,
          description: checkpointData.description || undefined,
          xCoord: clickPosition.x,
          yCoord: clickPosition.y,
          sequence,
          intervalMinutes: intervalMinutes,
        });
      } else {
        // Create new checkpoint
        await premiseService.createCheckpoint(id, {
          name: checkpointData.name,
          description: checkpointData.description || undefined,
          xCoord: clickPosition.x,
          yCoord: clickPosition.y,
          sequence,
          intervalMinutes: intervalMinutes,
        });
      }
      setCheckpointDialog(false);
      setClickPosition(null);
      setEditingCheckpointId(null);
      await loadPremise();
      await loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save checkpoint');
    } finally {
      setCreatingCheckpoint(false);
    }
  };

  const handleCheckpointMarkerClick = (checkpoint: Checkpoint, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering map click
    if (!checkpointModeEnabled) return;
    
    setEditingCheckpointId(checkpoint.id);
    setCheckpointData({ 
      name: checkpoint.name, 
      description: checkpoint.description || '',
      sequence: checkpoint.sequence?.toString() || '',
      intervalMinutes: checkpoint.intervalMinutes?.toString() || '',
    });
    setClickPosition({ x: checkpoint.xCoord, y: checkpoint.yCoord });
    setCheckpointDialog(true);
  };

  const handleDeleteCheckpoint = async (checkpointId: string) => {
    if (!window.confirm('Are you sure you want to delete this checkpoint?')) {
      return;
    }
    try {
      await premiseService.deleteCheckpoint(checkpointId);
      await loadPremise();
      await loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete checkpoint');
    }
  };

  const handleDownloadQr = async (checkpointId: string) => {
    try {
      const url = await premiseService.getCheckpointQr(checkpointId);
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to download QR code');
    }
  };

  if (loading) {
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
        <Button onClick={() => navigate('/admin/premises')} sx={{ mt: 2 }}>
          Back to Premises
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Edit Premise: {premise.name}</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            onClick={() => navigate(`/admin/premises/${id}/qr-codes`)}
          >
            View QR Codes
          </Button>
          <Button onClick={() => navigate('/admin/premises')}>Back to Premises</Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Status Summary */}
      <Card 
        sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Premise Status Overview
                </Typography>
                {refreshing && (
                  <CircularProgress size={16} sx={{ color: 'inherit' }} />
                )}
              </Box>
              <Box display="flex" gap={3} flexWrap="wrap">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Checkpoints
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {checkpoints.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Active Assignments
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {statusItems.length > 0 ? new Set(statusItems.map((s) => s.guardId)).size : 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    GREEN
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                    {statusItems.filter((s) => s.status === 'GREEN').length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    ORANGE
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                    {statusItems.filter((s) => s.status === 'ORANGE').length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    RED
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                    {statusItems.filter((s) => s.status === 'RED').length}
                  </Typography>
                </Box>
              </Box>
              {statusItems.length === 0 && (
                <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
                  No active assignments found. Status will appear when guards are assigned and scanning checkpoints.
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Premise Map</Typography>
              <Box display="flex" gap={1}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="map-upload"
                  type="file"
                  onChange={handleMapUpload}
                  disabled={uploading}
                />
                <label htmlFor="map-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    disabled={uploading}
                    size="small"
                  >
                    {uploading ? 'Uploading...' : 'Upload Map'}
                  </Button>
                </label>
                {premise.mapImageUrl && (
                  <Button
                    variant={checkpointModeEnabled ? 'contained' : 'outlined'}
                    startIcon={<AddLocationIcon />}
                    onClick={() => setCheckpointModeEnabled(!checkpointModeEnabled)}
                    size="small"
                    color={checkpointModeEnabled ? 'primary' : 'inherit'}
                  >
                    {checkpointModeEnabled ? 'Adding Checkpoints' : 'Add Checkpoints'}
                  </Button>
                )}
              </Box>
            </Box>
            {premise.mapImageUrl && (
              <>
                {checkpointModeEnabled && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Click anywhere on the map</strong> to add a checkpoint at that location.
                  </Alert>
                )}
                <Box
                  sx={{
                    position: 'relative',
                    border: checkpointModeEnabled ? '2px solid #1976d2' : '2px solid #ccc',
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: checkpointModeEnabled ? 'crosshair' : 'default',
                    transition: 'border-color 0.2s',
                    '&:hover': checkpointModeEnabled
                      ? {
                          borderColor: '#1565c0',
                          boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
                        }
                      : {},
                  }}
                >
                  <img
                    ref={imageRef}
                    src={premise.mapImageUrl}
                    alt="Premise Map"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onClick={handleImageClick}
                  />
                {/* Overlay checkpoints */}
                {checkpoints.map((checkpoint) => {
                  const statusItem = getCheckpointStatus(checkpoint.id);
                  const status = statusItem?.status || null;
                  const statusColor = status ? getStatusColor(status) : '#9e9e9e';
                  const isEditing = editingCheckpointId === checkpoint.id;
                  // Use status and checkpoint ID as key to force re-render when status changes
                  const markerKey = `${checkpoint.id}-${status || 'none'}-${statusItem?.lastScan || 'none'}`;
                  
                  const tooltipContent = statusItem ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {checkpoint.name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong> <span style={{ color: statusColor }}>{status}</span>
                      </Typography>
                      <Typography variant="body2">
                        <strong>Guard:</strong> {statusItem.guardName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Last Scan:</strong>{' '}
                        {new Date(statusItem.lastScan).toLocaleString()}
                      </Typography>
                          <Typography variant="body2">
                            <strong>Next Due:</strong>{' '}
                            {new Date(statusItem.nextDueTime).toLocaleString()}
                          </Typography>
                          {checkpoint.intervalMinutes && (
                            <Typography variant="body2">
                              <strong>Travel interval:</strong> {checkpoint.intervalMinutes} min
                            </Typography>
                          )}
                    </Box>
                  ) : (
                    <Typography variant="body2">{checkpoint.name} - No active assignment</Typography>
                  );

          return (
            <Tooltip key={markerKey} title={tooltipContent} arrow placement="top">
              <Box
                onClick={(e) => handleCheckpointMarkerClick(checkpoint, e)}
                sx={{
                          position: 'absolute',
                          left: `${checkpoint.xCoord}%`,
                          top: `${checkpoint.yCoord}%`,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: checkpointModeEnabled ? 'pointer' : 'default',
                          zIndex: 10,
                        }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: isEditing ? 'error.main' : statusColor,
                            border: '3px solid white',
                            boxShadow: `0 2px 8px ${statusColor}40, 0 0 0 2px ${statusColor}20`,
                            transition: 'all 0.2s',
                            position: 'relative',
                            '&:hover': checkpointModeEnabled
                              ? {
                                  transform: 'scale(1.4)',
                                  boxShadow: `0 4px 12px ${statusColor}60, 0 0 0 3px ${statusColor}30`,
                                }
                              : {},
                          }}
                        >
                          {status && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                opacity: 0.9,
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 0.5,
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            border: `1px solid ${statusColor}`,
                            pointerEvents: 'none',
                            color: status === 'RED' ? '#d32f2f' : 'inherit',
                          }}
                        >
                          {checkpoint.sequence ? `${checkpoint.sequence}. ${checkpoint.name}` : checkpoint.name}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
                </Box>
              </>
            )}
            {!premise.mapImageUrl && (
              <Alert severity="info">
                Upload a map image to start adding checkpoints. Supported formats: JPG, PNG, GIF, etc.
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">
                  Checkpoints ({checkpoints.length})
                </Typography>
                {refreshing && (
                  <CircularProgress size={16} />
                )}
              </Box>
              <Box display="flex" gap={1}>
                <Tooltip title={autoRefresh ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled'}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setAutoRefresh(!autoRefresh);
                      if (!autoRefresh) loadStatus();
                    }}
                    color={autoRefresh ? 'primary' : 'default'}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Refresh status now">
                  <IconButton
                    size="small"
                    onClick={loadStatus}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <CircularProgress size={16} />
                    ) : (
                      <RefreshIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Status Legend */}
            <Card sx={{ mb: 2, bgcolor: 'grey.50' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                  Status Legend:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    label="GREEN"
                    size="small"
                    sx={{ bgcolor: '#4caf50', color: 'white', fontSize: '0.65rem' }}
                  />
                  <Chip
                    label="ORANGE"
                    size="small"
                    sx={{ bgcolor: '#ff9800', color: 'white', fontSize: '0.65rem' }}
                  />
                  <Chip
                    label="RED"
                    size="small"
                    sx={{ bgcolor: '#f44336', color: 'white', fontSize: '0.65rem' }}
                  />
                </Box>
              </CardContent>
            </Card>

            <List>
              {checkpoints.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No checkpoints yet. Click on the map to add one." />
                </ListItem>
              ) : (
                checkpoints.map((checkpoint) => {
                  const statusItem = getCheckpointStatus(checkpoint.id);
                  const status = statusItem?.status || null;

                  return (
                    <ListItem
                      key={checkpoint.id}
                      sx={{
                        borderLeft: status
                          ? `4px solid ${getStatusColor(status)}`
                          : '4px solid #9e9e9e',
                        mb: 1,
                        bgcolor: status === 'RED' ? 'error.light' : status === 'ORANGE' ? 'warning.light' : 'transparent',
                        borderRadius: 1,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {checkpoint.sequence ? `${checkpoint.sequence}. ${checkpoint.name}` : checkpoint.name}
                            </Typography>
                            {status && (
                              <Chip
                                label={status}
                                size="small"
                                sx={{
                                  bgcolor: getStatusColor(status),
                                  color: 'white',
                                  fontSize: '0.65rem',
                                  height: 20,
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                          <Typography variant="caption" color="text.secondary">
                            {checkpoint.description || 'No description'}
                          </Typography>
                          <Box display="flex" gap={1} mt={0.5}>
                            <Chip
                              label={`Order: ${checkpoint.sequence || '-'}`}
                              size="small"
                              sx={{ fontSize: '0.65rem' }}
                            />
                            {checkpoint.intervalMinutes && (
                              <Chip
                                label={`Travel: ${checkpoint.intervalMinutes}m`}
                                size="small"
                                sx={{ fontSize: '0.65rem' }}
                              />
                            )}
                          </Box>
                          {statusItem && (
                            <Box mt={0.5}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                <strong>Guard:</strong> {statusItem.guardName}
                              </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  <strong>Last Scan:</strong>{' '}
                                  {new Date(statusItem.lastScan).toLocaleString()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  <strong>Next Due:</strong>{' '}
                                  {new Date(statusItem.nextDueTime).toLocaleString()}
                                </Typography>
                                {checkpoint.intervalMinutes && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    <strong>Travel interval:</strong> {checkpoint.intervalMinutes} min
                                  </Typography>
                                )}
                              </Box>
                            )}
                            {!statusItem && (
                              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                No active assignment
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => {
                          setEditingCheckpointId(checkpoint.id);
                          setCheckpointData({
                            name: checkpoint.name,
                            description: checkpoint.description || '',
                            intervalMinutes: checkpoint.intervalMinutes?.toString() || '',
                            sequence: checkpoint.sequence?.toString() || '',
                          });
                          setClickPosition({ x: checkpoint.xCoord, y: checkpoint.yCoord });
                          setCheckpointDialog(true);
                          }}
                          size="small"
                          color="primary"
                          title="Edit checkpoint"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDownloadQr(checkpoint.id)}
                          size="small"
                          color="primary"
                          title="Download QR code"
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                          size="small"
                          color="error"
                          title="Delete checkpoint"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={checkpointDialog}
        onClose={() => {
          setCheckpointDialog(false);
          setClickPosition(null);
          setEditingCheckpointId(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCheckpointId ? 'Edit Checkpoint' : 'Create Checkpoint'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {editingCheckpointId
              ? `Update checkpoint position: (${clickPosition?.x.toFixed(1)}%, ${clickPosition?.y.toFixed(1)}%)`
              : `Position: (${clickPosition?.x.toFixed(1)}%, ${clickPosition?.y.toFixed(1)}%)`}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={checkpointData.name}
            onChange={(e) =>
              setCheckpointData({ ...checkpointData, name: e.target.value })
            }
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={checkpointData.description}
            onChange={(e) =>
              setCheckpointData({ ...checkpointData, description: e.target.value })
            }
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Interval after previous checkpoint (minutes)"
            fullWidth
            variant="outlined"
            type="number"
            value={checkpointData.intervalMinutes}
            onChange={(e) =>
              setCheckpointData({ ...checkpointData, intervalMinutes: e.target.value })
            }
            helperText="Time allowed to travel from the previous checkpoint. Leave empty to use the assignment's default interval."
            inputProps={{ min: 1, step: 1 }}
            placeholder="e.g., 15, 30, 60"
          />
          <TextField
            margin="dense"
            label="Check-in Order (sequence)"
            fullWidth
            variant="outlined"
            type="number"
            value={checkpointData.sequence}
            onChange={(e) =>
              setCheckpointData({ ...checkpointData, sequence: e.target.value })
            }
            helperText="Guards must scan checkpoints in this order. Defaults to next available."
            inputProps={{ min: 1, step: 1 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCheckpointDialog(false);
              setClickPosition(null);
              setEditingCheckpointId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateCheckpoint}
            variant="contained"
            disabled={
              !checkpointData.name ||
              creatingCheckpoint ||
              (checkpointData.sequence.trim() !== '' &&
                (isNaN(parseInt(checkpointData.sequence, 10)) ||
                  parseInt(checkpointData.sequence, 10) < 1)) ||
              (checkpointData.intervalMinutes.trim() !== '' &&
                (isNaN(parseInt(checkpointData.intervalMinutes, 10)) ||
                  parseInt(checkpointData.intervalMinutes, 10) < 1))
            }
          >
            {creatingCheckpoint
              ? editingCheckpointId
                ? 'Updating...'
                : 'Creating...'
              : editingCheckpointId
              ? 'Update'
              : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
