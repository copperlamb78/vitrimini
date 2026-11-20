import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PageSuspenseSkeleton } from './components/Skeletons';

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const CreatorPage = lazy(() =>
  import('./pages/CreatorPage').then((m) => ({ default: m.CreatorPage }))
);
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const MyCatalogsPage = lazy(() =>
  import('./pages/MyCatalogsPage').then((m) => ({ default: m.MyCatalogsPage }))
);
const MyOrdersPage = lazy(() =>
  import('./pages/MyOrdersPage').then((m) => ({ default: m.MyOrdersPage }))
);
const StorePage = lazy(() =>
  import('./pages/StorePage').then((m) => ({ default: m.StorePage }))
);
const ManagePage = lazy(() =>
  import('./pages/ManagePage').then((m) => ({ default: m.ManagePage }))
);
const OrderTrackingPage = lazy(() =>
  import('./pages/OrderTrackingPage').then((m) => ({
    default: m.OrderTrackingPage,
  }))
);
const EditTokenRedirectPage = lazy(() =>
  import('./pages/EditTokenRedirectPage').then((m) => ({
    default: m.EditTokenRedirectPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);

const isAdminSubdomain =
  typeof window !== 'undefined' &&
  window.location.hostname.toLowerCase() === 'painel.vitrimini.com.br';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSuspenseSkeleton />}>
          {isAdminSubdomain ? (
            <Routes>
              <Route path="*" element={<AdminDashboardPage />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/criar" element={<CreatorPage />} />
              <Route path="/entrar" element={<AuthPage />} />
              <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
              <Route path="/minhas-vitrines" element={<MyCatalogsPage />} />
              <Route path="/meus-pedidos" element={<MyOrdersPage />} />
              <Route path="/c/:slug" element={<StorePage />} />
              <Route path="/pedido/:trackingCode" element={<OrderTrackingPage />} />
              <Route path="/painel/:catalogId" element={<ManagePage />} />
              <Route
                path="/editar/:editToken"
                element={<EditTokenRedirectPage />}
              />
              <Route path="/super-admin" element={<AdminDashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
