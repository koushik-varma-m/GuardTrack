import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import AnalystLayout from './layouts/AnalystLayout';
import GuardLayout from './layouts/GuardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Admin Pages
import AdminPremisesPage from './pages/admin/AdminPremisesPage';
import AdminPremiseEditPage from './pages/admin/AdminPremiseEditPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAssignmentsPage from './pages/admin/AdminAssignmentsPage';
import AdminAnalystAssignmentsPage from './pages/admin/AdminAnalystAssignmentsPage';
import AdminQRCodesPage from './pages/admin/AdminQRCodesPage';

// Analyst Pages
import AnalystDashboardPage from './pages/analyst/AnalystDashboardPage';
import AnalystPremiseStatusPage from './pages/analyst/AnalystPremiseStatusPage';

// Guard Pages
import GuardDashboardPage from './pages/guard/GuardDashboardPage';
import GuardCheckpointsPage from './pages/guard/GuardCheckpointsPage';
import GuardScanPage from './pages/guard/GuardScanPage';
import GuardHistoryPage from './pages/guard/GuardHistoryPage';
import GuardNfcCheckInPage from './pages/guard/GuardNfcCheckInPage';

// Kiosk Pages (public)
import KioskCheckpointQrPage from './pages/kiosk/KioskCheckpointQrPage';
import HomeRedirect from './pages/HomeRedirect';
import AccessDeniedPage from './pages/errors/AccessDeniedPage';
import NotFoundPage from './pages/errors/NotFoundPage';

function App() {
  const signupEnabled = import.meta.env.VITE_ENABLE_SIGNUP === 'true';

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={signupEnabled ? <SignupPage /> : <Navigate to="/login" replace />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="premises" element={<AdminPremisesPage />} />
            <Route path="premises/:id" element={<AdminPremiseEditPage />} />
            <Route path="premises/:premiseId/qr-codes" element={<AdminQRCodesPage />} />
            <Route path="assignments" element={<AdminAssignmentsPage />} />
            <Route path="analyst-assignments" element={<AdminAnalystAssignmentsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route index element={<Navigate to="/admin/premises" replace />} />
          </Route>

          {/* Analyst Routes - Allow ANALYST and ADMIN */}
          <Route
            path="/analyst"
            element={
              <ProtectedRoute roles={['ANALYST', 'ADMIN']}>
                <AnalystLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AnalystDashboardPage />} />
            <Route path="premises/:id" element={<AnalystPremiseStatusPage />} />
            <Route index element={<Navigate to="/analyst/dashboard" replace />} />
          </Route>

          {/* Guard Routes */}
          <Route
            path="/guard"
            element={
              <ProtectedRoute roles={['GUARD']}>
                <GuardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<GuardDashboardPage />} />
            <Route path="checkpoints" element={<GuardCheckpointsPage />} />
            <Route path="scan" element={<GuardScanPage />} />
            <Route path="history" element={<GuardHistoryPage />} />
            <Route path="nfc-checkin" element={<GuardNfcCheckInPage />} />
            <Route index element={<Navigate to="/guard/dashboard" replace />} />
          </Route>

          {/* Kiosk route (no auth, usually loaded on dedicated devices) */}
          <Route path="/kiosk/checkpoints/:id" element={<KioskCheckpointQrPage />} />

          {/* Access denied */}
          <Route path="/forbidden" element={<AccessDeniedPage />} />

          {/* Default redirect */}
          <Route path="/" element={<HomeRedirect />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
