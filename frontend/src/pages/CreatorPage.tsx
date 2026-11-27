import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ImagePlus,
  Sparkles,
  Loader2,
  Infinity as InfinityIcon,
  Store,
  LogIn,
  LogOut,
  ArrowLeft,
  Palette,
  Wallet,
  Package,
  CalendarClock,
  Eye,
  X,
  RotateCcw,
} from 'lucide-react';
import type {
  ButtonFill,
  ButtonShape,
  CreateCatalogResponse,
  DraftProductItem,
  StoreAppearanceConfig,
} from '../types/catalog';
import { getTheme, THEMES, type ThemeId } from '../constants/themes';
import { resolveStoreTheme } from '../utils/storeTheme';
import {
  blobToDataUrl,
  compressImage,
  dataUrlToBlob,
} from '../utils/compressImage';
import {
  formatPhoneMask,
  formatPriceInput,
  isValidBrazilianPhone,
  parsePriceToCents,
  phoneToDDI,
  safeRedirect,
} from '../utils/format';
import {
  createCardSubscription,
  createCatalog,
  getMyCatalogs,
  getSafeErrorMessage,
  renewCatalog,
} from '../services/api';
import { applyPageSeo } from '../utils/seo';
import { useAuth } from '../contexts/AuthContext';
import { SettingsSectionCard } from '../components/SettingsSectionCard';
import { AppearanceControls } from '../components/AppearanceControls';
import { CatalogLivePreview } from '../components/CatalogLivePreview';
import { PixPaymentModal } from '../components/PixPaymentModal';
import { PlanSelectorModal, type PlanOption } from '../components/PlanSelectorModal';
import { ConnectMercadoPagoModal } from '../components/ConnectMercadoPagoModal';
import { AuthModal } from '../components/AuthModal';
import { LogoUploader } from '../components/LogoUploader';
import { DeliveryScheduleEditor } from '../components/DeliveryScheduleEditor';
import { Footer } from '../components/Footer';
import logoVitriMini from '../assets/logo-vitrimini.png';

const DRAFT_STORAGE_KEY = 'vitrimini_draft_v1';

const DEFAULT_DELIVERY_DATES = [
  '23/12 (Qua) • Tarde',
  '24/12 (Qui) • Manhã',
];

type CreatorSectionId =
  | 'identity'
  | 'appearance'
  | 'payments'
  | 'products'
  | 'schedule';

const SHAPE_LABELS: Record<ButtonShape, string> = {
  professional: 'Profissional',
  modern: 'Moderno',
  relaxed: 'Descontraído',
};

const FILL_LABELS: Record<ButtonFill, string> = {
  solid: 'Sólido',
  outline: 'Contorno',
};

