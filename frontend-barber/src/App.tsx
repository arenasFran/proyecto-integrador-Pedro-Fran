import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch } from './store/hooks';
import { fetchUserProfile } from './store/slices/authSlice';
import AdminLayout from './pages/admin/AdminLayout';
import ProfessionalsPage from './pages/admin/ProfessionalsPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import { RegisterPage } from './pages/public/RegisterPage';
import { RecoveryPage } from './pages/public/RecoveryPage';
import LoginPage from './pages/public/LoginPage';
import BookingPage from './pages/client/BookingPage';
import { getTokenKind, isTokenValid } from './utils/token';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (isTokenValid(token)) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch]);

  return <>{children}</>;
}

function App() {
  return (
    <Provider store={store}>
      <AppInitializer>
        <Router>
          <Routes>
            <Route path="/" element={<BookingPage />} />
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
              <Route index element={<Navigate to="profesionales" replace />} />
            </Route>
          </Routes>
        </Router>
      </AppInitializer>
    </Provider>
  );
}

function RequireAdminRoute({ children }: { children: React.ReactNode }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const role = getTokenKind(token);

  if (!isTokenValid(token) || role !== 'Admin') {
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
