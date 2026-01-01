import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getCurrentTab = () => {
    if (location.pathname.includes('/admin/premises')) return 0;
    if (location.pathname.includes('/admin/assignments')) return 1;
    if (location.pathname.includes('/admin/analyst-assignments')) return 2;
    if (location.pathname.includes('/admin/users')) return 3;
    return 0;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/admin/premises');
        break;
      case 1:
        navigate('/admin/assignments');
        break;
      case 2:
        navigate('/admin/analyst-assignments');
        break;
      case 3:
        navigate('/admin/users');
        break;
      default:
        navigate('/admin/premises');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Guard Track
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name}
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
        <Tabs 
          value={getCurrentTab()} 
          onChange={handleTabChange} 
          textColor="inherit" 
          indicatorColor="secondary"
          sx={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: 48,
            },
          }}
        >
          <Tab label="Premises" />
          <Tab label="Guard Assignments" />
          <Tab label="Analyst Assignments" />
          <Tab label="Users" />
        </Tabs>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, maxWidth: '1400px', width: '100%', mx: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
