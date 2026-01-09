import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If no user, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If roles specified and user.role not in roles, show forbidden page instead of bouncing to login
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{ from: location.pathname, requiredRoles: roles, userRole: user.role }}
      />
    );
  }

  return <>{children}</>;
}
