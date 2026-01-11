import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  SpaceDashboard as DashboardIcon,
  QrCodeScanner as ScanIcon,
  Map as MapIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createV2Theme } from '../theme';

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
};

function getNavItems(role: string): NavItem[] {
  if (role === 'ADMIN') {
    return [
      {
        label: 'Overview',
        to: '/v2/admin',
        icon: <DashboardIcon fontSize="small" />,
        match: (p) => p === '/v2/admin',
      },
      {
        label: 'Premises',
        to: '/v2/admin/premises',
        icon: <MapIcon fontSize="small" />,
        match: (p) => p.startsWith('/v2/admin/premises'),
      },
      {
        label: 'Assignments',
        to: '/v2/admin/assignments',
        icon: <ScheduleIcon fontSize="small" />,
        match: (p) => p.startsWith('/v2/admin/assignments'),
      },
      {
        label: 'Users',
        to: '/v2/admin/users',
        icon: <PeopleIcon fontSize="small" />,
        match: (p) => p.startsWith('/v2/admin/users'),
      },
    ];
  }

  if (role === 'ANALYST') {
    return [
      {
        label: 'Dashboard',
        to: '/v2/analyst',
        icon: <DashboardIcon fontSize="small" />,
        match: (p) => p === '/v2/analyst',
      },
      {
        label: 'Premises',
        to: '/v2/analyst/dashboard',
        icon: <MapIcon fontSize="small" />,
        match: (p) => p.startsWith('/v2/analyst/premises') || p === '/v2/analyst/dashboard',
      },
    ];
  }

  return [
    {
      label: 'Dashboard',
      to: '/v2/guard',
      icon: <DashboardIcon fontSize="small" />,
      match: (p) => p === '/v2/guard',
    },
    {
      label: 'Scan',
      to: '/v2/guard/scan',
      icon: <ScanIcon fontSize="small" />,
      match: (p) => p.startsWith('/v2/guard/scan'),
    },
    {
      label: 'Checkpoints',
      to: '/v2/guard/checkpoints',
      icon: <MapIcon fontSize="small" />,
      match: (p) => p.startsWith('/v2/guard/checkpoints'),
    },
  ];
}

const drawerWidth = 280;

export default function V2AppShell() {
  const { user, logout } = useAuth();
  const role = user?.role || 'GUARD';
  const theme = useMemo(() => createV2Theme(role), [role]);
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const navItems = useMemo(() => getNavItems(role), [role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const switchToClassic = () => {
    localStorage.removeItem('uiVersion');
    navigate('/');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 10,
            bgcolor: 'primary.main',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          <SecurityIcon fontSize="small" sx={{ color: 'white' }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            Zentech
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            UI v2 • {role.toLowerCase()}
          </Typography>
        </Box>
        {!isMdUp && (
          <IconButton
            size="small"
            onClick={() => setMobileOpen(false)}
            sx={{ ml: 'auto', color: 'text.secondary' }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {navItems.map((item) => {
          const selected = item.match(location.pathname);
          return (
            <ListItemButton
              key={item.to}
              selected={selected}
              onClick={() => {
                navigate(item.to);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.10)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: selected ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={switchToClassic}
          sx={{ borderColor: 'rgba(148,163,184,0.35)', color: 'text.primary', mb: 1 }}
        >
          Classic UI
        </Button>
        <Button
          fullWidth
          color="inherit"
          variant="text"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ color: 'text.secondary' }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            bgcolor: 'background.paper',
          }}
        >
          <Toolbar sx={{ minHeight: 68 }}>
            {!isMdUp && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 1, color: 'text.secondary' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {user?.name || 'Account'}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              onClick={switchToClassic}
              sx={{ borderColor: 'rgba(148,163,184,0.35)', color: 'text.primary', display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Classic UI
            </Button>
          </Toolbar>
        </AppBar>

        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: 'background.paper' },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: 'background.paper' },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            pt: 10,
            px: { xs: 2, sm: 3 },
            pb: 4,
            maxWidth: '1400px',
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
