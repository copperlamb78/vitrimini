import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Mail,
  RefreshCw,
  LogOut,
  Loader2,
  AlertTriangle,
  Users,
  Store,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AdminOverviewResponse } from '../types/catalog';
import { getAdminOverview, getSafeErrorMessage } from '../services/api';
import { formatCurrency, normalizeEmailInput } from '../utils/format';
import { applyPageSeo } from '../utils/seo';
import { AdminDashboardSkeleton } from '../components/Skeletons';
import logoVitriMini from '../assets/logo-vitrimini.png';

export function AdminDashboardPage() {
  const { user, loading: authLoading, login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    applyPageSeo({
      title: 'Painel Admin — VitriMini',
      description: 'Painel administrativo VitriMini.',
      canonicalPath: '/super-admin',
      noindex: true,
    });
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const res = await getAdminOverview();
      setData(res);
    } catch (err) {
      setDataError(
        getSafeErrorMessage(
          err,
          'Acesso restrito. Verifique se seu e-mail está em ADMIN_EMAILS.'
        )
      );
      setData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void loadOverview();
    }
  }, [authLoading, user, loadOverview]);

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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <img
              src={logoVitriMini}
              alt="VitriMini"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {loginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const brevoBarColor =
    (data?.brevo.usagePercent || 0) >= 90
      ? 'bg-red-600'
      : (data?.brevo.usagePercent || 0) >= 70
        ? 'bg-amber-500'
        : 'bg-emerald-600';

  const brevoBadgeClass =
    (data?.brevo.usagePercent || 0) >= 90
      ? 'bg-red-100 text-red-800'
      : (data?.brevo.usagePercent || 0) >= 70
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800';

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <img
              src={logoVitriMini}
              alt="VitriMini"
              className="h-7 w-auto object-contain"
            />
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
              <ShieldCheck className="h-3 w-3 text-rose-400" />
              Super Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`}
              />
              Atualizar
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
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
              {/* 1. Card de Alerta Brevo (Destaque no Topo) */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-rose-600" />
                    <h1 className="text-base font-extrabold text-zinc-900">
                      Cota Diária de E-mails (Brevo)
                    </h1>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${brevoBadgeClass}`}
                  >
                    {data.brevo.sentToday} / {data.brevo.dailyLimit} enviados hoje (
                    {data.brevo.usagePercent}%)
                  </span>
                </div>

                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full transition-all ${brevoBarColor}`}
                    style={{ width: `${data.brevo.usagePercent}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>
                    Falhas hoje:{' '}
                    <strong className="text-zinc-900">
                      {data.brevo.failedToday}
                    </strong>
                  </span>
                  <span>Fuso de contagem: America/Sao_Paulo</span>
                </div>

                {/* Histórico 7 dias */}
                <div className="mt-5 grid grid-cols-7 gap-2 text-center">
                  {data.brevo.last7Days.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-xl border border-zinc-100 bg-zinc-50 p-2"
                    >
                      <p className="text-[10px] font-bold text-zinc-500">
                        {day.date.slice(5).split('-').reverse().join('/')}
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-zinc-900">
                        {day.sent}
                      </p>
                      {day.failed > 0 && (
                        <p className="text-[10px] font-bold text-red-600">
                          {day.failed} erro{day.failed > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* 2. KPIs da Plataforma SaaS */}
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    Receita Líquida (30d)
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-zinc-900">
                    {formatCurrency(
                      data.saas.revenue?.last30d.netCents ??
                        data.saas.revenue30dCents
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-800">
                    Bruto: {formatCurrency(data.saas.revenue?.last30d.grossCents ?? data.saas.revenue30dCents)} • Taxas Pix: -{formatCurrency(data.saas.revenue?.last30d.feeCents ?? 0)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Total líquido: {formatCurrency(data.saas.revenue?.total.netCents ?? data.saas.revenueTotalCents)} (Bruto {formatCurrency(data.saas.revenue?.total.grossCents ?? data.saas.revenueTotalCents)} • {data.saas.paymentsTotalCount} pagos)
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                    <Store className="h-4 w-4 text-rose-600" />
                    Vitrines Ativas
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-zinc-900">
                    {data.saas.catalogsByStatus.ACTIVE}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {data.saas.catalogsByStatus.DRAFT} rascunhos •{' '}
                    {data.saas.catalogsByStatus.EXPIRED} expiradas
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                    <Users className="h-4 w-4 text-rose-600" />
                    Usuários Cadastrados
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-zinc-900">
                    {data.saas.totalUsers}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {data.saas.usersWithCatalogs} com vitrine •{' '}
                    {Math.max(
                      0,
                      data.saas.totalUsers - data.saas.usersWithCatalogs
                    )}{' '}
                    apenas compradores
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                    <ShoppingBag className="h-4 w-4 text-rose-600" />
                    Pedidos na Plataforma
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-zinc-900">
                    {data.saas.totalOrders}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Total processado nas vitrines
                  </p>
                </div>
              </section>

              {/* 3. Logs Recentes da Brevo */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <h2 className="text-sm font-extrabold text-zinc-900">
                  Últimos 20 Disparos de E-mail
                </h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500">
                        <th className="py-2 pr-3">Data</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Destinatário</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2">Erro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.brevo.recentLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="whitespace-nowrap py-2 pr-3 text-zinc-500">
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2 pr-3 font-mono text-[11px] font-bold text-zinc-800">
                            {log.type}
                          </td>
                          <td className="py-2 pr-3 text-zinc-700">
                            {log.recipient}
                          </td>
                          <td className="py-2 pr-3">
                            {log.status === 'SENT' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                SENT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                <XCircle className="h-3 w-3" />
                                FAILED
                              </span>
                            )}
                          </td>
                          <td className="max-w-xs truncate py-2 text-red-600">
                            {log.errorMessage || '—'}
                          </td>
                        </tr>
                      ))}
                      {data.brevo.recentLogs.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-4 text-center text-zinc-400"
                          >
                            Nenhum e-mail registrado ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 4. Tabelas Operacionais: Vitrines e Pagamentos */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
                  <h2 className="text-sm font-extrabold text-zinc-900">
                    Vitrines Recentes
                  </h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500">
                          <th className="py-2 pr-2">Vitrine</th>
                          <th className="py-2 pr-2">Lojista</th>
                          <th className="py-2 pr-2">Status</th>
                          <th className="py-2">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {data.recentCatalogs.map((cat) => (
                          <tr key={cat.id}>
                            <td className="py-2 pr-2 font-bold text-zinc-900">
                              {cat.storeName}
                              <span className="block font-normal text-[11px] text-zinc-400">
                                /c/{cat.slug}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-zinc-600">
                              {cat.user.name}
                            </td>
                            <td className="py-2 pr-2">
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                                {cat.status}
                              </span>
                            </td>
                            <td className="py-2 font-semibold text-zinc-800">
                              {cat._count.orders}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
                  <h2 className="text-sm font-extrabold text-zinc-900">
                    Últimos Pagamentos Mercado Pago
                  </h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500">
                          <th className="py-2 pr-2">Vitrine</th>
                          <th className="py-2 pr-2">Tipo</th>
                          <th className="py-2 pr-2">Valor</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {data.recentPayments.map((pay) => (
                          <tr key={pay.id}>
                            <td className="py-2 pr-2 font-bold text-zinc-900">
                              {pay.catalog.storeName}
                              <span className="block font-normal text-[11px] text-zinc-400">
                                {pay.user.email}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-zinc-600">
                              {pay.type}
                            </td>
                            <td className="py-2 pr-2 font-bold text-zinc-900">
                              {formatCurrency(pay.amountCents)}
                            </td>
                            <td className="py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  pay.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {pay.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}
