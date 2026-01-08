import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Download as DownloadIcon, QrCode as QrCodeIcon } from '@mui/icons-material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHeader from '../../components/PageHeader';
import api from '../../services/api';

interface QRCodeData {
  checkpointId: string;
  checkpointName: string;
  qrCodeImage: string;
  qrCodePayload: {
    checkpointId: string;
    premiseId: string;
    token: string;
    exp: string;
  };
  qrCodeUrl: string;
}

export default function AdminQRCodesPage() {
  const { premiseId } = useParams<{ premiseId: string }>();
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (premiseId) {
      loadQRCodes();
    }
  }, [premiseId]);

  const loadQRCodes = async () => {
    if (!premiseId) return;
    try {
      setLoading(true);
      const response = await api.get(`/checkpoints/premise/${premiseId}/qr-codes`);
      setQrCodes(response.data.checkpoints || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = (qrCode: QRCodeData) => {
    const link = document.createElement('a');
    link.href = qrCode.qrCodeImage;
    link.download = `checkpoint-${qrCode.checkpointName}-${qrCode.checkpointId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewQR = (qrCode: QRCodeData) => {
    setSelectedQR(qrCode);
  };

  const getNfcUrl = (checkpointId: string) =>
    `${origin}/guard/nfc-checkin?checkpointId=${checkpointId}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard failures
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
        title="Checkpoint QR Codes"
        subtitle="Scan these QR codes with the guard app to test check-ins"
        action={
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            onClick={loadQRCodes}
          >
            Refresh QR Codes
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {qrCodes.length === 0 ? (
        <Alert severity="info">
          No checkpoints found for this premise. Create checkpoints first.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {qrCodes.map((qrCode) => (
            <Grid item xs={12} sm={6} md={4} key={qrCode.checkpointId}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {qrCode.checkpointName}
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                      bgcolor: 'grey.50',
                      p: 2,
                      borderRadius: 2,
                      mb: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'grey.100',
                      },
                    }}
                    onClick={() => handleViewQR(qrCode)}
                  >
                    <img
                      src={qrCode.qrCodeImage}
                      alt={`QR Code for ${qrCode.checkpointName}`}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadQR(qrCode)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      onClick={() => handleViewQR(qrCode)}
                    >
                      View Details
                    </Button>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Expires: {new Date(qrCode.qrCodePayload.exp).toLocaleString()}
                  </Typography>
                  <TextField
                    label="NFC/URL check-in"
                    value={getNfcUrl(qrCode.checkpointId)}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <Tooltip title="Copy URL">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(getNfcUrl(qrCode.checkpointId))}
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      ),
                    }}
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={!!selectedQR}
        onClose={() => setSelectedQR(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>QR Code Details: {selectedQR?.checkpointName}</DialogTitle>
        <DialogContent>
          {selectedQR && (
            <Box>
              <Box display="flex" justifyContent="center" mb={3}>
                <img
                  src={selectedQR.qrCodeImage}
                  alt={`QR Code for ${selectedQR.checkpointName}`}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </Box>
              <Typography variant="subtitle2" gutterBottom>
                Payload (JSON):
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  mb: 2,
                }}
              >
                <pre>{JSON.stringify(selectedQR.qrCodePayload, null, 2)}</pre>
              </Paper>
              <Typography variant="body2" color="text.secondary">
                <strong>Checkpoint ID:</strong> {selectedQR.checkpointId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Premise ID:</strong> {selectedQR.qrCodePayload.premiseId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Expires:</strong> {new Date(selectedQR.qrCodePayload.exp).toLocaleString()}
              </Typography>
              <TextField
                label="NFC/URL check-in"
                value={selectedQR ? getNfcUrl(selectedQR.checkpointId) : ''}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Tooltip title="Copy URL">
                      <IconButton
                        size="small"
                        onClick={() =>
                          selectedQR && copyToClipboard(getNfcUrl(selectedQR.checkpointId))
                        }
                      >
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
                fullWidth
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => selectedQR && handleDownloadQR(selectedQR)}>
            Download QR Code
          </Button>
          <Button onClick={() => setSelectedQR(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
