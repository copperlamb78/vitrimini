import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Save,
  Plus,
  Trash2,
  ExternalLink,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  BarChart3,
  Settings2,
  Eye,
  QrCode,
  CreditCard,
  Sparkles,
  Unlink,
  X,
} from 'lucide-react';
import type { Catalog, CreateCatalogResponse } from '../types/catalog';
import {
  getTheme,
  THEMES,
  type ThemeId,
} from '../constants/themes';
import {
  disconnectMercadoPago,
  getCatalogById,
  getMercadoPagoConnectUrl,
  getSafeErrorMessage,
  renewCatalog,
  toggleMercadoPagoOnlinePayment,
  updateCatalogById,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  centsToPriceInput,
  formatPhoneMask,
  isValidBrazilianPhone,
  parsePriceToCents,
  phoneToDDI,
  resolveImageUrl,
} from '../utils/format';
import { blobToDataUrl, compressImage } from '../utils/compressImage';
import { applyPageSeo } from '../utils/seo';
import { LogoUploader } from '../components/LogoUploader';
import { ThemeSelector } from '../components/ThemeSelector';
import { DeliveryScheduleEditor } from '../components/DeliveryScheduleEditor';
import { CatalogOrdersTab } from '../components/CatalogOrdersTab';
import { CatalogAnalyticsTab } from '../components/CatalogAnalyticsTab';
import { CatalogLivePreview } from '../components/CatalogLivePreview';
import { PixPaymentModal } from '../components/PixPaymentModal';
import { PlanSelectorModal, type PlanOption } from '../components/PlanSelectorModal';
import {
  ConnectMercadoPagoModal,
  isMpInviteDismissed,
} from '../components/ConnectMercadoPagoModal';

const ShareCatalogModal = lazy(() =>
  import('../components/ShareCatalogModal').then((m) => ({
    default: m.ShareCatalogModal,
  }))
);
import { ManagePageSkeleton } from '../components/Skeletons';
import logoVitriMini from '../assets/logo-vitrimini.png';

interface EditableProduct {
  id?: string;
  localId: string;
  name: string;
  description: string;
  priceInput: string;
  available: boolean;
  imageUrl: string | null;
  previewDataUrl?: string;
  blob?: Blob;
}

type ManageTab = 'orders' | 'analytics' | 'catalog';

