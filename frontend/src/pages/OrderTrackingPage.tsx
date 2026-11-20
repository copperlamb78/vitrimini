import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Truck,
  XCircle,
  RefreshCw,
  AlertCircle,
  Store,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import type { OrderStatus, PublicTrackedOrder } from '../types/catalog';
import { getSafeErrorMessage, trackPublicOrder } from '../services/api';
import { formatCurrency, resolveImageUrl } from '../utils/format';
import { getStoreInitials, getTheme } from '../constants/themes';
import { applyPageSeo } from '../utils/seo';
import { OrderTrackingSkeleton } from '../components/Skeletons';

const DELIVERY_STEPS: Array<{
  status: OrderStatus;
  label: string;
  icon: typeof Clock;
}> = [
  { status: 'PENDING', label: 'Recebido', icon: Clock },
  { status: 'PREPARING', label: 'Em preparo', icon: ChefHat },
  { status: 'OUT_FOR_DELIVERY', label: 'Saiu p/ entrega', icon: Truck },
  { status: 'COMPLETED', label: 'Concluído', icon: CheckCircle2 },
];

const PICKUP_STEPS: Array<{
  status: OrderStatus;
  label: string;
  icon: typeof Clock;
}> = [
  { status: 'PENDING', label: 'Recebido', icon: Clock },
  { status: 'PREPARING', label: 'Em preparo', icon: ChefHat },
  { status: 'COMPLETED', label: 'Pronto p/ retirada', icon: ShoppingBag },
];

