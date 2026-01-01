import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  Chip,
  Grid,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Analytics as AnalystIcon,
  Security as GuardIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

// Quick login credentials for testing
const QUICK_LOGINS = {
  ADMIN: { email: 'admin@test.com', password: 'password123', label: 'Admin' },
  ANALYST: { email: 'analyst@example.com', password: 'Password123', label: 'Analyst' },
  GUARD: { email: 'guard@example.com', password: 'Password123', label: 'Guard' },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      
      // Save via AuthContext.login
      login(response.user, response.token);
      
      // Redirect based on role
      if (response.user.role === 'ADMIN') {
        navigate('/admin/premises');
      } else if (response.user.role === 'ANALYST') {
        navigate('/analyst/dashboard');
      } else if (response.user.role === 'GUARD') {
        navigate('/guard/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'ANALYST' | 'GUARD') => {
    const credentials = QUICK_LOGINS[role];
    setEmail(credentials.email);
    setPassword(credentials.password);
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(credentials.email, credentials.password);
      
      // Save via AuthContext.login
      login(response.user, response.token);
      
      // Redirect based on role
      if (response.user.role === 'ADMIN') {
        navigate('/admin/premises');
      } else if (response.user.role === 'ANALYST') {
        navigate('/analyst/dashboard');
      } else if (response.user.role === 'GUARD') {
        navigate('/guard/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          Guard Track Login
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Choose a role to quick login or enter credentials manually
        </Typography>

        {/* Quick Login Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                height: '100%',
                border: email === QUICK_LOGINS.ADMIN.email ? 2 : 1,
                borderColor: email === QUICK_LOGINS.ADMIN.email ? 'primary.main' : 'divider',
              }}
            >
              <CardActionArea
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={loading}
                sx={{ p: 2, height: '100%' }}
              >
                <CardContent>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <AdminIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Admin
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Manage premises, checkpoints, and users
                    </Typography>
                    <Chip
                      label="Quick Login"
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                height: '100%',
                border: email === QUICK_LOGINS.ANALYST.email ? 2 : 1,
                borderColor: email === QUICK_LOGINS.ANALYST.email ? 'primary.main' : 'divider',
              }}
            >
              <CardActionArea
                onClick={() => handleQuickLogin('ANALYST')}
                disabled={loading}
                sx={{ p: 2, height: '100%' }}
              >
                <CardContent>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <AnalystIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Analyst
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Monitor premises status and alerts
                    </Typography>
                    <Chip
                      label="Quick Login"
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                height: '100%',
                border: email === QUICK_LOGINS.GUARD.email ? 2 : 1,
                borderColor: email === QUICK_LOGINS.GUARD.email ? 'primary.main' : 'divider',
              }}
            >
              <CardActionArea
                onClick={() => handleQuickLogin('GUARD')}
                disabled={loading}
                sx={{ p: 2, height: '100%' }}
              >
                <CardContent>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <GuardIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Guard
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Scan QR codes and check in at checkpoints
                    </Typography>
                    <Chip
                      label="Quick Login"
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>

        {/* Manual Login Form */}
        <Paper sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/signup" style={{ textDecoration: 'none' }}>
                  Sign up here
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
