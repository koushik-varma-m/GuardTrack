import { Box, Button, Container, Paper, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type LocationState = {
  userRole?: string;
};

function getDefaultRouteForRole(role?: string) {
  switch (role) {
    case 'ADMIN':
      return '/admin/premises';
    case 'ANALYST':
      return '/analyst/dashboard';
    case 'GUARD':
      return '/guard/dashboard';
    default:
      return '/login';
  }
}

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const state = (location.state ?? {}) as LocationState;
  const role = user?.role ?? state.userRole;

  const primaryTarget = getDefaultRouteForRole(role);

  const handleSwitchAccount = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 6,
        background: `linear-gradient(135deg, rgba(211, 47, 47, 0.10), rgba(25, 118, 210, 0.06))`,
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
              bgcolor: 'error.main',
              color: 'error.contrastText',
            }}
          >
            <LockOutlinedIcon fontSize="small" />
          </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Access denied
        </Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          You’re signed in, but you don’t have permission to view this page.
        </Typography>

        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button variant="contained" onClick={() => navigate(primaryTarget, { replace: true })}>
            Go to my dashboard
          </Button>
          {isAuthenticated ? (
            <Button variant="outlined" color="inherit" onClick={handleSwitchAccount}>
              Switch account
            </Button>
          ) : (
            <Button variant="outlined" color="inherit" onClick={() => navigate('/login', { replace: true })}>
              Go to login
            </Button>
          )}
        </Box>
      </Paper>
      </Container>
    </Box>
  );
}