const DELIVERY_STATUS_INDEX: Record<OrderStatus, number> = {
  PENDING: 0,
  PREPARING: 1,
  OUT_FOR_DELIVERY: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

const PICKUP_STATUS_INDEX: Record<OrderStatus, number> = {
  PENDING: 0,
  PREPARING: 1,
  OUT_FOR_DELIVERY: 1,
  COMPLETED: 2,
  CANCELLED: -1,
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CASH: 'Dinheiro',
  OTHER: 'Outro',
};

export function OrderTrackingPage() {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const [order, setOrder] = useState<PublicTrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const inFlightRef = useRef(false);
  const lastSignatureRef = useRef<string>('');

  const loadOrder = useCallback(
    async (mode: 'initial' | 'manual' | 'silent' = 'initial') => {
      if (!trackingCode || inFlightRef.current) return;
      inFlightRef.current = true;

      if (mode === 'initial') setLoading(true);
      else if (mode === 'manual') setRefreshing(true);

      if (mode !== 'silent') setError(null);

      try {
        const data = await trackPublicOrder(trackingCode);
        const signature = `${data.status}:${data.updatedAt}`;
        if (mode !== 'silent' || signature !== lastSignatureRef.current) {
          lastSignatureRef.current = signature;
          setOrder(data);
          applyPageSeo({
            title: `Pedido #${data.orderNumber} — ${data.store.storeName}`,
            description: `Acompanhe o status do pedido #${data.orderNumber}.`,
            canonicalPath: `/pedido/${data.trackingCode}`,
            noindex: true,
          });
        }
      } catch (err) {
        if (mode !== 'silent') {
          setError(getSafeErrorMessage(err, 'Pedido não encontrado.'));
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [trackingCode]
  );

  useEffect(() => {
    applyPageSeo({
      title: 'Acompanhar Pedido — VitriMini',
      description: 'Acompanhe o andamento do seu pedido na VitriMini.',
      canonicalPath: '/pedido',
      noindex: true,
    });
    void loadOrder('initial');
  }, [loadOrder]);

  const orderStatus = order?.status;
  const isWaitingOnlinePayment =
    order?.paymentChannel === 'MERCADO_PAGO' &&
    order?.paymentStatus === 'PENDING';

  useEffect(() => {
    if (
      !orderStatus ||
      orderStatus === 'COMPLETED' ||
      orderStatus === 'CANCELLED'
    ) {
      return;
    }

    const pollMs = isWaitingOnlinePayment ? 5_000 : 20_000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadOrder('silent');
      }
    }, pollMs);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadOrder('silent');
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [orderStatus, isWaitingOnlinePayment, loadOrder]);

  if (loading) {
    return <OrderTrackingSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-zinc-400" />
        <h1 className="mt-3 text-lg font-extrabold text-zinc-900">
          Pedido não encontrado
        </h1>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          {error || 'Verifique o código de acompanhamento enviado pela loja.'}
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao início
        </Link>
      </div>
    );
  }

  const theme = getTheme(order.store.themeColor);
  const logoSrc = resolveImageUrl(order.store.logoUrl);
  const initials = getStoreInitials(order.store.storeName);
  const isPickup = order.deliveryType === 'PICKUP';
  const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentIdx = isPickup
    ? PICKUP_STATUS_INDEX[order.status]
    : DELIVERY_STATUS_INDEX[order.status];
  const isCancelled = order.status === 'CANCELLED';

  const whatsappDigits = order.store.whatsapp.replace(/\D/g, '');
  const whatsappHelpUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    `Olá! Gostaria de falar sobre o meu pedido #${order.orderNumber}.`
  )}`;

  async function handleCopyPix() {
    if (!order?.store.pixKey) return;
    await navigator.clipboard.writeText(order.store.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      <header className={`bg-gradient-to-br ${theme.headerGradient} text-white`}>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-6">
          <div className="flex min-w-0 items-center gap-3">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={order.store.storeName}
                className="h-12 w-12 shrink-0 rounded-full border-2 border-white/90 bg-white object-cover"
              />
            ) : (
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-sm font-black ${theme.avatarFallbackBg} ${theme.avatarFallbackText}`}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                Acompanhamento de Pedido
              </p>
              <h1 className="truncate text-lg font-extrabold">
                {order.store.storeName}
              </h1>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-xs">
            #{order.orderNumber}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {/* Card de Status */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900">
                Status do pedido
              </h2>
              {order.paymentChannel === 'MERCADO_PAGO' && (
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    order.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.paymentStatus === 'CANCELLED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.paymentStatus === 'PAID'
                    ? 'Pagamento online aprovado'
                    : order.paymentStatus === 'CANCELLED'
                    ? 'Pagamento não aprovado'
                    : 'Aguardando pagamento online'}
                </span>
              )}
              <p className="text-[11px] text-zinc-500">
                Atualizado em{' '}
                {new Date(order.updatedAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadOrder('manual')}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              Atualizar
            </button>
          </div>

          {isCancelled ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <XCircle className="h-6 w-6 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-bold">Pedido cancelado</p>
                <p className="text-xs text-red-700">
                  Entre em contato com {order.store.storeName} caso tenha alguma dúvida.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`mt-5 grid gap-2 ${
                isPickup ? 'grid-cols-3' : 'grid-cols-4'
              }`}
            >
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const done = idx <= currentIdx;
                const active = idx === currentIdx;
                return (
                  <div
                    key={step.status}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        done
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                      } ${active ? 'ring-4 ring-rose-100' : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`mt-2 text-[11px] font-bold leading-tight ${
                        done ? 'text-zinc-900' : 'text-zinc-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mensagem contextual de entrega em andamento */}
          {!isPickup && order.status === 'OUT_FOR_DELIVERY' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2.5 text-xs font-semibold text-purple-900">
              <Truck className="h-4 w-4 shrink-0 text-purple-600" />
              <span>Seu pedido saiu para entrega e está a caminho!</span>
            </div>
          )}

          {/* Previsão padrão de entrega */}
          {!isPickup && order.store.deliveryEstimate && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Previsão de entrega:{' '}
              <strong className="text-zinc-800">
                {order.store.deliveryEstimate}
              </strong>
            </p>
          )}
        </section>

        {/* Card de Pagamento PIX (quando Pix + Pendente + pixKey configurada) */}
        {order.paymentMethod === 'PIX' &&
          order.status === 'PENDING' &&
          order.store.pixKey && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-2xs">
              <h2 className="text-sm font-extrabold text-zinc-900">
                Pagamento via Pix
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                Copie a chave Pix abaixo e envie o comprovante no WhatsApp da loja.
              </p>

              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5">
                <span className="truncate font-mono text-xs font-semibold text-zinc-800">
                  {order.store.pixKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-800"
                >
                  {copiedPix ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar chave PIX
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

        {/* Card Local de Retirada */}
        {isPickup && order.store.pickupAddress && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-extrabold text-zinc-900">
                Local de retirada
              </h2>
            </div>

            <p className="mt-2 text-xs font-medium text-zinc-700">
              {order.store.pickupAddress}
            </p>

            {order.store.pickupInstructions && (
              <p className="mt-1 text-xs text-zinc-500">
                {order.store.pickupInstructions}
              </p>
            )}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                order.store.pickupAddress
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
            >
              <MapPin className="h-3.5 w-3.5 text-rose-600" />
              Ver no Google Maps
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          </section>
        )}

        {/* Detalhes seguros (LGPD) */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <h2 className="text-sm font-extrabold text-zinc-900">
            Resumo dos itens
          </h2>

          <ul className="mt-3 divide-y divide-zinc-100">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 py-2.5 text-sm"
              >
                <span className="text-zinc-700">
                  <strong className="font-bold text-zinc-900">
                    {item.quantity}x
                  </strong>{' '}
                  {item.productName}
                </span>
                <span className="shrink-0 font-semibold text-zinc-900">
                  {formatCurrency(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3">
            <span className="text-sm font-bold text-zinc-700">Total</span>
            <span className="text-lg font-extrabold text-rose-600">
              {formatCurrency(order.totalCents)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold">
              {order.deliveryType === 'DELIVERY' ? (
                <>
                  <MapPin className="h-3.5 w-3.5 text-rose-600" />
                  Entrega
                </>
              ) : (
                <>
                  <Store className="h-3.5 w-3.5 text-rose-600" />
                  Retirada
                </>
              )}
            </span>
            <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold">
              Pagamento: {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
            </span>
            {order.deliveryDate && (
              <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold">
                {order.deliveryDate}
              </span>
            )}
          </div>
        </section>

        {/* Botão Falar com a loja no WhatsApp */}
        <a
          href={whatsappHelpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Falar com a loja no WhatsApp
        </a>

        <div className="text-center">
          <Link
            to={`/c/${order.store.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-rose-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para a vitrine de {order.store.storeName}
          </Link>
        </div>
      </main>
    </div>
  );
}
