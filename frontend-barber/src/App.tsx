import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { authApi } from './services/authApi';
import { silentRefresh, getAccessToken } from './services/api';
import { setInitialized } from './store/slices/authSlice';
import AdminLayout from './pages/admin/AdminLayout';
import ProfessionalsPage from './pages/admin/ProfessionalsPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import AdminAppointmentsPage from './pages/admin/AppointmentsPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { RecoveryPage } from './pages/public/RecoveryPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import BookingPage from './pages/client/BookingPage';
import ClientLayout from './pages/client/ClientLayout';
import MyAppointmentsPage from './pages/client/MyAppointmentsPage';
import { getTokenKind, isTokenValid } from './utils/token';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const loginToken = useAppSelector((state) => state.auth.loginToken);

  useEffect(() => {
    const init = async () => {
      const token = getAccessToken();
      if (isTokenValid(token)) {
        dispatch(authApi.endpoints.getProfile.initiate());
        dispatch(setInitialized());
        return;
      }

      const refreshed = await silentRefresh();
      if (refreshed) {
        dispatch(authApi.endpoints.getProfile.initiate());
      }
      dispatch(setInitialized());
    };

    init();
  }, [dispatch]);

  useEffect(() => {
    if (loginToken) {
      dispatch(authApi.endpoints.getProfile.initiate(undefined, { forceRefetch: true }));
    }
  }, [loginToken, dispatch]);

  return <>{children}</>;
}

function App() {
  return (
    <Provider store={store}>
      <AppInitializer>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/reservar" element={<BookingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPageWrapper />} />
            <Route path="/recovery" element={<RecoveryPage />} />
            <Route
              path="/admin"
              element={
                <RequireAdminRoute>
                  <AdminLayout />
                </RequireAdminRoute>
              }
            >
              <Route path="profesionales" element={<ProfessionalsPage />} />
              <Route path="perfil" element={<AdminProfilePage />} />
              <Route path="turnos" element={<AdminAppointmentsPage />} />
              <Route index element={<Navigate to="profesionales" replace />} />
            </Route>
            <Route
              path="/mis-turnos"
              element={
                <RequireAuthRoute>
                  <ClientLayout />
                </RequireAuthRoute>
              }
            >
              <Route index element={<MyAppointmentsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AppInitializer>
    </Provider>
  );
}

function RequireAdminRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const token = getAccessToken();
  const role = getTokenKind(token);

  if (isInitializing) {
    return null;
  }

  if (!isTokenValid(token) || role !== 'Admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireAuthRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const token = getAccessToken();

  if (isInitializing) {
    return null;
  }

  if (!isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RegisterPageWrapper() {
  const navigate = useNavigate();

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  return <RegisterPage onNavigateToLogin={handleNavigateToLogin} />;
}

export default App;
