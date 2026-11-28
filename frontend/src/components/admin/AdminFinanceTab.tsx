import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshCw,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  Webhook,
} from 'lucide-react';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import {
  getAdminFinanceSummary,
  listAdminPayments,
  listAdminWebhooks,
  reconcileAdminPayment,
} from '../../services/adminApi';
import type {
  AdminFinanceSummary,
  AdminPaymentItem,
  WebhookLogItem,
} from '../../types/admin';
import { formatCurrency } from '../../utils/format';

export function AdminFinanceTab({
  onToast,
}: {
  onToast: (msg: string, isError?: boolean) => void;
}) {
  const [subTab, setSubTab] = useState<'payments' | 'webhooks'>('payments');
  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const reconcileLockRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        getAdminFinanceSummary(),
        subTab === 'payments'
          ? listAdminPayments({
              page,
              pageSize: 15,
              status: (statusFilter as 'PENDING' | 'PAID' | '') || '',
              q: debouncedQ.trim() || undefined,
            })
          : listAdminWebhooks({
              page,
              pageSize: 15,
              status:
                (statusFilter as
                  | 'RECEIVED'
                  | 'PROCESSED'
                  | 'IGNORED'
                  | 'FAILED'
                  | '') || '',
              q: debouncedQ.trim() || undefined,
            }),
      ]);
      setSummary(sumRes);
      if (subTab === 'payments') {
        setPayments(listRes.items as AdminPaymentItem[]);
      } else {
        setWebhooks(listRes.items as WebhookLogItem[]);
      }
      setTotalPages(listRes.totalPages);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao carregar financeiro.', true);
    } finally {
      setLoading(false);
    }
  }, [subTab, page, statusFilter, debouncedQ, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReconcile(p: AdminPaymentItem) {
    if (reconcileLockRef.current) return;
    reconcileLockRef.current = true;
    setReconcilingId(p.id);
    try {
      const res = await reconcileAdminPayment(p.id);
      onToast(res.message, !res.reconciled);
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao consultar MP.', true);
    } finally {
      reconcileLockRef.current = false;
      setReconcilingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Resumo Financeiro / MRR */}
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500">MRR Estimado</p>
            <p className="mt-1 text-xl font-extrabold text-zinc-900">
              {formatCurrency(summary.mrrCents)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Conversão: {summary.conversionRatePercent}% ({summary.paidCatalogsCount}/
              {summary.totalCatalogs})
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500">Receita 30d (Líquida)</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-700">
              {formatCurrency(summary.revenue30d.netCents)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Bruta: {formatCurrency(summary.revenue30d.grossCents)} • Taxas MP: -
              {formatCurrency(summary.revenue30d.feeCents)}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400">
              Pix: -{formatCurrency(summary.revenue30d.pixFeeCents)} • Cartão: -
              {formatCurrency(summary.revenue30d.cardFeeCents)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500">Pix vs Cartão (30d)</p>
            <p className="mt-1 text-xs font-bold text-zinc-900">
              Pix: {formatCurrency(summary.revenue30d.pixGrossCents)}
            </p>
            <p className="mt-0.5 text-xs font-bold text-zinc-700">
              Cartão: {formatCurrency(summary.revenue30d.cardGrossCents)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500">Vitrines Ativas por Plano</p>
            <p className="mt-1 text-[11px] font-semibold text-zinc-700">
              Essencial: {summary.planDistribution.ESSENTIAL_30} • Pro:{' '}
              {summary.planDistribution.PRO_30} • Anual: {summary.planDistribution.PRO_365}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Trial: {summary.planDistribution.TRIAL} • Legado:{' '}
              {summary.planDistribution.LEGACY} • Pendentes 7d: {summary.pendingLast7d}
            </p>
          </div>
        </div>
      )}

      {/* Sub-abas Pagamentos / Webhooks */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSubTab('payments');
              setStatusFilter('');
              setPage(1);
            }}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold ${
              subTab === 'payments'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-700'
            }`}
          >
            Pagamentos
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('webhooks');
              setStatusFilter('');
              setPage(1);
            }}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
              subTab === 'webhooks'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-700'
            }`}
          >
            <Webhook className="h-3.5 w-3.5" /> Webhooks MP
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Buscar loja, e-mail, gatewayId..."
              className="rounded-xl border border-zinc-200 bg-white py-1.5 pr-3 pl-8 text-xs outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold"
          >
            <option value="">Todos status</option>
            {subTab === 'payments' ? (
              <>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
              </>
            ) : (
              <>
                <option value="PROCESSED">PROCESSED</option>
                <option value="FAILED">FAILED</option>
                <option value="IGNORED">IGNORED</option>
              </>
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : subTab === 'payments' ? (
        payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-xs text-zinc-500">
            Nenhum pagamento encontrado com os filtros atuais.
          </div>
        ) : (
        <div className="space-y-2.5">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-zinc-900">
                    {p.catalog?.storeName || p.catalogNameSnapshot || 'Vitrine excluída'}
                  </span>
                  {!p.catalog && (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                      (excluída)
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {p.status === 'PAID' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {p.status}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                    {p.planCode}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatCurrency(p.amountCents)} •{' '}
                  {p.user.email || p.ownerEmailSnapshot || '—'} •{' '}
                  {new Date(p.createdAt).toLocaleString('pt-BR')}
                </p>
                {p.gatewayId && (
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                    MP ID: {p.gatewayId}
                  </p>
                )}
              </div>

              {p.status === 'PENDING' && (
                <button
                  type="button"
                  disabled={reconcilingId === p.id}
                  onClick={() => void handleReconcile(p)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      reconcilingId === p.id ? 'animate-spin' : ''
                    }`}
                  />
                  Verificar no MP
                </button>
              )}
            </div>
          ))}
        </div>
        )
      ) : webhooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-xs text-zinc-500">
          Nenhum webhook do Mercado Pago registrado ainda. Novos webhooks aparecerão aqui automaticamente.
        </div>
      ) : (
        <div className="space-y-2.5">
          {webhooks.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-zinc-900">{w.eventType}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      w.status === 'PROCESSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : w.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
                <span className="text-zinc-400">
                  {new Date(w.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              {w.externalResourceId && (
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  Resource: {w.externalResourceId} (HTTP {w.httpStatus ?? '—'})
                </p>
              )}
              {w.errorMessage && (
                <p className="mt-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-red-700">
                  {w.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="font-semibold text-zinc-600">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