export function ManagePage() {
  const { catalogId } = useParams<{ catalogId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ManageTab>('orders');
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [renewingTrial, setRenewingTrial] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpInviteCatalogId, setMpInviteCatalogId] = useState<string | null>(
    null
  );
  const [mpFeedback, setMpFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [paymentModalData, setPaymentModalData] =
    useState<CreateCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const [catalogMeta, setCatalogMeta] = useState<Pick<
    Catalog,
    | 'id'
    | 'slug'
    | 'status'
    | 'isTrial'
    | 'expiresAt'
    | 'planType'
    | 'onlinePaymentEnabled'
    | 'mpConnected'
    | 'hasProAccess'
  > | null>(null);

  const [storeName, setStoreName] = useState('');
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string | null>(
    null
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeId>('rose');

  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [depositPct, setDepositPct] = useState(50);
  const [minOrderInput, setMinOrderInput] = useState('0,00');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [deliveryDates, setDeliveryDates] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [deliveryEstimate, setDeliveryEstimate] = useState('');
  const [notifyOrderByEmail, setNotifyOrderByEmail] = useState(true);
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deferredStoreName = useDeferredValue(storeName);
  const deferredPaymentNotice = useDeferredValue(paymentNotice);
  const deferredNotes = useDeferredValue(notes);
  const deferredPickupAddress = useDeferredValue(pickupAddress);
  const deferredDeliveryEstimate = useDeferredValue(deliveryEstimate);
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
        imageUrl: p.previewDataUrl || resolveImageUrl(p.imageUrl),
      })),
    [deferredProducts]
  );

  const activeTheme = getTheme(themeColor);

  useEffect(() => {
    applyPageSeo({
      title: 'Painel da Vitrine — VitriMini',
      description: 'Painel de gestão de pedidos, financeiro e catálogo da VitriMini.',
      canonicalPath: catalogId ? `/painel/${catalogId}` : '/painel',
      noindex: true,
    });
  }, [catalogId]);

  useEffect(() => {
    const mpStatus = searchParams.get('mp');
    if (mpStatus === 'connected') {
      setMpFeedback({
        type: 'success',
        text: 'Conta Mercado Pago conectada! Seus clientes já podem pagar online na vitrine.',
      });
      setActiveTab('catalog');
      searchParams.delete('mp');
      setSearchParams(searchParams, { replace: true });
    } else if (mpStatus === 'error') {
      setMpFeedback({
        type: 'error',
        text: 'Não foi possível concluir a conexão com o Mercado Pago. Tente novamente.',
      });
      setActiveTab('catalog');
      searchParams.delete('mp');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (authLoading || !catalogId) return;
    if (!user) {
      navigate(`/entrar?redirect=${encodeURIComponent(`/painel/${catalogId}`)}`, {
        replace: true,
      });
      return;
    }

    setLoading(true);
    setError(null);

    getCatalogById(catalogId)
      .then((data) => {
        setCatalogMeta({
          id: data.id,
          slug: data.slug,
          status: data.status,
          isTrial: data.isTrial,
          expiresAt: data.expiresAt,
          planType: data.planType,
          onlinePaymentEnabled: data.onlinePaymentEnabled,
          mpConnected: data.mpConnected,
          hasProAccess: data.hasProAccess,
        });
        setStoreName(data.storeName);
        setExistingLogoUrl(data.logoUrl);
        setThemeColor(
          data.themeColor && data.themeColor in THEMES
            ? (data.themeColor as ThemeId)
            : 'rose'
        );
        setWhatsapp(formatPhoneMask(data.whatsapp));
        setPixKey(data.pixKey || '');
        setDepositPct(data.depositPct);
        setMinOrderInput(centsToPriceInput(data.minOrderCents ?? 0));
        setPaymentNotice(data.paymentNotice || '');
        setDeliveryDates(data.deliveryDates);
        setNotes(data.notes || '');
        setPickupAddress(data.pickupAddress || '');
        setPickupInstructions(data.pickupInstructions || '');
        setDeliveryEstimate(data.deliveryEstimate || '');
        setNotifyOrderByEmail(data.notifyOrderByEmail ?? true);
        setProducts(
          data.products.map((p) => ({
            id: p.id,
            localId: p.id,
            name: p.name,
            description: p.description || '',
            priceInput: centsToPriceInput(p.priceCents),
            available: p.available,
            imageUrl: p.imageUrl,
          }))
        );
      })
      .catch((err) => {
        setError(
          getSafeErrorMessage(
            err,
            'Não foi possível carregar o painel da vitrine agora. Verifique sua conexão.'
          )
        );
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, catalogId, navigate]);

  async function handleLogoSelect(file: File) {
    setError(null);
    try {
      const compressed = await compressImage(file, 400);
      const dataUrl = await blobToDataUrl(compressed);
      setLogoBlob(compressed);
      setLogoPreviewDataUrl(dataUrl);
      setRemoveLogo(false);
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
    setExistingLogoUrl(null);
    setRemoveLogo(true);
  }

  function handleAddProduct() {
    setProducts((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        name: '',
        description: '',
        priceInput: '',
        available: true,
        imageUrl: null,
      },
    ]);
  }

  function handleRemoveProduct(localId: string) {
    setProducts((prev) =>
      prev.length > 1 ? prev.filter((p) => p.localId !== localId) : prev
    );
  }

  function handleUpdateProduct(
    localId: string,
    patch: Partial<EditableProduct>
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!catalogId) return;

    if (!isValidBrazilianPhone(whatsapp)) {
      setError('Informe um WhatsApp válido com DDD: (99) 99999-9999.');
      return;
    }

    setSaving(true);
    setError(null);
    setSavedNotice(false);

    try {
      const formData = new FormData();
      formData.append('storeName', storeName.trim());
      formData.append('themeColor', themeColor);
      formData.append('whatsapp', phoneToDDI(whatsapp));
      formData.append('pixKey', pixKey.trim());
      formData.append('depositPct', String(depositPct));
      formData.append(
        'minOrderCents',
        String(parsePriceToCents(minOrderInput))
      );
      formData.append('paymentNotice', paymentNotice.trim());
      formData.append('deliveryDates', JSON.stringify(deliveryDates));
      formData.append('notes', notes.trim());
      formData.append('pickupAddress', pickupAddress.trim());
      formData.append('pickupInstructions', pickupInstructions.trim());
      formData.append('deliveryEstimate', deliveryEstimate.trim());

      if (logoBlob) {
        formData.append('logo', logoBlob, 'logo.webp');
      } else if (removeLogo) {
        formData.append('removeLogo', 'true');
      }

      const validProducts = products.filter((p) => p.name.trim());
      const serialized = validProducts.map((p, idx) => {
        const fieldName = `image_${idx}`;
        if (p.blob) {
          formData.append(fieldName, p.blob, `product_${idx}.webp`);
        }
        return {
          id: p.id,
          name: p.name.trim(),
          description: p.description.trim() || null,
          priceCents: parsePriceToCents(p.priceInput),
          available: p.available,
          orderIndex: idx,
          imageUrl: p.imageUrl,
          imageField: p.blob ? fieldName : undefined,
        };
      });

      formData.append('products', JSON.stringify(serialized));
      formData.append('notifyOrderByEmail', String(notifyOrderByEmail));

      const updated = await updateCatalogById(catalogId, formData);
      setExistingLogoUrl(updated.logoUrl);
      setLogoBlob(null);
      setLogoPreviewDataUrl(null);
      setRemoveLogo(false);
      setProducts(
        updated.products.map((p) => ({
          id: p.id,
          localId: p.id,
          name: p.name,
          description: p.description || '',
          priceInput: centsToPriceInput(p.priceCents),
          available: p.available,
          imageUrl: p.imageUrl,
        }))
      );
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível salvar suas alterações agora. Verifique sua conexão e tente novamente.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ManagePageSkeleton />;
  }

  if (error && !catalogMeta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h1 className="mt-3 text-lg font-bold text-stone-900">
          Link de edição inválido
        </h1>
        <p className="mt-1 max-w-sm text-sm text-stone-500">{error}</p>
        <Link
          to="/"
          className="mt-5 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Ir para o VitriMini
        </Link>
      </div>
    );
  }

  const publicLink = catalogMeta
    ? `/c/${catalogMeta.slug}${catalogMeta.status !== 'ACTIVE' ? '?preview=true' : ''}`
    : '/';

  const displayedLogo =
    logoPreviewDataUrl ||
    (!removeLogo ? resolveImageUrl(existingLogoUrl) : null);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="shrink-0">
              <img
                src={logoVitriMini}
                alt="VitriMini"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <div className="min-w-0 border-l border-stone-200 pl-3">
              <span
                className={`block text-[10px] font-bold uppercase tracking-wider ${activeTheme.primaryText}`}
              >
                Painel de Edição Rápida
              </span>
              <h1 className="truncate text-sm font-extrabold text-stone-900 sm:text-base">
                {storeName || 'Minha Vitrine'}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/minhas-vitrines"
              className="hidden cursor-pointer rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 sm:inline-block"
            >
              Minhas Vitrines
            </Link>
            {catalogMeta?.slug && (
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-50"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Divulgar</span>
              </button>
            )}
            <a
              href={publicLink}
              target="_blank"
              rel="noreferrer"
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Ver Vitrine
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto mt-6 px-4 ${
          activeTab === 'catalog' ? 'max-w-6xl' : 'max-w-4xl'
        }`}
      >
        {catalogMeta?.isTrial &&
          catalogMeta.expiresAt &&
          new Date(catalogMeta.expiresAt).getTime() > Date.now() && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
              <span>
                <strong>15 dias grátis:</strong>{' '}
                {(() => {
                  const days = Math.max(
                    1,
                    Math.ceil(
                      (new Date(catalogMeta.expiresAt).getTime() - Date.now()) /
                        (24 * 60 * 60 * 1000)
                    )
                  );
                  const dateStr = new Date(
                    catalogMeta.expiresAt
                  ).toLocaleDateString('pt-BR');
                  return `${days === 1 ? 'resta 1 dia' : `restam ${days} dias`} (vence em ${dateStr}).`;
                })()}
              </span>
              <button
                type="button"
                disabled={renewingTrial}
                onClick={() => setPlanModalOpen(true)}
                className="cursor-pointer rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Garantir +90 dias ou Pro
              </button>
            </div>
          )}

        {mpFeedback && (
          <div
            className={`mb-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${
              mpFeedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <span>{mpFeedback.text}</span>
            <button
              type="button"
              onClick={() => setMpFeedback(null)}
              className="cursor-pointer rounded-lg p-1 hover:bg-black/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {catalogMeta?.hasProAccess && !catalogMeta.mpConnected && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-xs text-sky-950">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-sky-700" />
              <span>
                Seu <strong>Plano Pro</strong> dá direito a Pagamento Online
                Automático (Pix e Cartão direto na sua conta).
              </span>
            </div>
            <button
              type="button"
              disabled={mpLoading}
              onClick={async () => {
                setMpLoading(true);
                setMpFeedback(null);
                try {
                  const { authUrl } = await getMercadoPagoConnectUrl(
                    catalogMeta.id
                  );
                  window.location.assign(authUrl);
                } catch (err) {
                  setMpFeedback({
                    type: 'error',
                    text: getSafeErrorMessage(
                      err,
                      'Não foi possível iniciar a conexão agora.'
                    ),
                  });
                  setMpLoading(false);
                }
              }}
              className="cursor-pointer rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mpLoading ? 'Abrindo...' : 'Conectar Mercado Pago'}
            </button>
          </div>
        )}

        {/* Abas de Gestão */}
        <div className="mb-5 grid grid-cols-3 gap-1.5 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xs">
          {[
            { id: 'orders' as const, label: 'Pedidos', icon: ClipboardList },
            { id: 'analytics' as const, label: 'Financeiro', icon: BarChart3 },
            { id: 'catalog' as const, label: 'Catálogo', icon: Settings2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                  isActive
                    ? `${activeTheme.primaryBg} ${activeTheme.buttonText} shadow-xs`
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.id === 'orders' && pendingOrdersCount > 0 && (
                  <span
                    className={`ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : `${activeTheme.primaryBg} ${activeTheme.buttonText}`
                    }`}
                  >
                    {pendingOrdersCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'orders' && catalogId && (
          <CatalogOrdersTab
            catalogId={catalogId}
            storeName={storeName}
            theme={activeTheme}
            onPendingCountChange={setPendingOrdersCount}
          />
        )}

        {activeTab === 'analytics' && catalogId && (
          <CatalogAnalyticsTab catalogId={catalogId} theme={activeTheme} />
        )}

        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <div className="mb-3 flex justify-end lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobilePreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 shadow-2xs transition hover:bg-zinc-50"
                >
                  <Eye className={`h-4 w-4 ${activeTheme.primaryText}`} />
                  Ver prévia
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
          {/* Produtos - Foco em pausar/reativar e editar preço rapidamente */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Produtos ({products.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Pause itens esgotados ou adicione novos produtos sem limites.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddProduct}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${activeTheme.softBg} ${activeTheme.softText}`}
              >
                <Plus className="h-4 w-4" />
                Adicionar Item
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {products.map((product) => {
                const displayImg =
                  product.previewDataUrl || resolveImageUrl(product.imageUrl);

                return (
                  <div
                    key={product.localId}
                    className={`rounded-xl border p-3.5 transition ${
                      product.available
                        ? 'border-stone-200 bg-white'
                        : 'border-amber-200 bg-stone-100/80 opacity-75'
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      {/* Switch de Status de Estoque */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={product.available}
                        onClick={() =>
                          handleUpdateProduct(product.localId, {
                            available: !product.available,
                          })
                        }
                        className="inline-flex cursor-pointer items-center gap-2.5"
                      >
                        <span
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                            product.available ? 'bg-emerald-600' : 'bg-red-500'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-xs transition-transform ${
                              product.available
                                ? 'translate-x-5.5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
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

                      {products.length > 1 && (
                        confirmDeleteId === product.localId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-red-700">
                              Excluir item?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveProduct(product.localId);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                            >
                              Sim, excluir
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(product.localId)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        )
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:border-stone-500">
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlus className="h-5 w-5 text-stone-400" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(product.localId, e)}
                          className="hidden"
                        />
                      </label>

                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Nome do produto"
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={product.priceInput}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                priceInput: e.target.value,
                              })
                            }
                            placeholder="Preço"
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={product.description}
                            onChange={(e) =>
                              handleUpdateProduct(product.localId, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Descrição"
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Identidade Visual, Loja & Datas */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Identidade, Loja e Datas Disponíveis
            </h2>

            <LogoUploader
              storeName={storeName}
              imageSrc={displayedLogo}
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
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  WhatsApp (com DDD)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhoneMask(e.target.value))}
                  placeholder="(75) 99999-9999"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
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
                  Valor mínimo do pedido (opcional)
                </label>
                <div className="relative mt-1 max-w-xs">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minOrderInput}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setMinOrderInput(centsToPriceInput(digits ? Number(digits) : 0));
                    }}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-stone-300 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-stone-900"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Deixe em R$ 0,00 para não exigir valor mínimo.
                </p>
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
                  Avisos / Regras
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              {/* Card Pagamento Online Automático (Plano Pro) */}
              {catalogMeta && (
                <div className="sm:col-span-2 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-rose-600" />
                      <h3 className="text-sm font-extrabold text-zinc-900">
                        Pagamento Online Automático (Pix e Cartão)
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                      <Sparkles className="h-3 w-3" />
                      Plano Pro
                    </span>
                  </div>

                  {!catalogMeta.hasProAccess ? (
                    <div className="mt-3 space-y-2.5">
                      <p className="text-xs leading-relaxed text-zinc-600">
                        Receba pagamentos automáticos no Pix e Cartão direto na sua conta Mercado Pago, com baixa automática dos pedidos pagos. Disponível no <strong>Plano Pro</strong> (R$ 39,90 por 90 dias ou R$ 99,90 por ano).
                      </p>
                      <button
                        type="button"
                        onClick={() => setPlanModalOpen(true)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Fazer upgrade para o Plano Pro
                      </button>
                    </div>
                  ) : !catalogMeta.mpConnected ? (
                    <div className="mt-3 space-y-2.5">
                      <p className="text-xs leading-relaxed text-zinc-600">
                        Conecte sua conta Mercado Pago para que seus clientes paguem na hora por Pix ou Cartão, com o dinheiro caindo direto para você.
                      </p>
                      <p className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
                        <strong>Importante:</strong> a VitriMini cobra 0% de comissão. Sobre as vendas pagas online, aplicam-se apenas as taxas padrão da sua própria conta do Mercado Pago (Pix ou Cartão).
                      </p>
                      <button
                        type="button"
                        disabled={mpLoading}
                        onClick={async () => {
                          setMpLoading(true);
                          setMpFeedback(null);
                          try {
                            const { authUrl } = await getMercadoPagoConnectUrl(
                              catalogMeta.id
                            );
                            window.location.assign(authUrl);
                          } catch (err) {
                            setMpFeedback({
                              type: 'error',
                              text: getSafeErrorMessage(
                                err,
                                'Não foi possível iniciar a conexão agora.'
                              ),
                            });
                            setMpLoading(false);
                          }
                        }}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {mpLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        Conectar minha conta Mercado Pago
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs">
                        <span className="font-bold text-emerald-800">
                          Conta Mercado Pago conectada
                        </span>
                        <button
                          type="button"
                          disabled={mpLoading}
                          onClick={async () => {
                            setMpLoading(true);
                            try {
                              await disconnectMercadoPago(catalogMeta.id);
                              setCatalogMeta((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      mpConnected: false,
                                      onlinePaymentEnabled: false,
                                    }
                                  : prev
                              );
                            } catch (err) {
                              setMpFeedback({
                                type: 'error',
                                text: getSafeErrorMessage(
                                  err,
                                  'Erro ao desconectar conta.'
                                ),
                              });
                            } finally {
                              setMpLoading(false);
                            }
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-60"
                        >
                          <Unlink className="h-3 w-3" />
                          Desconectar
                        </button>
                      </div>

                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800">
                        <span>Ativar pagamento online na vitrine</span>
                        <input
                          type="checkbox"
                          checked={Boolean(catalogMeta.onlinePaymentEnabled)}
                          disabled={mpLoading}
                          onChange={async (e) => {
                            const nextVal = e.target.checked;
                            setMpLoading(true);
                            try {
                              const res = await toggleMercadoPagoOnlinePayment(
                                catalogMeta.id,
                                nextVal
                              );
                              setCatalogMeta((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      onlinePaymentEnabled:
                                        res.onlinePaymentEnabled,
                                    }
                                  : prev
                              );
                            } catch (err) {
                              setMpFeedback({
                                type: 'error',
                                text: getSafeErrorMessage(
                                  err,
                                  'Não foi possível alterar essa opção.'
                                ),
                              });
                            } finally {
                              setMpLoading(false);
                            }
                          }}
                          className="h-4 w-4 accent-rose-600"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700">
                  Endereço para retirada (opcional)
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Ex: Rua das Flores, 120 — Centro, Feira de Santana"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Instruções / Horário de retirada (opcional)
                </label>
                <input
                  type="text"
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  placeholder="Ex: Seg a Sáb, 9h às 18h"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Previsão padrão de entrega (opcional)
                </label>
                <input
                  type="text"
                  value={deliveryEstimate}
                  onChange={(e) => setDeliveryEstimate(e.target.value)}
                  placeholder="Ex: 30 a 50 min ou A combinar"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-stone-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div>
                    <span className="block text-xs font-bold text-stone-800">
                      Receber e-mail a cada novo pedido
                    </span>
                    <span className="block text-[11px] text-stone-500">
                      Envia um alerta imediato para o e-mail da sua conta sempre que um cliente finalizar um pedido.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOrderByEmail}
                    onChange={(e) => setNotifyOrderByEmail(e.target.checked)}
                    className="h-4 w-4 accent-rose-600"
                  />
                </label>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {savedNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Alterações salvas com sucesso! Sua VitriMini já foi atualizada.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold shadow-lg transition disabled:opacity-60 ${activeTheme.primaryBg} ${activeTheme.primaryHover} ${activeTheme.buttonText} ${activeTheme.shadowColor}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Salvando alterações...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Salvar Alterações
              </>
            )}
          </button>
              </form>
            </div>

            {/* Prévia ao vivo Desktop (sticky) */}
            <aside className="hidden lg:col-span-5 lg:sticky lg:top-6 lg:block">
              <CatalogLivePreview
                storeName={deferredStoreName}
                logoUrl={displayedLogo}
                themeColor={themeColor}
                depositPct={depositPct}
                paymentNotice={deferredPaymentNotice}
                deliveryDates={deferredDeliveryDates}
                notes={deferredNotes}
                pickupAddress={deferredPickupAddress}
                deliveryEstimate={deferredDeliveryEstimate}
                products={previewProducts}
              />
            </aside>
          </div>
        )}
      </main>

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
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-4">
            <CatalogLivePreview
              storeName={deferredStoreName}
              logoUrl={displayedLogo}
              themeColor={themeColor}
              depositPct={depositPct}
              paymentNotice={deferredPaymentNotice}
              deliveryDates={deferredDeliveryDates}
              notes={deferredNotes}
              pickupAddress={deferredPickupAddress}
              deliveryEstimate={deferredDeliveryEstimate}
              products={previewProducts}
            />
          </div>
        </div>
      )}

      {shareModalOpen && catalogMeta?.slug && (
        <Suspense fallback={null}>
          <ShareCatalogModal
            storeName={storeName || 'Minha Vitrine'}
            slug={catalogMeta.slug}
            themeColor={themeColor}
            onClose={() => setShareModalOpen(false)}
          />
        </Suspense>
      )}

      {planModalOpen && catalogMeta && (
        <PlanSelectorModal
          storeName={storeName || 'Minha Vitrine'}
          initialPlan="PRO_90D"
          currentPlanType={catalogMeta.planType}
          hasActiveDays={Boolean(
            catalogMeta.expiresAt &&
              new Date(catalogMeta.expiresAt).getTime() > Date.now()
          )}
          loading={renewingTrial}
          onSelectPlan={async (plan) => {
            setRenewingTrial(true);
            try {
              const payment = await renewCatalog(catalogMeta.id, plan.code);
              setSelectedPlan(plan);
              setPlanModalOpen(false);
              setPaymentModalData(payment);
            } catch (err) {
              setError(
                getSafeErrorMessage(
                  err,
                  'Não foi possível gerar o Pix agora.'
                )
              );
            } finally {
              setRenewingTrial(false);
            }
          }}
          onClose={() => setPlanModalOpen(false)}
        />
      )}

      {paymentModalData && (
        <PixPaymentModal
          paymentData={paymentModalData}
          isRenewal={true}
          planName={selectedPlan?.name}
          planPriceLabel={selectedPlan?.priceLabel}
          planDays={selectedPlan?.days}
          onCancelDraft={() => setPaymentModalData(null)}
          onCloseAfterPaid={() => setPaymentModalData(null)}
          onConfirmed={(info) => {
            const isProSelected = selectedPlan?.code !== 'ESSENTIAL_90D';
            setCatalogMeta((prev) =>
              prev
                ? {
                    ...prev,
                    isTrial: false,
                    planType: isProSelected ? 'PRO' : 'ESSENTIAL',
                    hasProAccess: isProSelected || prev.hasProAccess,
                  }
                : prev
            );
            if (
              isProSelected &&
              !catalogMeta?.mpConnected &&
              !isMpInviteDismissed(info.catalogId)
            ) {
              setPaymentModalData(null);
              setMpInviteCatalogId(info.catalogId);
            }
          }}
        />
      )}

      {mpInviteCatalogId && (
        <ConnectMercadoPagoModal
          catalogId={mpInviteCatalogId}
          badgeText="Plano Pro ativado!"
          onClose={() => setMpInviteCatalogId(null)}
        />
      )}
    </div>
  );
}
