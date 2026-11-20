import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ImagePlus,
  Sparkles,
  Smartphone,
  PenLine,
  Loader2,
  Infinity as InfinityIcon,
  Store,
  LogIn,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import type { CreateCatalogResponse, DraftProductItem } from '../types/catalog';
import { getTheme, THEMES, type ThemeId } from '../constants/themes';
import {
  blobToDataUrl,
  compressImage,
  dataUrlToBlob,
} from '../utils/compressImage';
import {
  formatPhoneMask,
  isValidBrazilianPhone,
  parsePriceToCents,
  phoneToDDI,
} from '../utils/format';
import { createCatalog, getSafeErrorMessage } from '../services/api';
import { applyPageSeo } from '../utils/seo';
import { useAuth } from '../contexts/AuthContext';
import { PhoneMockupPreview } from '../components/PhoneMockupPreview';
import { PixPaymentModal } from '../components/PixPaymentModal';
import { AuthModal } from '../components/AuthModal';
import { LogoUploader } from '../components/LogoUploader';
import { ThemeSelector } from '../components/ThemeSelector';
import { DeliveryScheduleEditor } from '../components/DeliveryScheduleEditor';
import { Footer } from '../components/Footer';
import logoVitriMini from '../assets/logo-vitrimini.png';

const DRAFT_STORAGE_KEY = 'vitrimini_draft_v1';

interface SavedDraft {
  storeName: string;
  logoPreviewDataUrl?: string | null;
  themeColor: ThemeId;
  whatsapp: string;
  pixKey: string;
  depositPct: number;
  deliveryDates: string[];
  notes: string;
  products: Array<{
    localId: string;
    name: string;
    description: string;
    priceInput: string;
    available: boolean;
    previewDataUrl?: string;
  }>;
}

function createEmptyProduct(): DraftProductItem {
  return {
    localId: crypto.randomUUID(),
    name: '',
    description: '',
    priceInput: '',
    available: true,
  };
}

