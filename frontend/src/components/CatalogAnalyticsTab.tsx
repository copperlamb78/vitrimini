import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  Clock,
  ShoppingBag,
  Receipt,
  Trophy,
  Users,
  MessageCircle,
} from 'lucide-react';
import type { CatalogAnalytics } from '../types/catalog';
import type { ThemePalette } from '../constants/themes';
import { getCatalogAnalytics, getSafeErrorMessage } from '../services/api';
import { formatCurrency, formatPhoneMask } from '../utils/format';
import { AnalyticsSkeleton } from './Skeletons';

interface CatalogAnalyticsTabProps {
  catalogId: string;
  theme: ThemePalette;
}

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: 'Este mês' },
  { id: 'all', label: 'Tudo' },
];

export function CatalogAnalyticsTab({
  catalogId,
  theme,
}: CatalogAnalyticsTabProps) {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<CatalogAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCatalogAnalytics(catalogId, period);
      setData(res);
    } catch (err) {
      setError(getSafeErrorMessage(err, 'Erro ao carregar indicadores.'));
    } finally {
      setLoading(false);
    }
  }, [catalogId, period]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-5">
      {/* Seletor de período */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
        <div>
          <h2 className="text-sm font-extrabold text-zinc-900">
            Resumo Financeiro & Inteligência
          </h2>
          <p className="text-xs text-zinc-500">
            Faturamento confirmado considera apenas pedidos concluídos.
          </p>
        </div>

        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                period === p.id
                  ? `${theme.primaryBg} ${theme.buttonText}`
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {loading || !data ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Confirmado
              </div>
              <p className="mt-2 text-xl font-extrabold text-zinc-900">
                {formatCurrency(data.confirmedRevenueCents)}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-700">
                {data.completedOrdersCount} concluídos
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <Clock className="h-4 w-4 text-amber-600" />
                Pendente
              </div>
              <p className="mt-2 text-xl font-extrabold text-zinc-900">
                {formatCurrency(data.pendingRevenueCents)}
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                {data.pendingOrdersCount} em andamento
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                <ShoppingBag className={`h-4 w-4 ${theme.primaryText}`} />
                Pedidos
              </div>
              <p className="mt-2 text-xl font-extrabold text-zinc-900">
                {data.completedOrdersCount + data.pendingOrdersCount}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {data.cancelledOrdersCount} cancelados
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                <Receipt className={`h-4 w-4 ${theme.primaryText}`} />
                Ticket Médio
              </div>
              <p className="mt-2 text-xl font-extrabold text-zinc-900">
                {formatCurrency(data.averageTicketCents)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                por pedido concluído
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Ranking de Produtos */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Trophy className={`h-4 w-4 ${theme.primaryText}`} />
                <h3 className="text-sm font-extrabold text-zinc-900">
                  Produtos Mais Vendidos
                </h3>
              </div>

              {data.topProducts.length === 0 ? (
                <p className="mt-4 text-xs text-zinc-500">
                  Nenhuma venda registrada neste período.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-100">
                  {data.topProducts.map((prod, idx) => (
                    <li
                      key={`${prod.productName}-${idx}`}
                      className="flex items-center justify-between gap-2 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <span
                          className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${theme.softBg} ${theme.softText}`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-bold text-zinc-800">
                          {prod.productName}
                        </span>
                        <span className="ml-2 text-zinc-500">
                          ({prod.quantitySold} un.)
                        </span>
                      </div>
                      <span className="shrink-0 font-extrabold text-zinc-900">
                        {formatCurrency(prod.revenueCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Clientes Recorrentes */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Users className={`h-4 w-4 ${theme.primaryText}`} />
                <h3 className="text-sm font-extrabold text-zinc-900">
                  Clientes Recorrentes
                </h3>
              </div>

              {data.topCustomers.length === 0 ? (
                <p className="mt-4 text-xs text-zinc-500">
                  Nenhum cliente registrado neste período.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-100">
                  {data.topCustomers.map((cust) => (
                    <li
                      key={cust.customerPhone}
                      className="flex items-center justify-between gap-2 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-zinc-900">
                          {cust.customerName}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {formatPhoneMask(cust.customerPhone)} •{' '}
                          {cust.ordersCount}{' '}
                          {cust.ordersCount === 1 ? 'pedido' : 'pedidos'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-extrabold text-zinc-900">
                          {formatCurrency(cust.totalSpentCents)}
                        </span>
                        <a
                          href={`https://wa.me/${cust.customerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Chamar ${cust.customerName} no WhatsApp`}
                          className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
