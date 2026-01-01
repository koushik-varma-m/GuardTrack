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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import type { SignupData } from '../../services/authService';

export default function SignupPage() {
  const [formData, setFormData] = useState<SignupData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'GUARD',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.signup(formData);
      
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
      setError(err.response?.data?.error || err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: 'GUARD' | 'ANALYST' | 'ADMIN') => {
    setFormData({ ...formData, role });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          Create Account
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Choose your role and sign up
        </Typography>

        {/* Role Selection Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                cursor: 'pointer',
                border: formData.role === 'GUARD' ? 2 : 1,
                borderColor: formData.role === 'GUARD' ? 'primary.main' : 'divider',
                bgcolor: formData.role === 'GUARD' ? 'action.selected' : 'background.paper',
              }}
              onClick={() => handleRoleSelect('GUARD')}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Guard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mobile app access for checkpoint scanning and check-ins
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                cursor: 'pointer',
                border: formData.role === 'ANALYST' ? 2 : 1,
                borderColor: formData.role === 'ANALYST' ? 'primary.main' : 'divider',
                bgcolor: formData.role === 'ANALYST' ? 'action.selected' : 'background.paper',
              }}
              onClick={() => handleRoleSelect('ANALYST')}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analyst
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dashboard access for monitoring premises and alerts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                cursor: 'pointer',
                border: formData.role === 'ADMIN' ? 2 : 1,
                borderColor: formData.role === 'ADMIN' ? 'primary.main' : 'divider',
                bgcolor: formData.role === 'ADMIN' ? 'action.selected' : 'background.paper',
              }}
              onClick={() => handleRoleSelect('ADMIN')}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Admin
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Full access to manage premises, checkpoints, and users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'GUARD' | 'ANALYST' | 'ADMIN' })}
              >
                <MenuItem value="GUARD">Guard</MenuItem>
                <MenuItem value="ANALYST">Analyst</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoComplete="name"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              autoComplete="email"
            />
            <TextField
              margin="normal"
              fullWidth
              label="Phone (Optional)"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              autoComplete="tel"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
              helperText="Minimum 6 characters"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <Box textAlign="center">
              <Typography variant="body2">
                Already have an account?{' '}
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  Login here
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

