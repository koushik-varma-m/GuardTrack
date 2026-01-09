import { Box, Button, Container, Paper, Typography } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 6,
        background: `linear-gradient(135deg, rgba(2, 136, 209, 0.10), rgba(0, 0, 0, 0.04))`,
      }}
    >
      <Container maxWidth="sm">
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'info.main',
              color: 'info.contrastText',
            }}
          >
            <SearchOffIcon fontSize="small" />
          </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Page not found
        </Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          The page you’re looking for doesn’t exist.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/', { replace: true })}>
          Go home
        </Button>
      </Paper>
      </Container>
    </Box>
  );
}
