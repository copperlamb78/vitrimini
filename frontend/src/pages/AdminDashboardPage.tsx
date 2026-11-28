import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AdminOverviewResponse } from '../types/catalog';
import type { AdminFinanceSummary } from '../types/admin';
import { getAdminOverview, getSafeErrorMessage } from '../services/api';
import { getAdminFinanceSummary } from '../services/adminApi';
import { normalizeEmailInput } from '../utils/format';
import { applyPageSeo } from '../utils/seo';
import { AdminDashboardSkeleton } from '../components/Skeletons';
import {
  ADMIN_TABS,
  AdminSidebar,
  type AdminTab,
} from '../components/admin/AdminSidebar';
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import { AdminCatalogsTab } from '../components/admin/AdminCatalogsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminSupportRadarTab } from '../components/admin/AdminSupportRadarTab';
import { AdminFinanceTab } from '../components/admin/AdminFinanceTab';
import { AdminErrorsTab } from '../components/admin/AdminErrorsTab';
import { AdminGrowthAuditTab } from '../components/admin/AdminGrowthAuditTab';
import logoVitriMini from '../assets/logo-vitrimini.png';

export function AdminDashboardPage() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [finance, setFinance] = useState<AdminFinanceSummary | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(
    null
  );

  const showToast = useCallback((msg: string, isError = false) => {
    setToast({ msg, isError });
    window.setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  useEffect(() => {
    applyPageSeo({
      title: 'Painel Admin — VitriMini',
      description: 'Central operacional Super Admin VitriMini.',
      canonicalPath: '/super-admin',
      noindex: true,
    });
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [overviewRes, financeRes] = await Promise.all([
        getAdminOverview(),
        getAdminFinanceSummary().catch(() => null),
      ]);
      setData(overviewRes);
      setFinance(financeRes);
    } catch (err) {
      setDataError(
        getSafeErrorMessage(err, 'Acesso restrito a administradores.')
      );
      setData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.isImpersonation) {
        navigate('/minhas-vitrines', { replace: true });
        return;
      }
      void loadOverview();
    }
  }, [authLoading, user, loadOverview, navigate]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await login({ email: normalizeEmailInput(email), password });
    } catch (err) {
      setLoginError(getSafeErrorMessage(err, 'Credenciais inválidas.'));
    } finally {
      setLoginLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (user?.isImpersonation) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <img
              src={logoVitriMini}
              alt="Logo da VitriMini"
              className="mx-auto h-8 w-auto object-contain"
            />
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold text-zinc-700">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
              Super Admin
            </div>
            <h1 className="mt-2 text-lg font-extrabold text-zinc-900">
              Acesso Administrativo
            </h1>
          </div>

          <form onSubmit={handleAdminLogin} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                E-mail administrador
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vitrimini.com.br"
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-rose-600"
              />
            </div>

            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {loginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const openErrorsCount = data?.alerts?.openErrorsCount ?? 0;
  const activeTabLabel =
    ADMIN_TABS.find((t) => t.id === activeTab)?.label || 'Painel Admin';

  return (
    <div className="min-h-screen bg-zinc-50 pb-16 lg:pl-64">
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userEmail={user.email}
        openErrorsCount={openErrorsCount}
        hasData={Boolean(data)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={logout}
      />

      {/* Header Mobile (< lg) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
            className="relative cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-700 transition hover:bg-zinc-100"
          >
            <Menu className="h-4 w-4" />
            {openErrorsCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600"
              />
            )}
          </button>
          <img
            src={logoVitriMini}
            alt="Logo da VitriMini"
            className="h-6 w-auto shrink-0 object-contain"
          />
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white">
            <ShieldCheck className="h-3 w-3 text-rose-400" />
            Super Admin
          </span>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loadingData}
          aria-label="Atualizar dados"
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </header>

      {/* Topbar Desktop (lg+) */}
      <header className="hidden items-center justify-between border-b border-zinc-200 bg-white px-6 py-3.5 lg:flex">
        <h1 className="text-base font-extrabold text-zinc-900">
          {activeTabLabel}
        </h1>
        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loadingData}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`}
          />
          Atualizar
        </button>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-6">
        {toast && (
          <div
            className={`fixed right-4 bottom-4 z-50 rounded-2xl border px-4 py-3 text-xs font-bold shadow-lg ${
              toast.isError
                ? 'border-red-200 bg-red-600 text-white'
                : 'border-emerald-200 bg-zinc-900 text-white'
            }`}
          >
            {toast.msg}
          </div>
        )}

        {dataError && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <span>{dataError}</span>
          </div>
        )}

        {loadingData && !data ? (
          <AdminDashboardSkeleton />
        ) : (
          data && (
            <>
              {activeTab === 'overview' && (
                <AdminOverviewTab
                  data={data}
                  finance={finance}
                  onNavigateTab={(t) => setActiveTab(t as AdminTab)}
                />
              )}
              {activeTab === 'catalogs' && (
                <AdminCatalogsTab onToast={showToast} />
              )}
              {activeTab === 'users' && <AdminUsersTab onToast={showToast} />}
              {activeTab === 'radar' && (
                <AdminSupportRadarTab onToast={showToast} />
              )}
              {activeTab === 'finance' && (
                <AdminFinanceTab onToast={showToast} />
              )}
              {activeTab === 'errors' && (
                <AdminErrorsTab
                  onToast={showToast}
                  onErrorsChanged={() => void loadOverview()}
                />
              )}
              {activeTab === 'growth' && (
                <AdminGrowthAuditTab onToast={showToast} />
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
