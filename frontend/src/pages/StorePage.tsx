import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import type { Catalog } from '../types/catalog';
import { getStoreInitials, getTheme } from '../constants/themes';
import { getPublicStore, getSafeErrorMessage } from '../services/api';
import { formatCurrency, resolveImageUrl } from '../utils/format';
import logoVitriMini from '../assets/logo-vitrimini.png';
import logoIcon from '../assets/logo-icon.png';

export function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>(
    'pickup'
  );
  const [address, setAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getPublicStore(slug, isPreview)
      .then((data) => {
        setCatalog(data);
        document.title = `${data.storeName} — VitriMini`;
        if (data.deliveryDates.length > 0) {
          setSelectedDate(data.deliveryDates[0]);
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

  async function handleCopyPixKey() {
    if (!catalog?.pixKey) return;
    await navigator.clipboard.writeText(catalog.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  }

  function handleSendWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (!catalog || cartSummary.items.length === 0) return;

    const lines: string[] = [
      `Olá *${catalog.storeName}*! Gostaria de fazer uma encomenda pela sua *VitriMini*:`,
      '',
      `*Cliente:* ${customerName.trim()}`,
    ];

    if (catalog.deliveryDates.length > 0 && selectedDate) {
      lines.push(`*Data/Turno:* ${selectedDate}`);
    } else if (preferredSchedule.trim()) {
      lines.push(`*Preferência de data/horário:* ${preferredSchedule.trim()}`);
    }

    lines.push(
      fulfillmentType === 'delivery'
        ? `*Recebimento:* Entrega — ${address.trim()}`
        : `*Recebimento:* Retirada no local`
    );

    lines.push('', '*Itens do Pedido:*');
    for (const item of cartSummary.items) {
      lines.push(
        `• ${item.qty}x ${item.product.name} (${formatCurrency(item.subtotalCents)})`
      );
    }

    lines.push('', `*Total:* ${formatCurrency(cartSummary.totalCents)}`);

    if (catalog.depositPct > 0) {
      lines.push(
        `*Sinal (${catalog.depositPct}%):* ${formatCurrency(depositCents)}`
      );
    }

    if (customerNotes.trim()) {
      lines.push('', `*Observações:* ${customerNotes.trim()}`);
    }

    const message = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${catalog.whatsapp}?text=${message}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-700" />
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <img
          src={logoVitriMini}
          alt="VitriMini"
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
          Criar minha VitriMini
        </Link>
      </div>
    );
  }

  const theme = getTheme(catalog.themeColor);
  const logoSrc = resolveImageUrl(catalog.logoUrl);
  const initials = getStoreInitials(catalog.storeName);

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {isPreview && catalog.status !== 'ACTIVE' && (
        <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-bold text-white">
          MODO PRÉVIA DE DEMONSTRAÇÃO — Vitrine ainda não publicada
        </div>
      )}

      {/* Header com Logo Circular ou Avatar de Iniciais */}
      <header className={`bg-gradient-to-br ${theme.headerGradient} text-white`}>
        <div className="mx-auto max-w-xl px-4 py-7">
          <div className="flex items-center gap-4">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={catalog.storeName}
                className="h-16 w-16 shrink-0 rounded-full border-2 border-white/90 bg-white object-cover shadow-lg"
              />
            ) : (
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/90 shadow-lg ${theme.avatarFallbackBg} ${theme.avatarFallbackText}`}
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
              <p className="mt-0.5 text-xs text-white/90">
                {catalog.depositPct > 0
                  ? `Encomenda mediante sinal de ${catalog.depositPct}% via Pix`
                  : 'Faça sua encomenda online e envie no WhatsApp'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        {/* Datas disponíveis */}
        {catalog.deliveryDates.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500">
              <Calendar className={`h-4 w-4 ${theme.primaryText}`} />
              Datas e turnos disponíveis
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {catalog.deliveryDates.map((date, idx) => (
                <span
                  key={idx}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${theme.softBg} ${theme.softText}`}
                >
                  {date}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Avisos */}
        {catalog.notes && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="whitespace-pre-line text-xs leading-relaxed">
              {catalog.notes}
            </p>
          </div>
        )}

        {/* Lista de Produtos */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Produtos para Encomenda
          </h2>

          {catalog.products.map((product) => {
            const qty = cart[product.id] || 0;
            const imgSrc = resolveImageUrl(product.imageUrl);

            return (
              <div
                key={product.id}
                className={`flex gap-3 rounded-2xl border bg-white p-3.5 shadow-2xs transition ${
                  product.available
                    ? 'border-stone-200'
                    : 'border-stone-200/70 opacity-65'
                }`}
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={product.name}
                    className="h-24 w-24 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-400">
                    Sem foto
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-stone-900">
                        {product.name}
                      </h3>
                      {!product.available && (
                        <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-0.5 text-[10px] font-bold uppercase text-stone-600">
                          Esgotado
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-extrabold text-stone-900">
                      {formatCurrency(product.priceCents)}
                    </span>

                    {product.available && (
                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, -1)}
                              aria-label="Diminuir quantidade"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-700 shadow-2xs hover:bg-stone-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-4 text-center text-sm font-bold text-stone-900">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, 1)}
                              aria-label="Aumentar quantidade"
                              className={`flex h-7 w-7 items-center justify-center rounded-full shadow-2xs transition ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateQty(product.id, 1)}
                            className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Assinatura Viral VitriMini */}
        <footer className="pt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-200/80 bg-white/80 px-3.5 py-1.5 text-xs text-stone-500 shadow-2xs transition hover:border-stone-300 hover:bg-white hover:text-stone-700"
          >
            <img
              src={logoIcon}
              alt=""
              className="h-4 w-4 object-contain"
            />
            <span>
              Vitrine criada com{' '}
              <strong className="font-bold text-stone-700">VitriMini</strong> — Crie a sua em 2 minutos
            </span>
          </Link>
        </footer>
      </main>

      {/* Barra Fixa Inferior do Carrinho */}
      {cartSummary.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-xs">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-stone-500">
                {cartSummary.count}{' '}
                {cartSummary.count === 1
                  ? 'item selecionado'
                  : 'itens selecionados'}
              </p>
              <p className="text-lg font-extrabold text-stone-900">
                {formatCurrency(cartSummary.totalCents)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className={`rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText} ${theme.shadowColor}`}
            >
              Finalizar Pedido
            </button>
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
                onClick={() => setCheckoutOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Seu Nome *
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

              {/* Seleção Visual de Datas/Turnos em Grade (Pills) ou Fallback Opcional */}
              {catalog.deliveryDates.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Escolha a Data / Turno *
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {catalog.deliveryDates.map((date) => {
                      const isSelected = selectedDate === date;
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition ${
                            isSelected
                              ? `${theme.softBorder} ${theme.softBg} ${theme.softText} ring-1 ring-current`
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
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                      fulfillmentType === 'pickup'
                        ? `${theme.softBorder} ${theme.softBg} ${theme.softText}`
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Store className="h-4 w-4" />
                    Retirada
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                      fulfillmentType === 'delivery'
                        ? `${theme.softBorder} ${theme.softBg} ${theme.softText}`
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

                {catalog.depositPct > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${theme.softText}`}>
                      Sinal para reservar ({catalog.depositPct}%)
                    </span>
                    <span className={`text-base font-extrabold ${theme.softText}`}>
                      {formatCurrency(depositCents)}
                    </span>
                  </div>
                )}

                {catalog.pixKey && (
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

              <button
                type="submit"
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold shadow-lg transition ${theme.primaryBg} ${theme.primaryHover} ${theme.buttonText} ${theme.shadowColor}`}
              >
                <MessageCircle className="h-5 w-5" />
                Enviar Pedido no WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
