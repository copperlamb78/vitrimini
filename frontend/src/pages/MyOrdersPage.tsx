import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ExternalLink,
  LogOut,
  Store,
  RefreshCw,
  Clock,
  ChefHat,
  Truck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { MyCustomerOrder, OrderStatus } from '../types/catalog';
import { getMyOrders, getSafeErrorMessage } from '../services/api';
import { formatCurrency, resolveImageUrl } from '../utils/format';
import { getStoreInitials, getTheme } from '../constants/themes';
import { applyPageSeo } from '../utils/seo';
import { MyOrdersSkeleton } from '../components/Skeletons';
import logoVitriMini from '../assets/logo-vitrimini.png';

const STATUS_BADGE: Record<
  OrderStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: {
    label: 'Recebido',
    className: 'bg-amber-100 text-amber-800',
    icon: Clock,
  },
  PREPARING: {
    label: 'Em preparo',
    className: 'bg-blue-100 text-blue-800',
    icon: ChefHat,
  },
  OUT_FOR_DELIVERY: {
    label: 'Saiu p/ entrega',
    className: 'bg-purple-100 text-purple-800',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

export function MyOrdersPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<MyCustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyOrders();
      setOrders(res.orders);
    } catch (err) {
      setError(getSafeErrorMessage(err, 'Erro ao carregar seus pedidos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyPageSeo({
      title: 'Meus Pedidos — VitriMini',
      description: 'Acompanhe os pedidos feitos na VitriMini.',
      canonicalPath: '/meus-pedidos',
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOrders([]);
      navigate('/entrar?redirect=/meus-pedidos', { replace: true });
      return;
    }
    void loadOrders();
  }, [authLoading, user, navigate, loadOrders]);

  if (authLoading || (loading && orders.length === 0)) {
    return <MyOrdersSkeleton />;
  }

  const firstName = user?.name.split(' ')[0] || 'Cliente';

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoVitriMini}
              alt="Logo da VitriMini"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-semibold text-zinc-600 sm:inline">
              Olá, <strong className="text-zinc-900">{firstName}</strong>
            </span>

            <Link
              to="/minhas-vitrines"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
            >
              <Store className="h-3.5 w-3.5 text-[#E11D48]" />
              Minhas Vitrines
            </Link>

            <button
              type="button"
              onClick={() => {
                setOrders([]);
                logout();
                navigate('/');
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-4xl px-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
              Meus Pedidos ({orders.length})
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              Acompanhe suas encomendas feitas com esta conta em qualquer vitrine.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#E11D48]">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-extrabold text-zinc-900">
              Você ainda não fez nenhum pedido
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">
              Quando você fizer uma encomenda em qualquer vitrine usando esta conta, ela aparecerá aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {orders.map((order) => {
              const theme = getTheme(order.catalog.themeColor);
              const logoSrc = resolveImageUrl(order.catalog.logoUrl);
              const initials = getStoreInitials(order.catalog.storeName);
              const badge = STATUS_BADGE[order.status];
              const StatusIcon = badge.icon;
              const statusLabel =
                order.status === 'COMPLETED' && order.deliveryType === 'PICKUP'
                  ? 'Pronto p/ retirada'
                  : badge.label;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs transition hover:border-zinc-300 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={`Logo da vitrine ${order.catalog.storeName}`}
                          loading="lazy"
                          decoding="async"
                          className="h-11 w-11 shrink-0 rounded-full border border-zinc-200 object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-black ${theme.avatarFallbackBg} ${theme.avatarFallbackText}`}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-sm font-extrabold text-zinc-900">
                            {order.catalog.storeName}
                          </h2>
                          <span className="shrink-0 text-xs font-bold text-zinc-400">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          {new Date(order.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusLabel}
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900">
                        {formatCurrency(order.totalCents)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 truncate text-xs text-zinc-600">
                    {order.items
                      .map((item) => `${item.quantity}x ${item.productName}`)
                      .join(' • ')}
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                    <Link
                      to={`/c/${order.catalog.slug}`}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                    >
                      Ver vitrine da loja
                    </Link>

                    <Link
                      to={`/pedido/${order.trackingCode}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                    >
                      Acompanhar pedido
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