interface SavedDraft {
  storeName: string;
  logoPreviewDataUrl?: string | null;
  themeColor: string;
  storeAppearance?: StoreAppearanceConfig;
  whatsapp: string;
  pixKey: string;
  depositPct: number;
  paymentNotice?: string;
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

function createDefaultAppearance(): StoreAppearanceConfig {
  const resolved = resolveStoreTheme('rose');
  return {
    bgColor: resolved.bgColor,
    primaryColor: resolved.primaryColor,
    buttonShape: resolved.buttonShape,
    buttonFill: resolved.buttonFill,
    nichePreset: resolved.nichePreset,
  };
}

export function CreatorPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [openSection, setOpenSection] = useState<CreatorSectionId | null>(
    'identity'
  );
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string | null>(
    null
  );
  const [storeAppearance, setStoreAppearance] = useState<StoreAppearanceConfig>(
    createDefaultAppearance
  );

  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [depositPct, setDepositPct] = useState<number>(50);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [deliveryDates, setDeliveryDates] = useState<string[]>(
    DEFAULT_DELIVERY_DATES
  );
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
  const [selectedPlanForModal, setSelectedPlanForModal] =
    useState<PlanOption | null>(null);
  const [pendingPlanCatalog, setPendingPlanCatalog] = useState<{
    catalogId: string;
    storeName: string;
    slug: string;
    editToken: string;
  } | null>(null);
  const [planModalLoading, setPlanModalLoading] = useState(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);
  const [trialEligibilityFromApi, setTrialEligibilityFromApi] = useState<{
    canUseTrial: boolean;
    hasExistingCatalogs: boolean;
  } | null>(null);
  const [trialSuccessData, setTrialSuccessData] =
    useState<CreateCatalogResponse | null>(null);
  const [showMpInviteModal, setShowMpInviteModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTrialEligibilityFromApi(null);
      return;
    }
    let cancelled = false;
    getMyCatalogs()
      .then((res) => {
        if (cancelled) return;
        setTrialEligibilityFromApi({
          canUseTrial: res.canUseTrial !== false,
          hasExistingCatalogs: res.catalogs.length > 0,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setTrialEligibilityFromApi(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const derivedThemeColor = useMemo(() => {
    const primary = (storeAppearance.primaryColor || '').trim().toUpperCase();
    const matched = (Object.keys(THEMES) as ThemeId[]).find(
      (id) => THEMES[id].hex.toUpperCase() === primary
    );
    return matched ?? (primary || 'rose');
  }, [storeAppearance.primaryColor]);

  const activeTheme = getTheme(derivedThemeColor);
  const resolvedStoreTheme = resolveStoreTheme(
    derivedThemeColor,
    storeAppearance
  );
  const firstName = user?.name.split(' ')[0] || '';

  const deferredStoreName = useDeferredValue(storeName);
  const deferredPaymentNotice = useDeferredValue(paymentNotice);
  const deferredNotes = useDeferredValue(notes);
  const deferredDeliveryDates = useDeferredValue(deliveryDates);
  const deferredProducts = useDeferredValue(products);

  const previewProducts = useMemo(
    () =>
      deferredProducts.map((p) => ({
        localId: p.localId,
        name: p.name,
        description: p.description,
        priceInput: p.priceInput,
        available: p.available,
        imageUrl: p.previewDataUrl || null,
      })),
    [deferredProducts]
  );

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
        const resolved = resolveStoreTheme(
          parsed.themeColor,
          parsed.storeAppearance
        );
        setStoreAppearance({
          bgColor: resolved.bgColor,
          primaryColor: resolved.primaryColor,
          buttonShape: resolved.buttonShape,
          buttonFill: resolved.buttonFill,
          nichePreset: resolved.nichePreset,
        });
        if (parsed.whatsapp) setWhatsapp(formatPhoneMask(parsed.whatsapp));
        if (parsed.pixKey) setPixKey(parsed.pixKey);
        if (parsed.depositPct !== undefined) setDepositPct(parsed.depositPct);
        if (parsed.paymentNotice) setPaymentNotice(parsed.paymentNotice);
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
      themeColor: derivedThemeColor,
      storeAppearance,
      whatsapp,
      pixKey,
      depositPct,
      paymentNotice,
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
    derivedThemeColor,
    storeAppearance,
    whatsapp,
    pixKey,
    depositPct,
    paymentNotice,
    deliveryDates,
    notes,
    products,
  ]);

  const hasDraftContent = useMemo(
    () =>
      Boolean(
        storeName.trim() ||
          logoPreviewDataUrl ||
          pixKey.trim() ||
          paymentNotice.trim() ||
          notes.trim() ||
          products.some(
            (p) =>
              p.name.trim() ||
              p.description.trim() ||
              p.priceInput.trim() ||
              p.previewDataUrl
          )
      ),
    [
      storeName,
      logoPreviewDataUrl,
      pixKey,
      paymentNotice,
      notes,
      products,
    ]
  );

  function handleDiscardDraft() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setStoreName('');
    setLogoBlob(null);
    setLogoPreviewDataUrl(null);
    setStoreAppearance(createDefaultAppearance());
    setWhatsapp(user?.phone ? formatPhoneMask(user.phone) : '');
    setPixKey('');
    setDepositPct(50);
    setPaymentNotice('');
    setDeliveryDates(DEFAULT_DELIVERY_DATES);
    setNotes('');
    setProducts([createEmptyProduct()]);
    setConfirmDeleteId(null);
    setError(null);
    setOpenSection('identity');
  }

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
        formData.append('themeColor', derivedThemeColor);
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
        formData.append('deferPayment', 'true');

        const response = await createCatalog(formData, tokenOverride);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        if (response.activatedByTrial) {
          setTrialSuccessData(response);
          setShowMpInviteModal(true);
        } else {
          setPlanModalError(null);
          setPendingPlanCatalog({
            catalogId: response.catalogId,
            storeName: storeName.trim(),
            slug: response.slug,
            editToken: response.editToken,
          });
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
      derivedThemeColor,
      pixKey,
      depositPct,
      paymentNotice,
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
      setOpenSection('identity');
      setError('Informe o nome do seu estabelecimento.');
      return;
    }

    if (!isValidBrazilianPhone(whatsapp)) {
      setOpenSection('payments');
      setError('Informe um WhatsApp válido com DDD: (99) 99999-9999.');
      return;
    }

    const validProducts = products.filter((p) => p.name.trim());
    if (validProducts.length === 0) {
      setOpenSection('products');
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

  const canUseTrial =
    !user ||
    (user.canUseTrial !== false &&
      trialEligibilityFromApi?.canUseTrial !== false &&
      !trialEligibilityFromApi?.hasExistingCatalogs);

  async function handleSelectPlanPix(plan: PlanOption) {
    if (!pendingPlanCatalog) return;
    setPlanModalError(null);
    setPlanModalLoading(true);
    try {
      const res = await renewCatalog(pendingPlanCatalog.catalogId, plan.code);
      setSelectedPlanForModal(plan);
      setPaymentModalData({
        ...res,
        catalogId: pendingPlanCatalog.catalogId,
        activatedByTrial: false,
      });
      setPendingPlanCatalog(null);
    } catch (err) {
      setPlanModalError(
        getSafeErrorMessage(
          err,
          'Não foi possível gerar o Pix para este plano agora. Tente novamente.'
        )
      );
    } finally {
      setPlanModalLoading(false);
    }
  }

  async function handleSelectPlanCard(plan: PlanOption) {
    if (!pendingPlanCatalog) return;
    setPlanModalError(null);
    setPlanModalLoading(true);
    try {
      const res = await createCardSubscription(pendingPlanCatalog.catalogId, {
        planCode: plan.code,
        autoRenewConsent: true,
      });
      if (safeRedirect(res.initPoint)) {
        setPendingPlanCatalog(null);
      } else {
        setPlanModalError(
          'Não foi possível abrir a página de pagamento do Mercado Pago. Tente novamente.'
        );
      }
    } catch (err) {
      setPlanModalError(
        getSafeErrorMessage(
          err,
          'Não foi possível iniciar a assinatura no cartão agora. Tente novamente.'
        )
      );
    } finally {
      setPlanModalLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-stone-50">
      {/* Top Navbar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voltar ao início</span>
            </Link>
            <Link to="/" className="shrink-0 cursor-pointer">
              <img
                src={logoVitriMini}
                alt="Logo da VitriMini"
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
              {canUseTrial
                ? 'Produtos ilimitados • 0% de comissão • Teste grátis por 15 dias'
                : 'Produtos ilimitados • 0% de comissão • Vitrine + VitriLink'}
            </span>

            {authLoading ? (
              <div className="h-9 w-24 animate-pulse rounded-xl bg-stone-200/70" />
            ) : user ? (
              <>
                <span className="hidden text-xs font-semibold text-stone-600 sm:inline">
                  Olá, <strong className="text-stone-900">{firstName}</strong>
                </span>
                <Link
                  to="/minhas-vitrines"
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800 transition hover:bg-stone-100"
                >
                  <Store
                    className="h-3.5 w-3.5"
                    style={{ color: resolvedStoreTheme.primaryColor }}
                  />
                  Minhas Vitrines
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
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
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
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
          Sua primeira vitrine entra no ar hoje com <strong>15 dias grátis</strong> • 0% de comissão sobre suas vendas
        </div>
      ) : (
        <div className="border-b border-emerald-100 bg-emerald-50/80 px-4 py-2 text-center text-xs font-semibold text-emerald-900">
          Escolha o plano ideal para ativar sua nova vitrine • 0% de comissão sobre suas vendas
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto mt-6 w-full max-w-6xl flex-1 px-4 pb-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            {/* Barra de ações rápidas (Prévia mobile + Descartar rascunho) */}
            {(hasDraftContent || true) && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                {hasDraftContent ? (
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Descartar rascunho
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => setMobilePreviewOpen(true)}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 shadow-2xs transition hover:bg-zinc-50 lg:hidden"
                >
                  <Eye
                    className="h-4 w-4"
                    style={{ color: resolvedStoreTheme.primaryColor }}
                  />
                  Ver prévia
                </button>
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-4">
              {/* 1. Identidade da Vitrine */}
              <SettingsSectionCard
                title="Identidade da Vitrine"
                subtitle={
                  storeName.trim() || 'Logo, nome e descrição da vitrine'
                }
                icon={<Store className="h-5 w-5" />}
                isOpen={openSection === 'identity'}
                onToggle={() =>
                  setOpenSection((prev) =>
                    prev === 'identity' ? null : 'identity'
                  )
                }
              >
                <div className="space-y-5">
                  <LogoUploader
                    storeName={storeName}
                    imageSrc={logoPreviewDataUrl}
                    theme={activeTheme}
                    onSelectFile={handleLogoSelect}
                    onRemove={handleLogoRemove}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      Nome da Loja / Confeitaria *
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ex: Doces da Maria"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      Descrição da vitrine (opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      value={paymentNotice}
                      onChange={(e) => setPaymentNotice(e.target.value)}
                      placeholder="Ex.: Doces artesanais sob encomenda • Retirada ou entrega"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                    />
                    <p className="mt-1 text-[11px] text-stone-500">
                      Aparece logo abaixo do nome da sua loja no topo da vitrine.
                      Deixe em branco se não quiser exibir.
                    </p>
                  </div>
                </div>
              </SettingsSectionCard>

              {/* 2. Aparência & Estilo */}
              <SettingsSectionCard
                title="Aparência & Estilo"
                subtitle={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-black/15"
                      style={{ backgroundColor: storeAppearance.primaryColor }}
                    />
                    <span>
                      {SHAPE_LABELS[resolvedStoreTheme.buttonShape]} ·{' '}
                      {FILL_LABELS[resolvedStoreTheme.buttonFill]}
                    </span>
                  </span>
                }
                icon={<Palette className="h-5 w-5" />}
                isOpen={openSection === 'appearance'}
                onToggle={() =>
                  setOpenSection((prev) =>
                    prev === 'appearance' ? null : 'appearance'
                  )
                }
              >
                <div className="space-y-4">
                  {/* Preview Mobile Inteligente (< md) */}
                  <div className="md:hidden">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Prévia ao vivo no celular
                    </p>
                    <div className="max-h-[340px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 p-2">
                      <div className="origin-top scale-[0.82]">
                        <CatalogLivePreview
                          storeName={deferredStoreName}
                          logoUrl={logoPreviewDataUrl}
                          themeColor={derivedThemeColor}
                          storeAppearance={storeAppearance}
                          depositPct={depositPct}
                          paymentNotice={deferredPaymentNotice}
                          deliveryDates={deferredDeliveryDates}
                          notes={deferredNotes}
                          pickupAddress=""
                          deliveryEstimate=""
                          products={previewProducts}
                        />
                      </div>
                    </div>
                  </div>

                  <AppearanceControls
                    value={storeAppearance}
                    onChange={setStoreAppearance}
                    allowRelaxedShape={false}
                  />
                </div>
              </SettingsSectionCard>

              {/* 3. Atendimento e Cobrança no Pedido */}
              <SettingsSectionCard
                title="Atendimento e Cobrança no Pedido"
                subtitle={`${
                  depositPct === 0
                    ? 'Combinar na entrega'
                    : `Pagamento no pedido: ${depositPct}%`
                } • ${
                  pixKey.trim() ? 'Pix configurado' : 'Pix não informado'
                }`}
                icon={<Wallet className="h-5 w-5" />}
                isOpen={openSection === 'payments'}
                onToggle={() =>
                  setOpenSection((prev) =>
                    prev === 'payments' ? null : 'payments'
                  )
                }
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      WhatsApp para Pedidos *
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={15}
                      value={whatsapp}
                      onChange={(e) =>
                        setWhatsapp(formatPhoneMask(e.target.value))
                      }
                      placeholder="(75) 99999-9999"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                    />
                    <p className="mt-1 text-[11px] text-stone-400">
                      DDD + número (editável para esta vitrine)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      Sua Chave Pix (para receber pagamentos)
                    </label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="CPF, E-mail, Celular ou Aleatória"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700">
                      Cobrança no Pedido (Pagamento Antecipado)
                    </label>
                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        {
                          value: 0,
                          label: '0% do valor',
                          description: 'Combinar ou pagar na entrega',
                        },
                        {
                          value: 50,
                          label: '50% do valor',
                          description: 'Metade na confirmação',
                        },
                        {
                          value: 100,
                          label: '100% do valor',
                          description: 'Pagamento integral antecipado',
                        },
                      ].map((opt) => {
                        const selected = depositPct === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDepositPct(opt.value)}
                            style={
                              selected
                                ? {
                                    borderColor:
                                      resolvedStoreTheme.primaryColor,
                                    backgroundColor: `${resolvedStoreTheme.primaryColor}14`,
                                    color: resolvedStoreTheme.primaryColor,
                                  }
                                : undefined
                            }
                            className={`flex min-h-[44px] cursor-pointer flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition ${
                              selected
                                ? 'shadow-2xs'
                                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <span className="text-xs font-bold">
                              {opt.label}
                            </span>
                            <span
                              className={`mt-0.5 text-[11px] leading-tight ${
                                selected ? 'opacity-90' : 'text-stone-500'
                              }`}
                            >
                              {opt.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SettingsSectionCard>

              {/* 4. Produtos para Encomenda */}
              <SettingsSectionCard
                title="Produtos para Encomenda"
                subtitle={`${products.length} ${
                  products.length === 1
                    ? 'produto adicionado'
                    : 'produtos adicionados'
                }`}
                icon={<Package className="h-5 w-5" />}
                isOpen={openSection === 'products'}
                onToggle={() =>
                  setOpenSection((prev) =>
                    prev === 'products' ? null : 'products'
                  )
                }
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-stone-500">
                      Cadastre quantos itens quiser — produtos ilimitados no seu
                      VitriMini.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      style={{
                        backgroundColor: `${resolvedStoreTheme.primaryColor}14`,
                        color: resolvedStoreTheme.primaryColor,
                      }}
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Novo Produto
                    </button>
                  </div>

                  <div className="space-y-3">
                    {products.map((product, index) => (
                      <div
                        key={product.localId}
                        className={`rounded-xl border p-3.5 transition sm:p-4 ${
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
                              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2"
                            >
                              <span
                                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                                  product.available
                                    ? 'bg-emerald-600'
                                    : 'bg-red-500'
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
                                  className="min-h-[36px] cursor-pointer rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="min-h-[36px] cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteId(product.localId)
                                }
                                className="flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
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
                                alt={
                                  product.name.trim()
                                    ? `Foto do produto ${product.name.trim()}`
                                    : 'Foto do produto cadastrado'
                                }
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
                              onChange={(e) =>
                                handleImageSelect(product.localId, e)
                              }
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
                                className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                              />
                            </div>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">
                                R$
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0,00"
                                value={product.priceInput}
                                onChange={(e) =>
                                  handleUpdateProduct(product.localId, {
                                    priceInput: formatPriceInput(
                                      e.target.value
                                    ),
                                  })
                                }
                                className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-stone-900"
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
                                className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
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
                    className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-xs font-bold text-stone-600 transition hover:border-stone-500 hover:bg-stone-50"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar produto
                  </button>
                </div>
              </SettingsSectionCard>

              {/* 5. Datas & Turnos de Entrega / Retirada */}
              <SettingsSectionCard
                title="Datas & Turnos de Entrega / Retirada"
                subtitle={
                  deliveryDates.length > 0
                    ? `${deliveryDates.length} opção(ões) configurada(s)`
                    : 'Nenhuma data configurada'
                }
                icon={<CalendarClock className="h-5 w-5" />}
                isOpen={openSection === 'schedule'}
                onToggle={() =>
                  setOpenSection((prev) =>
                    prev === 'schedule' ? null : 'schedule'
                  )
                }
              >
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                      Datas e Turnos de Entrega / Retirada
                    </label>
                    <DeliveryScheduleEditor
                      value={deliveryDates}
                      onChange={setDeliveryDates}
                      theme={activeTheme}
                    />
                  </div>

                  <div>
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
              </SettingsSectionCard>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: resolvedStoreTheme.primaryColor,
                    color: resolvedStoreTheme.textOnPrimary,
                  }}
                  className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {canUseTrial
                        ? 'Publicando sua vitrine...'
                        : 'Criando vitrine...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      {canUseTrial
                        ? 'Publicar com 15 dias grátis'
                        : 'Criar vitrine e escolher plano'}
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-stone-500">
                  {canUseTrial
                    ? 'Sua primeira vitrine entra no ar hoje com 15 dias grátis • 0% de comissão'
                    : 'Escolha o plano ideal para ativar sua nova vitrine • 0% de comissão sobre suas vendas'}
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Live Preview Desktop (sticky) */}
          <aside className="hidden lg:col-span-5 lg:sticky lg:top-6 lg:block">
            <CatalogLivePreview
              storeName={deferredStoreName}
              logoUrl={logoPreviewDataUrl}
              themeColor={derivedThemeColor}
              storeAppearance={storeAppearance}
              depositPct={depositPct}
              paymentNotice={deferredPaymentNotice}
              deliveryDates={deferredDeliveryDates}
              notes={deferredNotes}
              pickupAddress=""
              deliveryEstimate=""
              products={previewProducts}
            />
          </aside>
        </div>
      </main>

      <Footer />

      {/* Modal de Prévia ao vivo no Mobile/Tablet */}
      {mobilePreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4 backdrop-blur-xs lg:hidden"
        >
          <div className="mx-auto flex w-full max-w-sm items-center justify-between pb-3 text-white">
            <span className="text-xs font-bold uppercase tracking-wider">
              Prévia da Vitrine
            </span>
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              aria-label="Fechar prévia"
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-4">
            <CatalogLivePreview
              storeName={deferredStoreName}
              logoUrl={logoPreviewDataUrl}
              themeColor={derivedThemeColor}
              storeAppearance={storeAppearance}
              depositPct={depositPct}
              paymentNotice={deferredPaymentNotice}
              deliveryDates={deferredDeliveryDates}
              notes={deferredNotes}
              pickupAddress=""
              deliveryEstimate=""
              products={previewProducts}
            />
          </div>
        </div>
      )}

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

      {pendingPlanCatalog && (
        <PlanSelectorModal
          storeName={pendingPlanCatalog.storeName}
          loading={planModalLoading}
          error={planModalError}
          accentColor={resolvedStoreTheme.primaryColor}
          accentTextColor={resolvedStoreTheme.textOnPrimary}
          onSelectPlan={(plan) => void handleSelectPlanPix(plan)}
          onSelectCardSubscription={(plan) => void handleSelectPlanCard(plan)}
          onClose={() => {
            if (!planModalLoading) {
              setPlanModalError(null);
              setPendingPlanCatalog(null);
            }
          }}
        />
      )}

      {paymentModalData && (
        <PixPaymentModal
          paymentData={paymentModalData}
          planName={selectedPlanForModal?.name}
          planPriceLabel={selectedPlanForModal?.priceLabel}
          planDays={selectedPlanForModal?.days}
          onCancelDraft={() => setPaymentModalData(null)}
          onCloseAfterPaid={() => setPaymentModalData(null)}
          onConfirmed={handlePaymentConfirmed}
        />
      )}

      {trialSuccessData && showMpInviteModal && (
        <ConnectMercadoPagoModal
          catalogId={trialSuccessData.catalogId}
          badgeText="Vitrine no ar com 15 dias grátis!"
          onClose={() => setShowMpInviteModal(false)}
        />
      )}

      {trialSuccessData && !showMpInviteModal && (
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
              Sua vitrine já está publicada e pronta para receber pedidos no
              WhatsApp.
            </p>
            <div className="mt-5 space-y-2.5">
              <Link
                to={`/c/${trialSuccessData.slug}`}
                style={{
                  backgroundColor: resolvedStoreTheme.primaryColor,
                  color: resolvedStoreTheme.textOnPrimary,
                }}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition hover:opacity-95"
              >
                Abrir minha vitrine
              </Link>
              <Link
                to={`/painel/${trialSuccessData.catalogId}`}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100"
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
