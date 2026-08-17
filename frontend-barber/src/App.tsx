import { lazy, Suspense, useEffect, useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { authApi } from './services/authApi';
import { silentRefresh, getAccessToken } from './services/api';
import { setInitialized } from './store/slices/authSlice';
import { Spinner, ToastProvider, CookieConsent } from './components/common';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RequireAdminRoute, RequireClientRoute } from './components/guards';
import { logout } from './store/slices/authSlice';
import { isTokenValid } from './utils/token';

const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const BookingPage = lazy(() => import('./pages/client/BookingPage'));
const ShopPage = lazy(() => import('./pages/public/ShopPage'));
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage'));
const PaymentResultPage = lazy(() => import('./pages/public/PaymentResultPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage = lazy(() =>
  import('./pages/public/RegisterPage').then(({ RegisterPage: Component }) => ({ default: Component }))
);
const RecoveryPage = lazy(() => import('./pages/public/RecoveryPage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CancellationsPage = lazy(() => import('./pages/legal/CancellationsPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const ProfessionalsPage = lazy(() => import('./pages/admin/ProfessionalsPage'));
const AdminAppointmentsPage = lazy(() => import('./pages/admin/AppointmentsPage'));
const CalendarPage = lazy(() => import('./pages/admin/CalendarPage'));
const ServicesPage = lazy(() => import('./pages/admin/ServicesPage'));
const ClientsPage = lazy(() => import('./pages/admin/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/admin/ClientDetailPage'));
const MembershipsPage = lazy(() => import('./pages/admin/MembershipsPage'));
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));

const AppLayout = lazy(() => import('./pages/app/AppLayout'));
const MembershipPage = lazy(() => import('./pages/app/MembershipPage'));
const ProfilePage = lazy(() => import('./pages/app/ProfilePage'));
const MyAppointmentsPage = lazy(() => import('./pages/client/MyAppointmentsPage'));
const MyOrdersPage = lazy(() => import('./pages/client/MyOrdersPage'));
const AiHaircutPage = lazy(() => import('./pages/client/AiHaircutPage'));
const AppSidebar = lazy(() => import('./components/sidebar/AppSidebar').then(({ AppSidebar: Component }) => ({ default: Component })));

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
      } else if (token) {
        dispatch(logout());
      }
      dispatch(setInitialized());
    };

    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const scheduleInit = () => {
      if (window.location.pathname !== '/') {
        void init();
        return;
      }

      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => void init(), { timeout: 1200 });
      } else {
        timeoutId = window.setTimeout(() => void init(), 0);
      }
    };

    scheduleInit();
    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
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
          <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/reservar" element={<OptionalAppLayout><BookingPage /></OptionalAppLayout>} />
            <Route path="/tienda" element={<OptionalAppLayout><ShopPage /></OptionalAppLayout>} />
            <Route path="/producto/:id" element={<OptionalAppLayout><ProductDetailPage /></OptionalAppLayout>} />
            <Route path="/payment/result" element={<PaymentResultPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/recovery" element={<RecoveryPage />} />
            <Route path="/terminos" element={<TermsPage />} />
            <Route path="/privacidad" element={<PrivacyPage />} />
            <Route path="/cancelaciones" element={<CancellationsPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
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
              <Route path="clientes/:clientKey" element={<ClientDetailPage />} />
              <Route path="membresias" element={<MembershipsPage />} />
              <Route path="productos" element={<ProductsPage />} />
              <Route path="ordenes" element={<OrdersPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
            <Route
              element={
                <RequireClientRoute>
                  <AppLayout />
                </RequireClientRoute>
              }
            >
              <Route path="/mis-turnos" element={<MyAppointmentsPage />} />
              <Route path="/mis-ordenes" element={<MyOrdersPage />} />
              <Route path="/mi-membresia" element={<MembershipPage />} />
              <Route path="/recomendacion-corte" element={<AiHaircutPage />} />
            </Route>
            <Route
              element={
                <RequireAuthRoute>
                  <AppLayout />
                </RequireAuthRoute>
              }
            >
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
          <CookieConsent />
        </Router>
        </ToastProvider>
      </AppInitializer>
    </Provider>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center" aria-busy="true">
      <Spinner size="lg" />
    </div>
  );
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

function OptionalAppLayout({ children }: { children: React.ReactNode }) {
  const loginToken = useAppSelector((state) => state.auth.loginToken);
  const token = loginToken || getAccessToken();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!token) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#050505]">
      <AppSidebar mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((open) => !open)} />
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-[#282828] bg-[#121212] text-[#8A8A8A] transition-colors hover:border-[#FF5C00]/30 hover:text-white lg:hidden"
        aria-label="Abrir menú"
      >
        <FiMenu size={20} />
      </button>
      <div className="lg:ml-52">
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default App;







