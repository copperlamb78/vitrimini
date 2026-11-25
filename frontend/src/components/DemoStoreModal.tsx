import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Plus,
  Minus,
  Calendar,
  Check,
  MessageCircle,
  Sparkles,
  Store,
  MapPin,
  ArrowRight,
  Copy,
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface DemoProduct {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  tag: string;
  available: boolean;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'demo-1',
    name: 'Bolo Natalino de Frutas Vermelhas',
    description: 'Massa branca amanteigada, recheio cremoso de cream cheese e frutas frescas. Serve 15 fatias.',
    priceCents: 13500,
    tag: 'Mais pedido',
    available: true,
  },
  {
    id: 'demo-2',
    name: 'Chocotone Trufado Artesanal (900g)',
    description: 'Fermentação natural recheado com ganache meio amargo e cobertura de chocolate belga.',
    priceCents: 8990,
    tag: 'Especial',
    available: true,
  },
  {
    id: 'demo-3',
    name: 'Caixa Presente com 12 Brigadeiros Gourmet',
    description: 'Sabores sortidos: pistache, belga ao leite, ninho com nutella e caramelo salgado.',
    priceCents: 4800,
    tag: 'Presenteável',
    available: true,
  },
  {
    id: 'demo-4',
    name: 'Guirlanda de Brownie Recheada',
    description: 'Base de brownie intenso decorada com brigadeiro branco e morangos selecionados.',
    priceCents: 11000,
    tag: 'Edição limitada',
    available: true,
  },
];

const DEMO_DATES = [
  '23/12 (Qua) • Tarde',
  '24/12 (Qui) • Manhã',
  '24/12 (Qui) • Tarde',
];

interface DemoStoreModalProps {
  onClose: () => void;
}

