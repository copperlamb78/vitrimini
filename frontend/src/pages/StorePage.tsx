import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Info,
  Plus,
  Minus,
  X,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Store,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type {
  Catalog,
  CreateOrderResponse,
  OrderPaymentChannel,
  OrderPaymentMethod,
} from '../types/catalog';
import { getStoreInitials } from '../constants/themes';
import {
  getNichePatternStyle,
  hexToRgba,
  resolveStoreTheme,
} from '../utils/storeTheme';
import { ThemedButton } from '../components/ThemedButton';
import {
  createStoreOrder,
  getPublicStore,
  getSafeErrorMessage,
  trackPublicOrder,
} from '../services/api';
import {
  formatCurrency,
  formatPhoneMask,
  isValidBrazilianPhone,
  phoneToDDI,
  resolveImageUrl,
  safeRedirect,
} from '../utils/format';
import { applyPageSeo } from '../utils/seo';
import { filterActiveDeliverySlots } from '../utils/deliverySchedule';
import { StorePageSkeleton } from '../components/Skeletons';
import { AuthModal } from '../components/AuthModal';
import logoVitriMini from '../assets/logo-vitrimini.png';
import logoIcon from '../assets/logo-icon.png';

export function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const { user } = useAuth();

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [stockAlert, setStockAlert] = useState<string | null>(null);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>(
    'pickup'
  );
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>('PIX');
  const [paymentChannel, setPaymentChannel] =
    useState<OrderPaymentChannel>('WHATSAPP');
  const [onlinePaid, setOnlinePaid] = useState(false);
  const [copiedOnlinePix, setCopiedOnlinePix] = useState(false);
  const [address, setAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const wasLoggedInRef = useRef(false);

  useEffect(() => {
    if (!user) {
      if (wasLoggedInRef.current) {
        wasLoggedInRef.current = false;
        setCustomerName('');
        setCustomerPhone('');
      }
      return;
    }
    wasLoggedInRef.current = true;
    setCustomerName((prev) => prev || user.name || '');
    if (user.phone) {
      setCustomerPhone((prev) => prev || formatPhoneMask(user.phone || ''));
    }
  }, [user]);
  const [createdOrder, setCreatedOrder] = useState<{
    order: CreateOrderResponse;
    whatsappUrl: string;
  } | null>(null);
  const [copiedTrack, setCopiedTrack] = useState(false);

  useEffect(() => {
    const order = createdOrder?.order;
    if (
      !order ||
      order.paymentChannel !== 'MERCADO_PAGO' ||
      onlinePaid ||
      order.paymentStatus === 'PAID'
    ) {
      if (order?.paymentStatus === 'PAID') setOnlinePaid(true);
      return;
    }

    const timer = setInterval(() => {
      void trackPublicOrder(order.trackingCode)
        .then((res) => {
          if (res.paymentStatus === 'PAID') {
            setOnlinePaid(true);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(timer);
  }, [createdOrder, onlinePaid]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getPublicStore(slug, isPreview)
      .then((data) => {
        setCatalog(data);
        setPaymentChannel(
          data.onlinePaymentAvailable ? 'MERCADO_PAGO' : 'WHATSAPP'
        );

        const storeDescription =
          data.notes?.trim().slice(0, 155) ||
          `Confira os produtos de ${data.storeName} e faça sua encomenda online direto pelo WhatsApp.`;
        const firstProductImg = data.products.find((p) => p.imageUrl)?.imageUrl;
        const ogImage =
          resolveImageUrl(data.logoUrl) ||
          resolveImageUrl(firstProductImg) ||
          'https://vitrimini.com.br/og-cover.png';

        applyPageSeo({
          title: `${data.storeName} — Vitrine de Encomendas | VitriMini`,
          description: storeDescription,
          canonicalPath: `/c/${data.slug}`,
          ogImage,
          noindex: isPreview && data.status !== 'ACTIVE',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: data.storeName,
            description: storeDescription,
            url: `https://vitrimini.com.br/c/${data.slug}`,
            image: ogImage,
            makesOffer: data.products.slice(0, 20).map((p) => ({
              '@type': 'Offer',
              priceCurrency: 'BRL',
              price: (p.priceCents / 100).toFixed(2),
              availability: p.available
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              itemOffered: {
                '@type': 'Product',
                name: p.name,
                ...(p.description ? { description: p.description } : {}),
                ...(p.imageUrl ? { image: p.imageUrl } : {}),
              },
            })),
          },
        });

        const activeSlots = filterActiveDeliverySlots(data.deliveryDates);
        if (activeSlots.length > 0) {
          setSelectedDate(activeSlots[0]);
        } else if (data.deliveryDates.length > 0) {
          setSelectedDate('A combinar com a loja');
        }
      })
      .catch((err) => {
        setError(
          getSafeErrorMessage(
            err,
            'Vitrine não encontrada ou indisponível no momento.'
          )
        );
      })
      .finally(() => setLoading(false));
  }, [slug, isPreview]);

  function updateQty(productId: string, delta: number) {
    setCart((prev) => {
      const nextQty = (prev[productId] || 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: nextQty };
    });
  }

  const cartSummary = useMemo(() => {
    if (!catalog) return { count: 0, totalCents: 0, items: [] };
    const items = catalog.products
      .filter((p) => (cart[p.id] || 0) > 0 && p.available)
      .map((p) => ({
        product: p,
        qty: cart[p.id],
        subtotalCents: p.priceCents * cart[p.id],
      }));

    const count = items.reduce((acc, item) => acc + item.qty, 0);
    const totalCents = items.reduce((acc, item) => acc + item.subtotalCents, 0);
    return { count, totalCents, items };
  }, [catalog, cart]);

  const depositCents = useMemo(() => {
    if (!catalog || catalog.depositPct <= 0) return 0;
    return Math.round((cartSummary.totalCents * catalog.depositPct) / 100);
  }, [catalog, cartSummary.totalCents]);

  const minOrderCents = catalog?.minOrderCents ?? 0;
  const missingForMinOrder =
    minOrderCents > 0 ? Math.max(0, minOrderCents - cartSummary.totalCents) : 0;
  const belowMinOrder = missingForMinOrder > 0;
  const belowMpMin = cartSummary.totalCents < 100;

  async function handleCopyPixKey() {
    if (!catalog?.pixKey) return;
    await navigator.clipboard.writeText(catalog.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  }

  async function verifyCartStockBeforeProceed(): Promise<boolean> {
    if (!slug || !catalog) return false;
    setCheckingStock(true);
    setStockAlert(null);

    try {
      const freshCatalog = await getPublicStore(slug, isPreview);
      setCatalog(freshCatalog);

      const soldOutNames: string[] = [];
      const nextCart: Record<string, number> = {};

      for (const [prodId, qty] of Object.entries(cart)) {
        if (qty <= 0) continue;
        const freshProd = freshCatalog.products.find((p) => p.id === prodId);
        if (!freshProd || !freshProd.available) {
          const oldProd = catalog.products.find((p) => p.id === prodId);
          soldOutNames.push(freshProd?.name || oldProd?.name || 'Produto');
        } else {
          nextCart[prodId] = qty;
        }
      }

      if (soldOutNames.length > 0) {
        setCart(nextCart);
        setCheckoutOpen(false);
        setStockAlert(
          soldOutNames.length === 1
            ? `Ops! O item "${soldOutNames[0]}" acabou de esgotar e foi removido do seu carrinho.`
            : `Ops! Os seguintes itens acabaram de esgotar e foram removidos do carrinho: ${soldOutNames.join(', ')}.`
        );
        return false;
      }

      return true;
    } catch {
      // Se houver falha momentânea na rede durante a checagem, permite seguir com os itens locais
      return true;
    } finally {
      setCheckingStock(false);
    }
  }

  async function handleOpenCheckout() {
    if (belowMinOrder) return;
    const ok = await verifyCartStockBeforeProceed();
    if (!ok) return;
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setCheckoutOpen(true);
  }

  const activeDeliveryDates = useMemo(
    () => (catalog ? filterActiveDeliverySlots(catalog.deliveryDates) : []),
    [catalog]
  );

  async function handleSendWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (!catalog || cartSummary.items.length === 0) return;
    if (!user) {
      setCheckoutOpen(false);
      setAuthModalOpen(true);
      return;
    }

    setOrderError(null);
    if (!isValidBrazilianPhone(customerPhone)) {
      setOrderError('Informe um WhatsApp válido com DDD: (99) 99999-9999.');
      return;
    }

    const ok = await verifyCartStockBeforeProceed();
    if (!ok) return;

    setSubmittingOrder(true);
    try {
      const chosenDate =
        activeDeliveryDates.length > 0 && selectedDate
          ? selectedDate
          : catalog.deliveryDates.length > 0
            ? 'A combinar com a loja'
            : preferredSchedule.trim() || null;

      const effectivePaymentChannel: OrderPaymentChannel =
        catalog.onlinePaymentAvailable && !belowMpMin
          ? paymentChannel
          : 'WHATSAPP';
      const effectivePaymentMethod: OrderPaymentMethod =
        catalog.onlinePaymentAvailable
          ? effectivePaymentChannel === 'MERCADO_PAGO'
            ? 'CARD'
            : 'OTHER'
          : paymentMethod;

      const orderRes = await createStoreOrder(catalog.slug, {
        customerName: customerName.trim(),
        customerPhone: phoneToDDI(customerPhone),
        deliveryType: fulfillmentType === 'delivery' ? 'DELIVERY' : 'PICKUP',
        deliveryAddress:
          fulfillmentType === 'delivery' ? address.trim() : null,
        deliveryDate: chosenDate,
        paymentMethod: effectivePaymentMethod,
        paymentChannel: effectivePaymentChannel,
        notes: customerNotes.trim() || null,
        items: cartSummary.items.map((item) => ({
          productId: item.product.id,
          quantity: item.qty,
        })),
      });

      const paymentLabelMap: Record<OrderPaymentMethod, string> = {
        PIX: 'Pix',
        CARD: 'Cartão',
        CASH: 'Dinheiro',
        OTHER: 'Outro',
      };

      const lines: string[] = [
        `Olá *${catalog.storeName}*! Fiz o *Pedido #${orderRes.orderNumber}* pela sua *VitriMini*:`,
        '',
        `*Cliente:* ${customerName.trim()}`,
      ];

      if (chosenDate) {
        lines.push(`*Data/Turno:* ${chosenDate}`);
      }

      lines.push(
        fulfillmentType === 'delivery'
          ? `*Recebimento:* Entrega — ${address.trim()}`
          : `*Recebimento:* Retirada no local`
      );
      lines.push(
        `*Pagamento:* ${
          catalog.onlinePaymentAvailable && effectivePaymentChannel === 'WHATSAPP'
            ? 'A combinar no WhatsApp'
            : paymentLabelMap[effectivePaymentMethod]
        }`
      );

      lines.push('', '*Itens do Pedido:*');
      for (const item of cartSummary.items) {
        lines.push(
          `• ${item.qty}x ${item.product.name} (${formatCurrency(item.subtotalCents)})`
        );
      }

      lines.push('', `*Total:* ${formatCurrency(orderRes.totalCents)}`);

      if (catalog.depositPct > 0) {
        lines.push(
          `*Pagamento no pedido (${catalog.depositPct}%):* ${formatCurrency(Math.round((orderRes.totalCents * catalog.depositPct) / 100))}`
        );
      }

      if (customerNotes.trim()) {
        lines.push('', `*Observações:* ${customerNotes.trim()}`);
      }

      lines.push('', `*Acompanhar pedido:* ${orderRes.trackingUrl}`);

      const whatsappUrl = `https://wa.me/${catalog.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
      setOnlinePaid(orderRes.paymentStatus === 'PAID');
      setCart({});
      if (orderRes.paymentChannel === 'MERCADO_PAGO' && orderRes.mpCheckoutUrl) {
        if (!safeRedirect(orderRes.mpCheckoutUrl)) {
          setOrderError(
            'Não foi possível abrir a página de pagamento com segurança. Tente novamente.'
          );
        }
        return;
      }
      setCreatedOrder({ order: orderRes, whatsappUrl });
      if (orderRes.paymentChannel !== 'MERCADO_PAGO') {
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      setOrderError(
        getSafeErrorMessage(
          err,
          'Não foi possível registrar seu pedido agora. Tente novamente.'
        )
      );
    } finally {
      setSubmittingOrder(false);
    }
  }

  if (loading) {
    return <StorePageSkeleton />;
  }

  if (error || !catalog) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <img
          src={logoVitriMini}
          alt="Logo da VitriMini"
          className="mb-5 h-9 w-auto object-contain"
        />
        <AlertCircle className="h-10 w-10 text-stone-400" />
        <h1 className="mt-3 text-lg font-bold text-stone-900">
          Vitrine indisponível
        </h1>
        <p className="mt-1 max-w-sm text-sm text-stone-500">
          {error || 'Verifique o endereço ou entre em contato com o vendedor.'}
        </p>
        <Link
          to="/"
          className="mt-5 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Criar vitrine
        </Link>
      </div>
    );
  }

  const resolvedTheme = resolveStoreTheme(
    catalog.themeColor,
    catalog.storeAppearance
  );
  const nichePatternStyle = getNichePatternStyle(
    resolvedTheme.nichePreset,
    resolvedTheme.primaryColor,
    resolvedTheme.isDark
  );
  const logoSrc = resolveImageUrl(catalog.logoUrl);
  const initials = getStoreInitials(catalog.storeName);

  return (
    <div
      style={{
        ...resolvedTheme.cssVars,
        backgroundColor: resolvedTheme.bgColor,
        color: resolvedTheme.textColor,
      }}
      className="relative min-h-screen pb-28"
    >
      {nichePatternStyle && (
        <div
          aria-hidden="true"
          style={nichePatternStyle}
          className="pointer-events-none absolute inset-0"
        />
      )}

      {isPreview && catalog.status !== 'ACTIVE' && (
        <div className="relative z-10 bg-amber-500 px-4 py-1.5 text-center text-xs font-bold text-white">
          MODO PRÉVIA DE DEMONSTRAÇÃO — Vitrine ainda não publicada
        </div>
      )}

      {/* Header com Logo Circular ou Avatar de Iniciais */}
      <header
        style={{
          background: `linear-gradient(135deg, ${resolvedTheme.primaryColor} 0%, ${hexToRgba(resolvedTheme.primaryColor, 0.85)} 100%)`,
          color: resolvedTheme.textOnPrimary,
        }}
        className="relative z-10"
      >
        <div className="mx-auto max-w-xl px-4 py-7">
          {user && (
            <div className="mb-3 flex justify-end">
              <Link
                to="/meus-pedidos"
                style={{
                  backgroundColor: hexToRgba(resolvedTheme.textOnPrimary, 0.16),
                  color: resolvedTheme.textOnPrimary,
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-xs transition hover:opacity-90"
              >
                <ShoppingBag className="h-3 w-3" />
                Meus Pedidos
              </Link>
            </div>
          )}
          <div className="flex items-center gap-4">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={`Logo da vitrine ${catalog.storeName}`}
                decoding="async"
                fetchPriority="high"
                className="h-16 w-16 shrink-0 rounded-full border-2 border-white/90 bg-white object-cover shadow-lg"
              />
            ) : (
              <div
                style={{
                  backgroundColor: resolvedTheme.surfaceColor,
                  color: resolvedTheme.primaryColor,
                }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/90 shadow-lg"
              >
                <span className="text-lg font-black tracking-tight">
                  {initials}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
                {catalog.storeName}
              </h1>
              {catalog.paymentNotice?.trim() && (
                <p
                  style={{ color: hexToRgba(resolvedTheme.textOnPrimary, 0.9) }}
                  className="mt-0.5 text-xs"
                >
                  {catalog.paymentNotice}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-xl space-y-4 px-4 py-5">
        {/* Datas disponíveis (somente não vencidas) */}
        {activeDeliveryDates.length > 0 && (
          <div
            style={{
              backgroundColor: resolvedTheme.surfaceColor,
              borderColor: resolvedTheme.borderColor,
            }}
            className={`${resolvedTheme.radiusClass} border p-4 shadow-2xs`}
          >
            <div
              style={{ color: resolvedTheme.textMutedColor }}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
            >
              <Calendar
                style={{ color: resolvedTheme.outlineColor }}
                className="h-4 w-4"
              />
              Datas e turnos disponíveis
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {activeDeliveryDates.map((date, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: hexToRgba(
                      resolvedTheme.primaryColor,
                      resolvedTheme.isDark ? 0.2 : 0.1
                    ),
                    color: resolvedTheme.isDark
                      ? '#FAFAFA'
                      : resolvedTheme.outlineColor,
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                >
                  {date}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Avisos */}
        {catalog.notes && (
          <div
            className={`flex items-start gap-2.5 ${resolvedTheme.radiusClass} border p-4 text-sm ${
              resolvedTheme.isDark
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <Info
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                resolvedTheme.isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            />
            <p className="whitespace-pre-line text-xs leading-relaxed">
              {catalog.notes}
            </p>
          </div>
        )}

        {(catalog.minOrderCents ?? 0) > 0 && (
          <div
            style={{
              backgroundColor: resolvedTheme.surfaceColor,
              borderColor: resolvedTheme.borderColor,
              color: resolvedTheme.textMutedColor,
            }}
            className={`flex items-center gap-2 ${resolvedTheme.radiusClass} border px-3.5 py-2.5 text-xs shadow-2xs`}
          >
            <ShoppingBag
              style={{ color: resolvedTheme.outlineColor }}
              className="h-3.5 w-3.5 shrink-0"
            />
            <span>
              Pedido mínimo:{' '}
              <strong
                style={{ color: resolvedTheme.textColor }}
                className="font-bold"
              >
                {formatCurrency(catalog.minOrderCents!)}
              </strong>
            </span>
          </div>
        )}

        {/* Alerta de item esgotado durante a compra */}
        {stockAlert && (
          <div className="flex items-start justify-between gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{stockAlert}</span>
            </div>
            <button
              type="button"
              onClick={() => setStockAlert(null)}
              aria-label="Fechar aviso"
              className="rounded-full p-0.5 text-red-500 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Lista de Produtos */}
        <section className="space-y-3">
          <h2
            style={{ color: resolvedTheme.textMutedColor }}
            className="text-xs font-bold uppercase tracking-wider"
          >
            Produtos para Encomenda
          </h2>

          {catalog.products.map((product) => {
            const qty = cart[product.id] || 0;
            const imgSrc = resolveImageUrl(product.imageUrl);

            return (
              <div
                key={product.id}
                style={{
                  backgroundColor: resolvedTheme.surfaceColor,
                  borderColor: resolvedTheme.borderColor,
                }}
                className={`flex gap-3 ${resolvedTheme.radiusClass} border p-3.5 shadow-2xs transition ${
                  product.available ? '' : 'opacity-75'
                }`}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={`${product.name} — ${catalog.storeName}`}
                      loading="lazy"
                      decoding="async"
                      className={`h-full w-full object-cover ${
                        product.available ? '' : 'grayscale'
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
                      Sem foto
                    </div>
                  )}
                  {!product.available && (
                    <span className="absolute inset-x-0 bottom-0 bg-stone-900/85 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
                      Esgotado
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        style={{ color: resolvedTheme.textColor }}
                        className="font-bold"
                      >
                        {product.name}
                      </h3>
                      {!product.available && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
                          Esgotado
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p
                        style={{ color: resolvedTheme.textMutedColor }}
                        className="mt-0.5 line-clamp-2 text-xs"
                      >
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span
                      style={{
                        color: product.available
                          ? resolvedTheme.textColor
                          : resolvedTheme.textMutedColor,
                      }}
                      className="text-base font-extrabold"
                    >
                      {formatCurrency(product.priceCents)}
                    </span>

                    {product.available ? (
                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <div
                            style={{
                              backgroundColor: resolvedTheme.bgColor,
                              borderColor: resolvedTheme.borderColor,
                            }}
                            className="flex items-center gap-2 rounded-full border px-1.5 py-1"
                          >
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, -1)}
                              aria-label="Diminuir quantidade"
                              style={{
                                backgroundColor: resolvedTheme.surfaceColor,
                                color: resolvedTheme.textColor,
                              }}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full shadow-2xs transition hover:opacity-80"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span
                              style={{ color: resolvedTheme.textColor }}
                              className="min-w-4 text-center text-sm font-bold"
                            >
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, 1)}
                              aria-label="Aumentar quantidade"
                              style={{
                                backgroundColor: resolvedTheme.primaryColor,
                                color: resolvedTheme.textOnPrimary,
                              }}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full shadow-2xs transition hover:brightness-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <ThemedButton
                            type="button"
                            resolvedTheme={resolvedTheme}
                            onClick={() => updateQty(product.id, 1)}
                            className="!min-h-[34px] !px-3.5 !py-1.5 text-xs font-bold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                          </ThemedButton>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-full bg-stone-200 px-3.5 py-1.5 text-xs font-bold text-stone-500"
                      >
                        Indisponível
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Assinatura Viral VitriMini */}
        <footer className="pt-6 text-center">
          <a
            href="https://vitrimini.com.br"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: resolvedTheme.surfaceColor,
              borderColor: resolvedTheme.borderColor,
              color: resolvedTheme.textMutedColor,
            }}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs shadow-2xs transition hover:opacity-90"
          >
            <img
              src={logoIcon}
              alt=""
              className="h-4 w-4 object-contain"
            />
            <span>
              Vitrine digital criada com{' '}
              <strong style={{ color: resolvedTheme.textColor }} className="font-bold">
                VitriMini
              </strong>
            </span>
          </a>
        </footer>
      </main>

      {/* Barra Fixa Inferior do Carrinho */}
      {cartSummary.count > 0 && (
        <div
          style={{
            backgroundColor: hexToRgba(resolvedTheme.surfaceColor, 0.95),
            borderColor: resolvedTheme.borderColor,
          }}
          className="fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 backdrop-blur-xs"
        >
          {belowMinOrder && (
            <div className="mx-auto mb-2 max-w-xl rounded-lg bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-800">
              Adicione mais{' '}
              <strong>{formatCurrency(missingForMinOrder)}</strong> para atingir
              o pedido mínimo ({formatCurrency(minOrderCents)})
            </div>
          )}
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <p
                style={{ color: resolvedTheme.textMutedColor }}
                className="text-xs font-medium"
              >
                {cartSummary.count}{' '}
                {cartSummary.count === 1
                  ? 'item selecionado'
                  : 'itens selecionados'}
              </p>
              <p
                style={{ color: resolvedTheme.textColor }}
                className="text-lg font-extrabold"
              >
                {formatCurrency(cartSummary.totalCents)}
              </p>
            </div>
            <ThemedButton
              type="button"
              resolvedTheme={resolvedTheme}
              onClick={handleOpenCheckout}
              disabled={checkingStock || belowMinOrder}
              className="px-6 py-3 text-sm font-bold shadow-lg"
            >
              {checkingStock && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalizar Pedido
            </ThemedButton>
          </div>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">
                Finalizar Encomenda
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCheckoutOpen(false);
                  setCreatedOrder(null);
                  setOrderError(null);
                }}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdOrder ? (
              <div className="mt-5 space-y-4 text-center">
                {createdOrder.order.paymentChannel === 'MERCADO_PAGO' &&
                !onlinePaid ? (
                  <>
                    <div>
                      <h3 className="text-lg font-extrabold text-stone-900">
                        Pedido #{createdOrder.order.orderNumber} — Pague para confirmar
                      </h3>
                      <p className="mt-1 text-xs text-stone-500">
                        Total:{' '}
                        <strong>
                          {formatCurrency(createdOrder.order.totalCents)}
                        </strong>
                        . Assim que o pagamento cair, seu pedido é confirmado na hora.
                      </p>
                    </div>

                    {createdOrder.order.mpQrCodeBase64 &&
                      createdOrder.order.mpPixCopyPaste && (
                        <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                          <div className="mx-auto inline-block rounded-xl border border-stone-200 bg-white p-2.5">
                            <img
                              src={createdOrder.order.mpQrCodeBase64}
                              alt={`QR Code Pix do Pedido #${createdOrder.order.orderNumber} em ${catalog.storeName}`}
                              className="h-44 w-44 object-contain"
                            />
                          </div>
                          <ThemedButton
                            type="button"
                            fill="solid"
                            resolvedTheme={resolvedTheme}
                            onClick={async () => {
                              await navigator.clipboard.writeText(
                                createdOrder.order.mpPixCopyPaste || ''
                              );
                              setCopiedOnlinePix(true);
                              setTimeout(() => setCopiedOnlinePix(false), 2000);
                            }}
                            className="w-full py-3 text-xs font-bold shadow-xs"
                          >
                            {copiedOnlinePix ? (
                              <>
                                <Check className="h-4 w-4" />
                                Código Pix copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                Copiar código Pix
                              </>
                            )}
                          </ThemedButton>
                          <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-stone-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Aguardando confirmação automática...
                          </p>
                        </div>
                      )}

                    {createdOrder.order.mpCheckoutUrl && (
                      <ThemedButton
                        href={createdOrder.order.mpCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        fill="solid"
                        resolvedTheme={resolvedTheme}
                        className="w-full py-3.5 text-sm font-bold shadow-lg"
                      >
                        Pagar com Cartão no Mercado Pago
                      </ThemedButton>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-stone-900">
                        {onlinePaid
                          ? `Pagamento confirmado! Pedido #${createdOrder.order.orderNumber}`
                          : `Pedido #${createdOrder.order.orderNumber} registrado!`}
                      </h3>
                      <p className="mt-1 text-xs text-stone-500">
                        {onlinePaid
                          ? 'Seu pagamento foi aprovado e a loja já recebeu seu pedido.'
                          : 'Acompanhe o status em tempo real pelo link abaixo ou conclua o envio no WhatsApp da loja.'}
                      </p>
                    </div>
                  </>
                )}

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
                    Link de acompanhamento
                  </p>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-stone-800">
                    {createdOrder.order.trackingUrl}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          createdOrder.order.trackingUrl
                        );
                        setCopiedTrack(true);
                        setTimeout(() => setCopiedTrack(false), 2000);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100"
                    >
                      {copiedTrack ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar link
                        </>
                      )}
                    </button>
                    <Link
                      to={`/pedido/${createdOrder.order.trackingCode}`}
                      className="flex flex-1 items-center justify-center rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800"
                    >
                      Acompanhar pedido
                    </Link>
                  </div>
                </div>

                <a
                  href={createdOrder.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700"
                >
                  <MessageCircle className="h-5 w-5" />
                  Abrir WhatsApp da Loja
                </a>
              </div>
            ) : (
            <form onSubmit={handleSendWhatsApp} className="mt-4 space-y-4">
              {user && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800">
                  <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>
                    Pedido salvo na sua conta (<strong>{user.name.split(' ')[0]}</strong>)
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Como devemos te chamar?"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  WhatsApp (com DDD) *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  required
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(formatPhoneMask(e.target.value))
                  }
                  placeholder="(75) 99999-9999"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                />
              </div>

              {catalog.onlinePaymentAvailable ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Como deseja pagar?
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={belowMpMin}
                      onClick={() => setPaymentChannel('MERCADO_PAGO')}
                      style={
                        !belowMpMin && paymentChannel === 'MERCADO_PAGO'
                          ? {
                              borderColor: resolvedTheme.primaryColor,
                              backgroundColor: hexToRgba(resolvedTheme.primaryColor, 0.08),
                              color: '#18181B',
                            }
                          : undefined
                      }
                      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                        belowMpMin
                          ? 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400'
                          : paymentChannel === 'MERCADO_PAGO'
                            ? 'cursor-pointer'
                            : 'cursor-pointer border-stone-200 text-stone-600'
                      }`}
                    >
                      Pagar agora (Pix ou Cartão)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentChannel('WHATSAPP')}
                      style={
                        belowMpMin || paymentChannel === 'WHATSAPP'
                          ? {
                              borderColor: resolvedTheme.primaryColor,
                              backgroundColor: hexToRgba(resolvedTheme.primaryColor, 0.08),
                              color: '#18181B',
                            }
                          : undefined
                      }
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                        belowMpMin || paymentChannel === 'WHATSAPP'
                          ? ''
                          : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      Combinar no WhatsApp
                    </button>
                  </div>
                  {belowMpMin && (
                    <p className="mt-1.5 text-[11px] text-stone-500">
                      Pagamento online disponível para pedidos a partir de R$ 1,00.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Forma de Pagamento
                  </label>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'PIX', label: 'Pix' },
                        { id: 'CARD', label: 'Cartão' },
                        { id: 'CASH', label: 'Dinheiro' },
                        { id: 'OTHER', label: 'Outro' },
                      ] as const
                    ).map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        style={
                          paymentMethod === pm.id
                            ? {
                                borderColor: resolvedTheme.primaryColor,
                                backgroundColor: hexToRgba(resolvedTheme.primaryColor, 0.08),
                                color: '#18181B',
                              }
                            : undefined
                        }
                        className={`cursor-pointer rounded-xl border py-2 text-xs font-bold transition ${
                          paymentMethod === pm.id
                            ? ''
                            : 'border-stone-200 text-stone-600'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleção Visual de Datas/Turnos em Grade (Pills) ou Fallback Opcional */}
              {activeDeliveryDates.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Escolha a Data / Turno *
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {activeDeliveryDates.map((date) => {
                      const isSelected = selectedDate === date;
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          style={
                            isSelected
                              ? {
                                  borderColor: resolvedTheme.primaryColor,
                                  backgroundColor: hexToRgba(resolvedTheme.primaryColor, 0.08),
                                  color: '#18181B',
                                }
                              : undefined
                          }
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition ${
                            isSelected
                              ? 'ring-1 ring-current'
                              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span className="truncate">{date}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : catalog.deliveryDates.length > 0 ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
                  <strong className="font-semibold text-stone-800">
                    Data / Turno:
                  </strong>{' '}
                  A combinar com a loja
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Preferência de data/horário (opcional)
                  </label>
                  <input
                    type="text"
                    value={preferredSchedule}
                    onChange={(e) => setPreferredSchedule(e.target.value)}
                    placeholder="Ex: Sexta-feira à tarde"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Forma de Recebimento
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('pickup')}
                    style={
                      fulfillmentType === 'pickup'
                        ? {
                            borderColor: resolvedTheme.primaryColor,
                            backgroundColor: hexToRgba(resolvedTheme.primaryColor, 0.08),
                            color: '#18181B',
                          }
                        : undefined
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                      fulfillmentType === 'pickup'
                        ? ''
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Store className="h-4 w-4" />
                    Retirada
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    style={
                      fulfillmentType === 'delivery'
                        ? {
                            borderColor: resolvedTheme.primaryColor,
                            backgroundColor: hexToRgba(resolvedTheme.primaryColor, 0.08),
                            color: '#18181B',
                          }
                        : undefined
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                      fulfillmentType === 'delivery'
                        ? ''
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    Entrega
                  </button>
                </div>
              </div>

              {fulfillmentType === 'delivery' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Endereço completo para entrega *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro e ponto de referência"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Ex: Sem passas, escrita no bolo..."
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              {/* Resumo Financeiro + Pix */}
              <div className="space-y-2 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Valor Total</span>
                  <span className="font-bold text-stone-900">
                    {formatCurrency(cartSummary.totalCents)}
                  </span>
                </div>

                {!catalog.onlinePaymentAvailable && catalog.depositPct > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-stone-700">
                      Valor antecipado ({catalog.depositPct}%)
                    </span>
                    <span className="text-base font-extrabold text-stone-900">
                      {formatCurrency(depositCents)}
                    </span>
                  </div>
                )}

                {!catalog.onlinePaymentAvailable && catalog.pixKey && (
                  <div className="mt-2 border-t border-stone-200 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Chave Pix da Loja
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
                      <span className="truncate text-xs font-mono text-stone-800">
                        {catalog.pixKey}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPixKey}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-stone-800"
                      >
                        {copiedPix ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copiar Pix
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {orderError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {orderError}
                </div>
              )}

              <ThemedButton
                type="submit"
                fill="solid"
                resolvedTheme={resolvedTheme}
                disabled={submittingOrder}
                className="w-full py-3.5 text-sm font-bold shadow-lg"
              >
                {submittingOrder ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
                {submittingOrder
                  ? 'Registrando pedido...'
                  : 'Confirmar e Enviar no WhatsApp'}
              </ThemedButton>
            </form>
            )}
          </div>
        </div>
      )}

      {authModalOpen && (
        <AuthModal
          initialTab="register"
          defaultPhone={customerPhone}
          headline="Crie sua conta rápida para finalizar seu pedido"
          subheadline="É só nome, WhatsApp, e-mail e senha. Assim você acompanha seus pedidos com segurança."
          onClose={() => setAuthModalOpen(false)}
          onSuccess={(auth) => {
            if (!customerName.trim() && auth.user.name) {
              setCustomerName(auth.user.name);
            }
            if (!customerPhone.trim() && auth.user.phone) {
              setCustomerPhone(formatPhoneMask(auth.user.phone));
            }
            setAuthModalOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}
    </div>
  );
}
