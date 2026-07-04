import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { authApi } from './services/authApi';
import { silentRefresh, getAccessToken } from './services/api';
import { setInitialized } from './store/slices/authSlice';
import { Spinner, ToastProvider } from './components/common';
import AdminLayout from './pages/admin/AdminLayout';
import AppLayout from './pages/app/AppLayout';
import DashboardPage from './pages/admin/DashboardPage';
import ProfessionalsPage from './pages/admin/ProfessionalsPage';
import AdminAppointmentsPage from './pages/admin/AppointmentsPage';
import CalendarPage from './pages/admin/CalendarPage';
import ServicesPage from './pages/admin/ServicesPage';
import ClientsPage from './pages/admin/ClientsPage';
import ProfilePage from './pages/app/ProfilePage';
import { RegisterPage } from './pages/public/RegisterPage';
import { RecoveryPage } from './pages/public/RecoveryPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import BookingPage from './pages/client/BookingPage';
import MyAppointmentsPage from './pages/client/MyAppointmentsPage';
import { getTokenKind, isTokenValid } from './utils/token';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const loginToken = useAppSelector((state) => state.auth.loginToken);

  useEffect(() => {
    const init = async () => {
      const token = getAccessToken();
      if (isTokenValid(token)) {
        await dispatch(authApi.endpoints.getProfile.initiate());
        dispatch(setInitialized());
        return;
      }

      const refreshed = await silentRefresh();
      if (refreshed) {
        await dispatch(authApi.endpoints.getProfile.initiate());
      }
      dispatch(setInitialized());
    };

    init();
  }, [dispatch]);

  useEffect(() => {
    if (loginToken) {
      dispatch(authApi.endpoints.getProfile.initiate());
    }
  }, [loginToken, dispatch]);

  return <>{children}</>;
}

function App() {
  return (
    <Provider store={store}>
      <AppInitializer>
        <ToastProvider>
        <Router>
          <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
            <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
          </div>
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
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profesionales" element={<ProfessionalsPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="turnos" element={<AdminAppointmentsPage />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="servicios" element={<ServicesPage />} />
              <Route path="clientes" element={<ClientsPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
            <Route
              element={
                <RequireAuthRoute>
                  <AppLayout />
                </RequireAuthRoute>
              }
            >
              <Route path="/mis-turnos" element={<MyAppointmentsPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
        </ToastProvider>
      </AppInitializer>
    </Provider>
  );
}

function RequireAdminRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const token = getAccessToken();
  const role = getTokenKind(token);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isTokenValid(token) || (role !== 'Admin' && role !== 'Empleado')) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireAuthRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const token = getAccessToken();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RegisterPageWrapper() {
  return <RegisterPage />;
}

export default App;
