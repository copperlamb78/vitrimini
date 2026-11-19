import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { CreatorPage } from './pages/CreatorPage';
import { AuthPage } from './pages/AuthPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { MyCatalogsPage } from './pages/MyCatalogsPage';
import { StorePage } from './pages/StorePage';
import { ManagePage } from './pages/ManagePage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/criar" element={<CreatorPage />} />
          <Route path="/entrar" element={<AuthPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/minhas-vitrines" element={<MyCatalogsPage />} />
          <Route path="/c/:slug" element={<StorePage />} />
          <Route path="/editar/:editToken" element={<ManagePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