export function CreatorPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  const [storeName, setStoreName] = useState('');
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string | null>(
    null
  );
  const [themeColor, setThemeColor] = useState<ThemeId>('rose');

  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [depositPct, setDepositPct] = useState<number>(50);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [deliveryDates, setDeliveryDates] = useState<string[]>([
    '23/12 (Qua) • Tarde',
    '24/12 (Qui) • Manhã',
  ]);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<DraftProductItem[]>([
    createEmptyProduct(),
  ]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authModalConfig, setAuthModalConfig] = useState<{
    open: boolean;
    initialTab: 'register' | 'login';
    publishOnSuccess: boolean;
  }>({
    open: false,
    initialTab: 'register',
    publishOnSuccess: false,
  });

  const [paymentModalData, setPaymentModalData] =
    useState<CreateCatalogResponse | null>(null);
  const [trialSuccessData, setTrialSuccessData] =
    useState<CreateCatalogResponse | null>(null);

  const activeTheme = getTheme(themeColor);
  const firstName = user?.name.split(' ')[0] || '';

  // 1. Carrega rascunho de formulário do localStorage
  useEffect(() => {
    applyPageSeo({
      title: 'Criar Vitrine Digital — VitriMini',
      description:
        'Monte sua vitrine digital de encomendas gratuitamente em 2 minutos. Adicione fotos, datas de entrega e receba pedidos organizados no WhatsApp.',
      canonicalPath: '/criar',
    });
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDraft;
        if (parsed.storeName) setStoreName(parsed.storeName);
        if (parsed.logoPreviewDataUrl) {
          setLogoPreviewDataUrl(parsed.logoPreviewDataUrl);
        }
        if (parsed.themeColor && parsed.themeColor in THEMES) {
          setThemeColor(parsed.themeColor);
        }
        if (parsed.whatsapp) setWhatsapp(formatPhoneMask(parsed.whatsapp));
        if (parsed.pixKey) setPixKey(parsed.pixKey);
        if (parsed.depositPct !== undefined) setDepositPct(parsed.depositPct);
        if (Array.isArray(parsed.deliveryDates)) {
          setDeliveryDates(parsed.deliveryDates);
        }
        if (parsed.notes) setNotes(parsed.notes);
        if (Array.isArray(parsed.products) && parsed.products.length > 0) {
          setProducts(parsed.products);
        }
      }
    } catch {
      // Ignora rascunho corrompido
    } finally {
      setHydrated(true);
    }
  }, []);

  // 2. Auto-preenchimento editável do WhatsApp quando o lojista está logado
  useEffect(() => {
    if (hydrated && user?.phone && !whatsapp.trim()) {
      setWhatsapp(formatPhoneMask(user.phone));
    }
  }, [hydrated, user?.phone, whatsapp]);

  // 3. Salva rascunho do formulário automaticamente no localStorage
  useEffect(() => {
    if (!hydrated) return;
    const draft: SavedDraft = {
      storeName,
      logoPreviewDataUrl,
      themeColor,
      whatsapp,
      pixKey,
      depositPct,
      deliveryDates,
      notes,
      products: products.map((p) => ({
        localId: p.localId,
        name: p.name,
        description: p.description,
        priceInput: p.priceInput,
        available: p.available,
        previewDataUrl: p.previewDataUrl,
      })),
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            ...draft,
            logoPreviewDataUrl: null,
            products: draft.products.map((p) => ({
              ...p,
              previewDataUrl: undefined,
            })),
          })
        );
      } catch {
        // Ignora
      }
    }
  }, [
    hydrated,
    storeName,
    logoPreviewDataUrl,
    themeColor,
    whatsapp,
    pixKey,
    depositPct,
    deliveryDates,
    notes,
    products,
  ]);

  async function handleLogoSelect(file: File) {
    setError(null);
    try {
      const compressed = await compressImage(file, 400);
      const dataUrl = await blobToDataUrl(compressed);
      setLogoBlob(compressed);
      setLogoPreviewDataUrl(dataUrl);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível processar a imagem selecionada. Tente outra foto.'
        )
      );
    }
  }

  function handleLogoRemove() {
    setLogoBlob(null);
    setLogoPreviewDataUrl(null);
  }

  function handleAddProduct() {
    setProducts((prev) => [...prev, createEmptyProduct()]);
  }

  function handleRemoveProduct(localId: string) {
    setProducts((prev) =>
      prev.length > 1 ? prev.filter((p) => p.localId !== localId) : prev
    );
  }

  function handleUpdateProduct(
    localId: string,
    patch: Partial<DraftProductItem>
  ) {
    setProducts((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p))
    );
  }

  async function handleImageSelect(
    localId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const compressedBlob = await compressImage(file, 800);
      const previewDataUrl = await blobToDataUrl(compressedBlob);
      handleUpdateProduct(localId, {
        blob: compressedBlob,
        previewDataUrl,
      });
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível processar a imagem selecionada. Tente outra foto.'
        )
      );
    }
  }

  const executeCreateCatalog = useCallback(
    async (tokenOverride?: string) => {
      const digits = phoneToDDI(whatsapp);
      const validProducts = products.filter((p) => p.name.trim());

      setSubmitting(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('storeName', storeName.trim());
        formData.append('themeColor', themeColor);
        formData.append('whatsapp', digits);
        formData.append('pixKey', pixKey.trim());
        formData.append('depositPct', String(depositPct));
        formData.append('paymentNotice', paymentNotice.trim());
        formData.append('deliveryDates', JSON.stringify(deliveryDates));
        formData.append('notes', notes.trim());

        let finalLogoBlob = logoBlob;
        if (!finalLogoBlob && logoPreviewDataUrl) {
          finalLogoBlob = await dataUrlToBlob(logoPreviewDataUrl);
        }
        if (finalLogoBlob) {
          formData.append('logo', finalLogoBlob, 'logo.webp');
        }

        const serializedProducts = [];
        for (let i = 0; i < validProducts.length; i++) {
          const p = validProducts[i];
          const fieldName = `image_${i}`;
          let imageBlob = p.blob;

          if (!imageBlob && p.previewDataUrl) {
            imageBlob = await dataUrlToBlob(p.previewDataUrl);
          }

          if (imageBlob) {
            formData.append(fieldName, imageBlob, `product_${i}.webp`);
          }

          serializedProducts.push({
            name: p.name.trim(),
            description: p.description.trim() || null,
            priceCents: parsePriceToCents(p.priceInput),
            orderIndex: i,
            available: p.available,
            imageField: imageBlob ? fieldName : undefined,
          });
        }

        formData.append('products', JSON.stringify(serializedProducts));

        const response = await createCatalog(formData, tokenOverride);
        if (response.activatedByTrial) {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          setTrialSuccessData(response);
        } else {
          setPaymentModalData(response);
        }
      } catch (err) {
        setError(
          getSafeErrorMessage(
            err,
            'Não foi possível publicar sua vitrine agora. Verifique sua conexão e tente novamente.'
          )
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      whatsapp,
      products,
      storeName,
      themeColor,
      pixKey,
      depositPct,
      deliveryDates,
      notes,
      logoBlob,
      logoPreviewDataUrl,
    ]
  );

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      setError('Informe o nome do seu estabelecimento.');
      return;
    }

    if (!isValidBrazilianPhone(whatsapp)) {
      setError('Informe um WhatsApp válido com DDD: (99) 99999-9999.');
      return;
    }

    const validProducts = products.filter((p) => p.name.trim());
    if (validProducts.length === 0) {
      setError('Adicione pelo menos 1 produto com nome e preço.');
      return;
    }

    if (!user) {
      setAuthModalConfig({
        open: true,
        initialTab: 'register',
        publishOnSuccess: true,
      });
      return;
    }

    await executeCreateCatalog();
  }

  const handlePaymentConfirmed = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  const canUseTrial = !user || user.canUseTrial !== false;

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* Top Navbar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voltar ao início</span>
            </Link>
            <Link to="/" className="shrink-0">
              <img
                src={logoVitriMini}
                alt="VitriMini"
                className="h-8 w-auto object-contain sm:h-9"
              />
            </Link>
            <span className="hidden border-l border-stone-200 pl-3 text-xs text-stone-500 md:inline">
              Criador de Vitrine
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 hidden items-center gap-1 text-xs font-semibold text-stone-700 xl:flex">
              <InfinityIcon className="h-4 w-4 text-emerald-600" />
              Produtos ilimitados • Pagamento único de R$ 24,90
            </span>

            {authLoading ? (
              <div className="h-8 w-24 animate-pulse rounded-xl bg-stone-200/70" />
            ) : user ? (
              <>
                <span className="hidden text-xs font-semibold text-stone-600 sm:inline">
                  Olá, <strong className="text-stone-900">{firstName}</strong>
                </span>
                <Link
                  to="/minhas-vitrines"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800 transition hover:bg-stone-100"
                >
                  <Store className="h-3.5 w-3.5 text-rose-600" />
                  Minhas Vitrines
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setAuthModalConfig({
                    open: true,
                    initialTab: 'login',
                    publishOnSuccess: false,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                <LogIn className="h-3.5 w-3.5 text-stone-500" />
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banner de Proposta de Valor */}
      {canUseTrial ? (
        <div className="border-b border-emerald-100 bg-emerald-50/80 px-4 py-2 text-center text-xs font-semibold text-emerald-900">
          Sua primeira vitrine entra no ar hoje com <strong>15 dias grátis</strong> • Depois apenas R$ 24,90 por 90 dias
        </div>
      ) : (
        <div className="border-b border-emerald-100 bg-emerald-50/80 px-4 py-2 text-center text-xs font-semibold text-emerald-900 xl:hidden">
          Produtos ilimitados • Pagamento único de R$ 24,90 • Sem mensalidade
        </div>
      )}

      {/* Mobile Tabs */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white px-4 py-2 lg:hidden">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              mobileTab === 'edit'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500'
            }`}
          >
            <PenLine className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              mobileTab === 'preview'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Ver Prévia
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto mt-6 max-w-6xl flex-1 px-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Form */}
          <form
            onSubmit={handlePublish}
            className={`space-y-6 lg:col-span-7 ${
              mobileTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* 1. Identidade e Dados da Loja */}
            <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  1. Identidade e Dados da Vitrine
                </h2>
                <p className="text-xs text-stone-500">
                  Personalize com sua foto, cor da marca e dados para receber os pedidos.
                </p>
              </div>

              <LogoUploader
                storeName={storeName}
                imageSrc={logoPreviewDataUrl}
                theme={activeTheme}
                onSelectFile={handleLogoSelect}
                onRemove={handleLogoRemove}
              />

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Cor do Tema da Vitrine
                </label>
                <ThemeSelector value={themeColor} onChange={setThemeColor} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Nome da Loja / Confeitaria *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Doces da Maria"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    WhatsApp para Pedidos *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhoneMask(e.target.value))}
                    placeholder="(75) 99999-9999"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                  <p className="mt-1 text-[11px] text-stone-400">
                    DDD + número (editável para esta vitrine)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Sua Chave Pix (para receber sinal)
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, E-mail, Celular ou Aleatória"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Porcentagem de Sinal na Encomenda
                  </label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {[
                      { value: 0, label: '0% (Sem sinal)' },
                      { value: 50, label: '50% de sinal' },
                      { value: 100, label: '100% antecipado' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDepositPct(opt.value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          depositPct === opt.value
                            ? `${activeTheme.softBorder} ${activeTheme.softBg} ${activeTheme.softText}`
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Descrição da vitrine (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={paymentNotice}
                    onChange={(e) => setPaymentNotice(e.target.value)}
                    placeholder="Ex.: Doces artesanais sob encomenda • Retirada ou entrega"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    Aparece logo abaixo do nome da sua loja no topo da vitrine. Deixe em branco se não quiser exibir.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Datas e Turnos de Entrega / Retirada
                  </label>
                  <DeliveryScheduleEditor
                    value={deliveryDates}
                    onChange={setDeliveryDates}
                    theme={activeTheme}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Regras / Avisos da Loja (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Encomendas até dia 20/12. Retirada no Centro ou taxa de entrega sob consulta."
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                  />
                </div>
              </div>
            </section>

            {/* 2. Produtos Ilimitados */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    2. Produtos da Vitrine ({products.length})
                  </h2>
                  <p className="text-xs text-stone-500">
                    Cadastre quantos itens quiser — produtos ilimitados no seu VitriMini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition ${activeTheme.softBg} ${activeTheme.softText}`}
                >
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {products.map((product, index) => (
                  <div
                    key={product.localId}
                    className={`rounded-xl border p-4 transition ${
                      product.available
                        ? 'border-stone-200 bg-stone-50/70'
                        : 'border-amber-200 bg-stone-100/80 opacity-75'
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-stone-400">
                          Produto #{index + 1}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.available}
                          onClick={() =>
                            handleUpdateProduct(product.localId, {
                              available: !product.available,
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-2"
                        >
                          <span
                            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                              product.available ? 'bg-emerald-600' : 'bg-red-500'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-xs transition-transform ${
                                product.available
                                  ? 'translate-x-4.5'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              product.available
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {product.available
                              ? 'Disponível'
                              : 'Esgotado (Inativo)'}
                          </span>
                        </button>
                      </div>

                      {products.length > 1 &&
                        (confirmDeleteId === product.localId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-red-700">
                              Excluir?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveProduct(product.localId);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(product.localId)}
                            className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label className="group relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-white text-center transition hover:border-stone-500">
                        {product.previewDataUrl ? (
                          <img
                            src={product.previewDataUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <>
                            <ImagePlus className="h-5 w-5 text-stone-400 group-hover:text-stone-700" />
                            <span className="mt-1 text-[10px] font-medium text-stone-500">
                              Foto
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(product.localId, e)}
                          className="hidden"
                        />
                      </label>

                      <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Nome do produto *"
                            value={product.name}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                name: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Preço (ex: 89,90)"
                            value={product.priceInput}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                priceInput: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Descrição curta (ex: Serve 10 pessoas, massa de chocolate...)"
                            value={product.description}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                description: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddProduct}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-xs font-bold text-stone-600 hover:border-stone-500 hover:bg-stone-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar produto
              </button>
            </section>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold shadow-lg transition disabled:opacity-60 ${activeTheme.primaryBg} ${activeTheme.primaryHover} ${activeTheme.buttonText} ${activeTheme.shadowColor}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {canUseTrial ? 'Publicando sua vitrine...' : 'Gerando vitrine e Pix...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {canUseTrial
                      ? 'Publicar com 15 dias grátis'
                      : 'Publicar vitrine (R$ 24,90)'}
                  </>
                )}
              </button>
              <p className="text-center text-xs text-stone-500">
                {canUseTrial
                  ? 'Sua primeira vitrine entra no ar hoje com 15 dias grátis • Sem cartão de crédito'
                  : 'Produtos ilimitados • Pagamento único de R$ 24,90 • Válida por 90 dias'}
              </p>
            </div>
          </form>

          {/* Right Column: Live Phone Mockup */}
          <div
            className={`lg:col-span-5 ${
              mobileTab === 'edit' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="lg:sticky lg:top-6">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">
                Prévia ao vivo • VitriMini
              </p>
              <PhoneMockupPreview
                storeName={storeName}
                logoPreviewUrl={logoPreviewDataUrl}
                themeColor={themeColor}
                notes={notes}
                deliveryDates={deliveryDates}
                depositPct={depositPct}
                paymentNotice={paymentNotice}
                products={products}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {authModalConfig.open && (
        <AuthModal
          initialTab={authModalConfig.initialTab}
          defaultPhone={whatsapp}
          onClose={() =>
            setAuthModalConfig((prev) => ({ ...prev, open: false }))
          }
          onSuccess={(auth) => {
            const shouldPublish = authModalConfig.publishOnSuccess;
            setAuthModalConfig((prev) => ({ ...prev, open: false }));
            if (shouldPublish) {
              void executeCreateCatalog(auth.token);
            }
          }}
        />
      )}

      {paymentModalData && (
        <PixPaymentModal
          paymentData={paymentModalData}
          onCancelDraft={() => setPaymentModalData(null)}
          onCloseAfterPaid={() => setPaymentModalData(null)}
          onConfirmed={handlePaymentConfirmed}
        />
      )}

      {trialSuccessData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-zinc-900">
              Vitrine no ar com 15 dias grátis!
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600">
              Sua vitrine já está publicada e pronta para receber pedidos no WhatsApp.
            </p>
            <div className="mt-5 space-y-2.5">
              <Link
                to={`/c/${trialSuccessData.slug}`}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition ${activeTheme.primaryBg} ${activeTheme.primaryHover} ${activeTheme.buttonText}`}
              >
                Abrir minha vitrine
              </Link>
              <Link
                to={`/painel/${trialSuccessData.catalogId}`}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
              >
                Ir para o painel de gestão
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
