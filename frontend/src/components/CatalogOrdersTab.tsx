import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  RefreshCw,
  MessageCircle,
  Printer,
  Clock,
  ChefHat,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  Store,
  Package,
  Bell,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Order, OrderStatus } from '../types/catalog';
import type { ThemePalette } from '../constants/themes';
import {
  getCatalogOrders,
  getSafeErrorMessage,
  updateCatalogOrderStatus,
} from '../services/api';
import { formatCurrency, formatPhoneMask } from '../utils/format';
import {
  playNotificationSound,
  unlockAndPlayNotificationSound,
} from '../utils/notificationSound';
import { OrdersListSkeleton } from './Skeletons';

interface CatalogOrdersTabProps {
  catalogId: string;
  storeName: string;
  theme: ThemePalette;
  onPendingCountChange?: (count: number) => void;
}

const SOUND_PREF_KEY = 'vitrimini_order_sound';
const POLL_INTERVAL_MS = 15_000;

const STATUS_META: Record<
  OrderStatus,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: 'Pendente',
    badgeClass: 'bg-amber-100 text-amber-800',
    icon: Clock,
  },
  PREPARING: {
    label: 'Em preparo',
    badgeClass: 'bg-blue-100 text-blue-800',
    icon: ChefHat,
  },
  OUT_FOR_DELIVERY: {
    label: 'Saiu p/ entrega',
    badgeClass: 'bg-purple-100 text-purple-800',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Concluído',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelado',
    badgeClass: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CASH: 'Dinheiro',
  OTHER: 'Outro',
};

