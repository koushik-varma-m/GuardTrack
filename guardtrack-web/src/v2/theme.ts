import { createTheme } from '@mui/material/styles';

export function createV2Theme(role?: string) {
  const accent =
    role === 'ADMIN'
      ? '#6D28D9'
      : role === 'ANALYST'
        ? '#2563EB'
        : role === 'GUARD'
          ? '#16A34A'
          : '#0F172A';

  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: accent },
      background: { default: '#0B1220', paper: '#0F172A' },
      text: { primary: '#E5E7EB', secondary: 'rgba(229,231,235,0.72)' },
      divider: 'rgba(148,163,184,0.18)',
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      h4: { fontWeight: 800, letterSpacing: -0.3 },
      h5: { fontWeight: 800, letterSpacing: -0.2 },
      h6: { fontWeight: 750 },
      button: { textTransform: 'none', fontWeight: 650 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(148,163,184,0.14)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderBottom: '1px solid rgba(148,163,184,0.16)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  });
}