export function DemoStoreModal({ onClose }: DemoStoreModalProps) {
  const navigate = useNavigate();

  const [cart, setCart] = useState<Record<string, number>>({
    'demo-1': 1,
    'demo-2': 1,
  });
  const [selectedDate, setSelectedDate] = useState<string>(DEMO_DATES[1]);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  const [customerName, setCustomerName] = useState('Mariana Silva');
  const [copiedPix, setCopiedPix] = useState(false);

  function updateQty(productId: string, delta: number) {
    setCart((prev) => {
      const next = (prev[productId] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  }

  const summary = useMemo(() => {
    const items = DEMO_PRODUCTS.filter((p) => (cart[p.id] || 0) > 0).map(
      (p) => ({
        product: p,
        qty: cart[p.id],
        subtotalCents: p.priceCents * cart[p.id],
      })
    );
    const totalCents = items.reduce((acc, i) => acc + i.subtotalCents, 0);
    const depositCents = Math.round(totalCents * 0.5);
    return { items, totalCents, depositCents };
  }, [cart]);

  function handleCopyDemoPix() {
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  }

  function handleGoToCreate() {
    onClose();
    navigate('/criar');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-4"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
              <Sparkles className="h-3.5 w-3.5" />
              Demonstração Interativa
            </span>
            <span className="hidden text-xs text-zinc-500 sm:inline">
              Teste clicando nos produtos e datas abaixo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoToCreate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
            >
              Gostou? Crie a sua igual a essa
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar demonstração"
              className="cursor-pointer rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Coluna Esquerda: Vitrine Simulada */}
          <div className="border-b border-zinc-200 bg-zinc-50/60 lg:col-span-7 lg:border-b-0 lg:border-r">
            {/* Header da Loja Exemplo */}
            <div className="bg-gradient-to-br from-rose-600 to-pink-600 px-5 py-5 text-white">
              <div className="flex items-center gap-3.5">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-2 border-white/90 bg-rose-100 text-base font-black text-rose-700 shadow-md">
                  DC
                </div>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">
                    Doces da Clara — Especial de Natal
                  </h3>
                  <p className="text-xs text-white/90">
                    Encomenda com pagamento na confirmação (50% via Pix)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {/* Seleção de Produtos */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  1. Toque para adicionar ou remover itens
                </p>

                {DEMO_PRODUCTS.map((product) => {
                  const qty = cart[product.id] || 0;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-2xs transition hover:border-zinc-300"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-sm font-bold text-zinc-900">
                            {product.name}
                          </h4>
                          <span className="shrink-0 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            {product.tag}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                          {product.description}
                        </p>
                        <p className="mt-1.5 text-sm font-extrabold text-zinc-900">
                          {formatCurrency(product.priceCents)}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, -1)}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-zinc-700 shadow-2xs hover:bg-zinc-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-4 text-center text-xs font-bold text-zinc-900">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, 1)}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-rose-600 text-white shadow-2xs hover:bg-rose-700"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateQty(product.id, 1)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Seleção de Data e Recebimento */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                  <Calendar className="h-4 w-4 text-rose-600" />
                  2. Escolha a data e turno de retirada
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DEMO_DATES.map((date) => {
                    const active = selectedDate === date;
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`flex cursor-pointer items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                          active
                            ? 'border-rose-600 bg-rose-50 text-rose-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <span className="truncate">{date}</span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFulfillment('pickup')}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                      fulfillment === 'pickup'
                        ? 'border-rose-600 bg-rose-50 text-rose-700'
                        : 'border-zinc-200 text-zinc-600'
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" />
                    Retirada no local
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillment('delivery')}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                      fulfillment === 'delivery'
                        ? 'border-rose-600 bg-rose-50 text-rose-700'
                        : 'border-zinc-200 text-zinc-600'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Entrega
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500">
                    Seu nome no pedido
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Cálculo do Pagamento e Prévia do WhatsApp */}
          <div className="flex flex-col justify-between bg-white p-5 lg:col-span-5">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  Resultado Automático
                </span>
                <h4 className="text-base font-extrabold text-zinc-900">
                  Como o pedido chega para você
                </h4>
                <p className="text-xs text-zinc-500">
                  O cliente já vê o valor antecipado calculado, copia sua chave Pix e envia tudo pronto no seu WhatsApp.
                </p>
              </div>

              {/* Card Cálculo de Pagamento */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>Valor Total do Pedido</span>
                  <span className="font-bold text-zinc-900">
                    {formatCurrency(summary.totalCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-rose-700">
                    Valor antecipado (50%)
                  </span>
                  <span className="font-extrabold text-rose-700">
                    {formatCurrency(summary.depositCents)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                  <span className="truncate font-mono text-xs text-zinc-700">
                    pix@docesdaclara.com.br
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDemoPix}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white"
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

              {/* Simulação da Mensagem no WhatsApp */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  Prévia da mensagem no seu WhatsApp
                </div>

                {summary.items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-500">
                    Adicione pelo menos 1 produto ao lado para ver a mensagem formatada.
                  </p>
                ) : (
                  <div className="rounded-xl border border-emerald-200/80 bg-white p-3.5 text-xs leading-relaxed text-zinc-800 shadow-2xs space-y-1.5">
                    <p>
                      Olá <strong>Doces da Clara</strong>! Gostaria de fazer uma encomenda pela sua <strong>VitriMini</strong>:
                    </p>
                    <p>
                      <strong>Cliente:</strong> {customerName.trim() || 'Cliente'}
                      <br />
                      <strong>Data/Turno:</strong> {selectedDate}
                      <br />
                      <strong>Recebimento:</strong>{' '}
                      {fulfillment === 'pickup'
                        ? 'Retirada no local'
                        : 'Entrega em domicílio'}
                    </p>
                    <div>
                      <strong>Itens do Pedido:</strong>
                      <ul className="mt-0.5 space-y-0.5">
                        {summary.items.map((item) => (
                          <li key={item.product.id}>
                            • {item.qty}x {item.product.name} (
                            {formatCurrency(item.subtotalCents)})
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="border-t border-zinc-100 pt-1.5">
                      <strong>Total:</strong> {formatCurrency(summary.totalCents)}
                      <br />
                      <strong className="text-emerald-700">
                        Valor na confirmação (50%): {formatCurrency(summary.depositCents)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-zinc-200 pt-4">
              <button
                type="button"
                onClick={handleGoToCreate}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
              >
                Gostou? Crie a sua igual a essa
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
