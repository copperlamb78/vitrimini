import {
  Mail,
  Users,
  Store,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { AdminOverviewResponse } from '../../types/catalog';
import type { AdminFinanceSummary } from '../../types/admin';
import { formatCurrency } from '../../utils/format';

interface AdminOverviewTabProps {
  data: AdminOverviewResponse;
  finance: AdminFinanceSummary | null;
  onNavigateTab: (tab: string) => void;
}

export function AdminOverviewTab({
  data,
  finance,
  onNavigateTab,
}: AdminOverviewTabProps) {
  const brevoBarColor =
    data.brevo.usagePercent >= 90
      ? 'bg-red-600'
      : data.brevo.usagePercent >= 70
        ? 'bg-amber-500'
        : 'bg-emerald-600';

  const brevoBadgeClass =
    data.brevo.usagePercent >= 90
      ? 'bg-red-100 text-red-800'
      : data.brevo.usagePercent >= 70
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800';

  return (
    <div className="space-y-6">
      {/* Alertas Rápidos */}
      {data.alerts &&
        (data.alerts.openErrorsCount > 0 || data.alerts.expiringRadarCount > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.alerts.openErrorsCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('errors')}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left transition hover:bg-red-100/70"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-xs font-extrabold text-red-900">
                      {data.alerts.openErrorsCount} erro(s) aberto(s) na Central
                    </p>
                    <p className="text-[11px] text-red-700">
                      {data.alerts.criticalErrors24hCount} crítico(s) nas últimas 24h
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-700">Ver →</span>
              </button>
            )}

            {data.alerts.expiringRadarCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('radar')}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100/70"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-xs font-extrabold text-amber-900">
                      {data.alerts.expiringRadarCount} vitrine(s) vencem em até 7 dias
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Acesse o Radar para chamar no Whats ou enviar lembrete
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-800">Radar →</span>
              </button>
            )}
          </div>
        )}

      {/* Brevo Quota */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-extrabold text-zinc-900">
              Cota Diária de E-mails (Brevo)
            </h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${brevoBadgeClass}`}>
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span>Trava automática em 80% (240/300) para proteger transacionais.</span>
          <span>Falhas hoje: {data.brevo.failedToday}</span>
        </div>
      </section>

      {/* KPIs SaaS + MRR */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>MRR Estimado</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {finance ? formatCurrency(finance.mrrCents) : '—'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Conversão: {finance ? `${finance.conversionRatePercent}%` : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Lojistas & Usuários</span>
            <Users className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {data.saas.totalUsers}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {data.saas.usersWithCatalogs} com vitrine criada
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Vitrines Ativas</span>
            <Store className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {data.saas.catalogsByStatus.ACTIVE}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {data.saas.catalogsByStatus.DRAFT} rascunho •{' '}
            {data.saas.catalogsByStatus.EXPIRED} expiradas
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Receita Líquida (30d)</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {formatCurrency(
              finance?.revenue30d.netCents ??
                data.saas.revenue?.last30d.netCents ??
                data.saas.revenue30dCents
            )}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Taxas MP: -
            {formatCurrency(
              finance?.revenue30d.feeCents ?? data.saas.revenue?.last30d.feeCents ?? 0
            )}{' '}
            • <ShoppingBag className="inline h-3 w-3" /> {data.saas.totalOrders} pedidos
          </p>
        </div>
      </section>
    </div>
  );
}
