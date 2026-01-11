import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button, ButtonBase } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function GuardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const switchToV2 = () => {
    localStorage.setItem('uiVersion', 'v2');
    navigate('/v2');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={2} sx={{ bgcolor: 'success.dark' }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <ButtonBase
            onClick={() => navigate('/')}
            sx={{
              flexGrow: 1,
              justifyContent: 'flex-start',
              borderRadius: 1,
              py: 0.5,
              px: 0.75,
              ml: -0.75,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              Guard Track
            </Typography>
          </ButtonBase>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.9, display: { xs: 'none', sm: 'block' } }}>
            {user?.name}
          </Typography>
          <Button color="inherit" onClick={switchToV2} sx={{ textTransform: 'none', fontWeight: 600, mr: 1, opacity: 0.9 }}>
            UI v2
          </Button>
          <Button color="inherit" onClick={handleLogout} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, maxWidth: '1400px', width: '100%', mx: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