function buildWhatsAppStatusUrl(order: Order, storeName: string): string {
  const firstName = order.customerName.split(' ')[0] || order.customerName;
  const trackingUrl = `https://vitrimini.com.br/pedido/${order.trackingCode}`;

  const completedMsg =
    order.deliveryType === 'PICKUP'
      ? `Olá ${firstName}! Seu pedido #${order.orderNumber} na *${storeName}* está pronto para retirada! Acompanhe aqui: ${trackingUrl}`
      : `Olá ${firstName}! Seu pedido #${order.orderNumber} na *${storeName}* foi concluído. Obrigado pela preferência!`;

  const statusMessages: Record<OrderStatus, string> = {
    PENDING: `Olá ${firstName}! Recebemos o seu pedido #${order.orderNumber} na *${storeName}*. Acompanhe o status aqui: ${trackingUrl}`,
    PREPARING: `Olá ${firstName}! Seu pedido #${order.orderNumber} na *${storeName}* já está em preparo! Acompanhe aqui: ${trackingUrl}`,
    OUT_FOR_DELIVERY: `Olá ${firstName}! Seu pedido #${order.orderNumber} da *${storeName}* acabou de sair para entrega! Acompanhe aqui: ${trackingUrl}`,
    COMPLETED: completedMsg,
    CANCELLED: `Olá ${firstName}, sobre o seu pedido #${order.orderNumber} na *${storeName}* que foi cancelado: caso precise de ajuda, estou por aqui.`,
  };

  const digits = order.customerPhone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(statusMessages[order.status])}`;
}

export function CatalogOrdersTab({
  catalogId,
  storeName,
  theme,
  onPendingCountChange,
}: CatalogOrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmPaidCancelOrder, setConfirmPaidCancelOrder] =
    useState<Order | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const inFlightRef = useRef(false);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const lastSignatureRef = useRef<string>('');
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const fetchOrders = useCallback(
    async (mode: 'initial' | 'manual' | 'silent') => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (mode === 'initial') setLoading(true);
      else if (mode === 'manual') setRefreshing(true);

      if (mode !== 'silent') setError(null);

      try {
        const res = await getCatalogOrders(catalogId, {
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        });
        const nextSignature = res.orders
          .map((o) => `${o.id}:${o.status}:${o.updatedAt}`)
          .join('|');

        if (mode !== 'silent' || nextSignature !== lastSignatureRef.current) {
          lastSignatureRef.current = nextSignature;
          setOrders(res.orders);
        }

        if (statusFilter === 'ALL' && onPendingCountChange) {
          const pendingCount = res.orders.filter(
            (o) => o.status === 'PENDING'
          ).length;
          onPendingCountChange(pendingCount);
        }

        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(res.orders.map((o) => o.id));
        } else {
          const arrived = res.orders.filter(
            (o) => !knownIdsRef.current!.has(o.id)
          );
          for (const o of res.orders) {
            knownIdsRef.current.add(o.id);
          }

          if (mode === 'silent' && arrived.length > 0) {
            setNewOrderAlert(
              arrived.length === 1
                ? `Novo pedido #${arrived[0].orderNumber} recebido!`
                : `${arrived.length} novos pedidos recebidos!`
            );
            setHighlightedIds((prev) => {
              const next = new Set(prev);
              for (const o of arrived) next.add(o.id);
              return next;
            });

            const arrivedIds = arrived.map((o) => o.id);
            setTimeout(() => {
              setHighlightedIds((prev) => {
                const next = new Set(prev);
                for (const id of arrivedIds) next.delete(id);
                return next;
              });
            }, 7000);

            if (soundEnabledRef.current) {
              playNotificationSound();
            }
          }
        }

        setLastCheckedAt(
          new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      } catch (err) {
        if (mode !== 'silent') {
          setError(getSafeErrorMessage(err, 'Erro ao carregar pedidos.'));
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [catalogId, statusFilter, onPendingCountChange]
  );

  useEffect(() => {
    void fetchOrders('initial');
  }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchOrders('silent');
      }
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void fetchOrders('silent');
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders]);

  function handleToggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_PREF_KEY, String(next));
    } catch {
      // ignora erro de storage
    }
    if (next) {
      void unlockAndPlayNotificationSound();
    }
  }

  async function handleChangeStatus(orderId: string, nextStatus: OrderStatus) {
    setUpdatingId(orderId);
    setError(null);
    try {
      const { order } = await updateCatalogOrderStatus(
        catalogId,
        orderId,
        nextStatus
      );
      setOrders((prev) => {
        const nextList = prev.map((o) => (o.id === orderId ? order : o));
        if (statusFilter === 'ALL' && onPendingCountChange) {
          onPendingCountChange(
            nextList.filter((o) => o.status === 'PENDING').length
          );
        }
        return nextList;
      });
    } catch (err) {
      setError(getSafeErrorMessage(err, 'Não foi possível atualizar o status.'));
    } finally {
      setUpdatingId(null);
    }
  }

  function handlePrintReceipt(order: Order) {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 80);
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        String(o.orderNumber).includes(q) ||
        o.trackingCode.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <div className="space-y-4">
      {/* Estilos de impressão térmica 80mm / 58mm e A4 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #vitrimini-receipt, #vitrimini-receipt * { visibility: visible !important; }
          #vitrimini-receipt {
            position: fixed;
            inset: 0;
            width: 80mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 8px;
            background: #fff;
            color: #000;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.4;
          }
        }
      `}</style>

      {/* Filtros + Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou #número..."
            className={`w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs outline-none ${theme.ringFocus}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Pendentes' },
            { id: 'PREPARING', label: 'Preparo' },
            { id: 'OUT_FOR_DELIVERY', label: 'Entrega' },
            { id: 'COMPLETED', label: 'Concluídos' },
            { id: 'CANCELLED', label: 'Cancelados' },
            { id: 'AWAITING_PAYMENT', label: 'Aguardando pgto' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? `${theme.primaryBg} ${theme.buttonText}`
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleToggleSound}
            title={
              soundEnabled
                ? 'Alerta sonoro: Ativado'
                : 'Alerta sonoro: Desativado'
            }
            aria-label={
              soundEnabled
                ? 'Desativar alerta sonoro'
                : 'Ativar alerta sonoro'
            }
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
              soundEnabled
                ? `${theme.softBorder} ${theme.softBg} ${theme.softText}`
                : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => void fetchOrders('manual')}
            aria-label="Recarregar pedidos"
            className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading || refreshing ? 'animate-spin' : ''
              }`}
            />
          </button>

          {lastCheckedAt && (
            <span
              title="Atualização automática a cada 15 segundos"
              className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ao vivo • {lastCheckedAt}
            </span>
          )}
        </div>
      </div>

      {newOrderAlert && (
        <div
          className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-2xs ${theme.softBorder} ${theme.softBg} ${theme.softText}`}
        >
          <div className="flex items-center gap-2">
            <Bell className={`h-4 w-4 shrink-0 ${theme.primaryText}`} />
            <span>{newOrderAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setNewOrderAlert(null)}
            aria-label="Fechar alerta"
            className="rounded-full p-1 hover:bg-black/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <OrdersListSkeleton />
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-2 text-sm font-bold text-zinc-700">
            Nenhum pedido encontrado
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Os pedidos feitos na sua vitrine aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const meta = STATUS_META[order.status];
            const StatusIcon = meta.icon;
            const isUpdating = updatingId === order.id;

            const isHighlighted = highlightedIds.has(order.id);

            return (
              <div
                key={order.id}
                style={
                  isHighlighted
                    ? {
                        borderColor: theme.hex,
                        boxShadow: `0 0 0 2px ${theme.hex}33`,
                      }
                    : undefined
                }
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs transition-all duration-500"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-zinc-900">
                        Pedido #{order.orderNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {order.status === 'COMPLETED' &&
                        order.deliveryType === 'PICKUP'
                          ? 'Pronto p/ retirada'
                          : meta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      <strong className="font-bold text-zinc-900">
                        {order.customerName}
                      </strong>{' '}
                      • {formatPhoneMask(order.customerPhone)} •{' '}
                      {new Date(order.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <p className={`text-base font-extrabold ${theme.primaryText}`}>
                    {formatCurrency(order.totalCents)}
                  </p>
                </div>

                {/* Itens */}
                <ul className="mt-3 space-y-1 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>
                        <strong>{item.quantity}x</strong> {item.productName}
                      </span>
                      <span className="font-semibold text-zinc-900">
                        {formatCurrency(item.unitPriceCents * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Entrega, pagamento e observações */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 font-semibold">
                    {order.deliveryType === 'DELIVERY' ? (
                      <>
                        <MapPin className={`h-3 w-3 ${theme.primaryText}`} />
                        Entrega
                      </>
                    ) : (
                      <>
                        <Store className={`h-3 w-3 ${theme.primaryText}`} />
                        Retirada
                      </>
                    )}
                  </span>
                  <span className="rounded-lg bg-zinc-100 px-2 py-1 font-semibold">
                    {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                  </span>
                  {order.paymentChannel === 'MERCADO_PAGO' && (
                    <span
                      className={`rounded-lg px-2 py-1 font-bold ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.paymentStatus === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.paymentStatus === 'PAID'
                        ? 'Pago online'
                        : order.paymentStatus === 'CANCELLED'
                        ? 'Pgto cancelado'
                        : 'Aguardando pgto'}
                    </span>
                  )}
                  {order.deliveryDate && (
                    <span className="rounded-lg bg-zinc-100 px-2 py-1 font-semibold">
                      {order.deliveryDate}
                    </span>
                  )}
                </div>

                {order.deliveryAddress && (
                  <p className="mt-2 text-xs text-zinc-600">
                    <strong>Endereço:</strong> {order.deliveryAddress}
                  </p>
                )}

                {order.notes && (
                  <p className="mt-1 text-xs text-amber-800">
                    <strong>Obs:</strong> {order.notes}
                  </p>
                )}

                {/* Ações rápidas */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleChangeStatus(order.id, 'PREPARING')}
                        className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Aceitar / Preparar
                      </button>
                    )}
                    {order.deliveryType === 'DELIVERY' &&
                      (order.status === 'PENDING' ||
                        order.status === 'PREPARING') && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleChangeStatus(order.id, 'OUT_FOR_DELIVERY')
                          }
                          className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-60"
                        >
                          Saiu p/ entrega
                        </button>
                      )}
                    {order.status !== 'COMPLETED' &&
                      order.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleChangeStatus(order.id, 'COMPLETED')
                          }
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {order.deliveryType === 'PICKUP'
                            ? 'Pronto p/ retirada'
                            : 'Concluir'}
                        </button>
                      )}
                    {order.status !== 'CANCELLED' &&
                      order.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => {
                            if (
                              order.paymentChannel === 'MERCADO_PAGO' &&
                              order.paymentStatus === 'PAID'
                            ) {
                              setConfirmPaidCancelOrder(order);
                            } else {
                              void handleChangeStatus(order.id, 'CANCELLED');
                            }
                          }}
                          className="cursor-pointer rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={buildWhatsAppStatusUrl(order, storeName)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chamar no WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(order)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir Cupom
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmPaidCancelOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setConfirmPaidCancelOrder(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-zinc-900">
              Cancelar pedido #{confirmPaidCancelOrder.orderNumber}?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Este pedido já foi pago online. Ao cancelar aqui na VitriMini,
              lembre-se de fazer o estorno diretamente no seu aplicativo do
              Mercado Pago.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmPaidCancelOrder(null)}
                className="flex-1 cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={updatingId === confirmPaidCancelOrder.id}
                onClick={() => {
                  const targetId = confirmPaidCancelOrder.id;
                  setConfirmPaidCancelOrder(null);
                  void handleChangeStatus(targetId, 'CANCELLED');
                }}
                className="flex-1 cursor-pointer rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cupom oculto na tela, visível apenas em @media print */}
      {printOrder && (
        <div id="vitrimini-receipt" className="hidden print:block">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '14px' }}>{storeName}</strong>
            <div>PEDIDO #{printOrder.orderNumber}</div>
            <div>
              {new Date(printOrder.createdAt).toLocaleString('pt-BR')}
            </div>
          </div>
          <hr />
          <div style={{ margin: '6px 0' }}>
            <div>Cliente: {printOrder.customerName}</div>
            <div>Tel: {formatPhoneMask(printOrder.customerPhone)}</div>
            <div>
              Tipo:{' '}
              {printOrder.deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada'}
            </div>
            {printOrder.deliveryDate && <div>Data: {printOrder.deliveryDate}</div>}
            {printOrder.deliveryAddress && (
              <div>End: {printOrder.deliveryAddress}</div>
            )}
            <div>
              Pgto:{' '}
              {PAYMENT_LABELS[printOrder.paymentMethod] ||
                printOrder.paymentMethod}
            </div>
          </div>
          <hr />
          <div style={{ margin: '6px 0' }}>
            {printOrder.items.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <span>
                  {item.quantity}x {item.productName}
                </span>
                <span>
                  {formatCurrency(item.unitPriceCents * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <hr />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              marginTop: '6px',
            }}
          >
            <span>TOTAL</span>
            <span>{formatCurrency(printOrder.totalCents)}</span>
          </div>
          {printOrder.notes && (
            <div style={{ marginTop: '6px' }}>Obs: {printOrder.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
