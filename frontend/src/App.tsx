import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PageSuspenseSkeleton } from './components/Skeletons';
import {
  GlobalErrorBoundary,
  registerGlobalErrorListeners,
} from './components/GlobalErrorBoundary';
import { ImpersonationBanner } from './components/ImpersonationBanner';

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const NicheLandingPage = lazy(() =>
  import('./pages/NicheLandingPage').then((m) => ({
    default: m.NicheLandingPage,
  }))
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
const BioLinksPage = lazy(() =>
  import('./pages/BioLinksPage').then((m) => ({ default: m.BioLinksPage }))
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
const LegalDocPage = lazy(() =>
  import('./pages/LegalDocPage').then((m) => ({
    default: m.LegalDocPage,
  }))
);

const isAdminSubdomain =
  typeof window !== 'undefined' &&
  window.location.hostname.toLowerCase() === 'painel.vitrimini.com.br';

function AppRoutes() {
  const { user } = useAuth();
  const isImpersonating = Boolean(user?.isImpersonation);

  if (isAdminSubdomain && !isImpersonating) {
    return (
      <Routes>
        <Route path="*" element={<AdminDashboardPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAdminSubdomain && isImpersonating ? (
            <Navigate to="/minhas-vitrines" replace />
          ) : (
            <LandingPage />
          )
        }
      />
      <Route
        path="/cardapio-digital-whatsapp"
        element={<NicheLandingPage nicheKey="cardapio-digital-whatsapp" />}
      />
      <Route
        path="/catalogo-online-roupas"
        element={<NicheLandingPage nicheKey="catalogo-online-roupas" />}
      />
      <Route
        path="/vitrine-digital-confeitaria"
        element={<NicheLandingPage nicheKey="vitrine-digital-confeitaria" />}
      />
      <Route
        path="/link-pedidos-instagram"
        element={<NicheLandingPage nicheKey="link-pedidos-instagram" />}
      />
      <Route path="/criar" element={<CreatorPage />} />
      <Route path="/entrar" element={<AuthPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/minhas-vitrines" element={<MyCatalogsPage />} />
      <Route path="/meus-pedidos" element={<MyOrdersPage />} />
      <Route path="/c/:slug" element={<StorePage />} />
      <Route path="/:slug/links" element={<BioLinksPage />} />
      <Route path="/pedido/:trackingCode" element={<OrderTrackingPage />} />
      <Route path="/painel/:catalogId" element={<ManagePage />} />
      <Route path="/editar/:editToken" element={<EditTokenRedirectPage />} />
      <Route
        path="/super-admin"
        element={
          isImpersonating ? (
            <Navigate to="/minhas-vitrines" replace />
          ) : (
            <AdminDashboardPage />
          )
        }
      />
      <Route path="/termos" element={<LegalDocPage type="terms" />} />
      <Route path="/privacidade" element={<LegalDocPage type="privacy" />} />
      <Route
        path="*"
        element={
          <Navigate
            to={isAdminSubdomain && isImpersonating ? '/minhas-vitrines' : '/'}
            replace
          />
        }
      />
    </Routes>
  );
}

export function App() {
  useEffect(() => {
    return registerGlobalErrorListeners();
  }, []);

  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ImpersonationBanner />
          <Suspense fallback={<PageSuspenseSkeleton />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
