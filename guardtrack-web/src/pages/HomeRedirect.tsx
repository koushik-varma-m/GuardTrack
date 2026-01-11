import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

function getDefaultV2RouteForRole(role?: string) {
  switch (role) {
    case 'ADMIN':
      return '/v2/admin';
    case 'ANALYST':
      return '/v2/analyst';
    case 'GUARD':
      return '/v2/guard';
    default:
      return '/login';
  }
}

export default function HomeRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const uiVersion = localStorage.getItem('uiVersion');
  if (uiVersion === 'v2') {
    return <Navigate to={getDefaultV2RouteForRole(user.role)} replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
}
